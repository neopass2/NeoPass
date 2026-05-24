// Batch solve feature

import { CONFIG } from '../config.js';
import { getTokens, refreshAccessToken } from '../api/auth.js';
import { makeAuthenticatedRequest } from '../api/request.js';
import { canMakeRequest, blockRequests, unblockRequests } from '../state/requestGate.js';

function registerBatchSolveListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "batchSolve") {
            if (!canMakeRequest()) {
                console.log('[Batch Solve Worker] Blocked - another request is in progress');
                sendResponse({ success: false, error: 'Please wait for your previous request to complete.' });
                return true;
            }
            
            blockRequests();
            
            (async () => {
                try {
                    const questions = message.questions;
                    console.log(`[Batch Solve Worker] Received ${questions.length} questions`);
                    const { accessToken, refreshToken } = await getTokens();
                    if (!accessToken || !refreshToken) throw new Error('Please login to use batch solve. Click the extension icon to login.');
                    const questionsText = questions.map(q => {
                        let questionStr = `Question ${q.id}:\n${q.text}`;
                        if (q.code) questionStr += `\nCode:\n${q.code}`;
                        questionStr += `\nOptions:\n${q.options.map((opt, idx) => `${idx + 1}. ${opt}`).join('\n')}`;
                        return questionStr;
                    }).join('\n\n---\n\n');
                    const systemInstruction = "You are an exam solver. Solve these MCQs. Return ONLY a JSON array of objects: [{\"id\": 1, \"answer\": \"exact_text_of_option\"}]. Do not include any explanation or markdown formatting.";
                    const prompt = `${systemInstruction}\n\n${questionsText}`;
                    const API_URL = `${CONFIG.BACKEND_BASE_URL}${CONFIG.ENDPOINTS.MCQ_TEXT}`;
                    const questionCount = questions.length;
                    const batchTimeout = CONFIG.BATCH_SOLVE_TIMEOUT || 120000;
                    let response = await makeAuthenticatedRequest(API_URL, 'POST', accessToken, { prompt, questionCount, triggerSource: 'alt-shift-q', platform: 'examly' }, batchTimeout);
                    if (!response.ok && (response.status === 401 || response.status === 403)) {
                        const newAccessToken = await refreshAccessToken(refreshToken);
                        if (newAccessToken === 'network_error') throw new Error('Network error. Please check your connection and try again.');
                        if (!newAccessToken) { chrome.storage.local.remove(['accessToken', 'refreshToken', 'loggedIn']); throw new Error('Session expired. Please log in again.'); }
                        response = await makeAuthenticatedRequest(API_URL, 'POST', newAccessToken, { prompt, questionCount, triggerSource: 'alt-shift-q', platform: 'examly' }, batchTimeout);
                    }
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        if (response.status === 429) throw new Error(errorData.error || 'Rate limit exceeded. Please wait before trying again.');
                        throw new Error(errorData.message || `API request failed: ${response.status}`);
                    }
                    const data = await response.json();
                    const responseText = data.text;
                    if (data.tokenRefreshed && data.accessToken) { await chrome.storage.local.set({ accessToken: data.accessToken }); }
                    if (!responseText) throw new Error('No response from AI');
                    let answers;
                    try {
                        let cleanedResponse = responseText.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
                        answers = JSON.parse(cleanedResponse);
                        if (!Array.isArray(answers)) throw new Error('Response is not an array');
                    } catch (parseError) { throw new Error('Failed to parse AI response as JSON: ' + parseError.message); }
                    if (data.mcqCreditsRemaining !== undefined) { await chrome.storage.local.set({ mcqCreditsRemaining: data.mcqCreditsRemaining }); }
                    sendResponse({ success: true, answers: answers, mcqCreditsRemaining: data.mcqCreditsRemaining });
                } catch (error) {
                    console.error('[Batch Solve Worker] Error:', error);
                    sendResponse({ success: false, error: error.message || 'Unknown error occurred' });
                } finally {
                    unblockRequests();
                }
            })();
            return true;
        }
        return false;
    });
}

export { registerBatchSolveListener };
