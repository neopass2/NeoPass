// Consolidated internal message router

import { CONFIG } from '../config.js';
import { getTokens, refreshAccessToken } from '../api/auth.js';
import { makeAuthenticatedRequest, copyToClipboardInTab, copyToClipboard } from '../api/request.js';
import { queryRequest, handleQueryResponseForIamNeoExamly } from '../api/queryRequest.js';
import { showToast } from '../ui/toasts.js';
import { showMCQToast } from '../ui/specializedToasts.js';
import { showStealthToast } from '../ui/toasts.js';
import { showSpinnerToast } from '../ui/specializedToasts.js';
import { toggleToastOpacity } from '../ui/toastOpacity.js';
import { showOpacityLevelToast } from '../ui/toasts.js';
import { handleMessage } from './externalMessages.js';
import { checkAndHandleSessionExpiration } from '../session/expiration.js';
import { handleSelectedTextAI } from '../features/ai/selectedText.js';

// Configuration for Examly Interception
const CONSUME_CREDITS_ON_INTERCEPT = false;
const cachedExamlyDataMap = new Map(); // tabId -> data

function registerInternalMessageListeners() {
    // Helper to check login status from storage
    const isLoggedIn = () => new Promise(resolve => {
        chrome.storage.local.get(["loggedIn"], function(result) { resolve(result.loggedIn === true); });
    });

    // Global guard: block certain feature actions if not logged in
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        try {
            const action = message && message.action;
            if (!action) return false;

            // Whitelist actions that must remain available without login
            const whitelist = new Set(['checkLoginStatus', 'showLoginPrompt', 'updateDismissed', 'sessionExpired']);
            if (whitelist.has(action)) return false;

            // For all other actions, enforce login
            isLoggedIn().then(loggedIn => {
                if (!loggedIn) {
                    // Prompt login UI and notify caller
                    try { chrome.runtime.sendMessage({ action: 'showLoginPrompt' }); } catch (e) {}
                    if (sendResponse) sendResponse({ success: false, error: 'Not logged in', requireLogin: true });
                }
            }).catch(() => {
                if (sendResponse) sendResponse({ success: false, error: 'Not logged in', requireLogin: true });
            });
            return true;
        } catch (e) { return false; }
    });

    // Main instruction-based message handler
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (!request || !request.instruction) return false;
        handleMessage(request, sender, sendResponse);
        return true;
    });

    // Login status & prompt
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "checkLoginStatus") {
            chrome.storage.local.get(["loggedIn"], function(result) { sendResponse({ loggedIn: result.loggedIn === true }); });
            return true;
        }
        if (message.action === "showLoginPrompt") {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs.length > 0) { showToast(tabs[0].id, 'Please log in to use this feature.', true); chrome.action.openPopup(); }
            });
            return true;
        }
        return false;
    });

    // Update dismissed
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "updateDismissed") {
            chrome.storage.local.set({ lastUpdateDismissed: message.timestamp, lastUpdateVersion: message.version });
            return true;
        }
        return false;
    });

    // MCQ credits check
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "getMcqCredits") {
            (async () => {
                try {
                    const { accessToken, refreshToken } = await getTokens();
                    if (!accessToken || !refreshToken) { sendResponse({ success: false, error: 'Not logged in', mcqCredits: 0 }); return; }
                    const API_URL = `${CONFIG.BACKEND_BASE_URL}${CONFIG.ENDPOINTS.ACCOUNT}`;
                    let response = await makeAuthenticatedRequest(API_URL, 'GET', accessToken);
                    if (!response.ok && (response.status === 401 || response.status === 403)) {
                        const newAccessToken = await refreshAccessToken(refreshToken);
                        if (newAccessToken === 'network_error') { sendResponse({ success: false, error: 'Network error', mcqCredits: 0 }); return; }
                        if (!newAccessToken) { sendResponse({ success: false, error: 'Session expired', mcqCredits: 0 }); return; }
                        response = await makeAuthenticatedRequest(API_URL, 'GET', newAccessToken);
                    }
                    if (!response.ok) { sendResponse({ success: false, error: 'Failed to get account info', mcqCredits: 0 }); return; }
                    const data = await response.json();
                    const mcqCredits = data.account?.mcqCredits !== undefined ? data.account.mcqCredits : 0;
                    sendResponse({ success: true, mcqCredits: mcqCredits });
                } catch (error) { sendResponse({ success: false, error: error.message, mcqCredits: 0 }); }
            })();
            return true;
        }
        return false;
    });

    // Cache Examly data from interceptor
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "cacheExamlyData") {
            (async () => {
                const loggedIn = await isLoggedIn();
                if (loggedIn) {
                    if (sender.tab) cachedExamlyDataMap.set(sender.tab.id, message.data);
                } else {
                    // Do not cache intercepted data if not logged in
                }
            })();
            return false;
        }
        return false;
    });

    // Extract data (MCQ/coding from iamneo/examly)
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'extractData') {
            (async () => {
                try {
                    // Require login to use extraction/auto-answer features
                    const loggedIn = await isLoggedIn();
                    if (!loggedIn) {
                        chrome.runtime.sendMessage({ action: 'showLoginPrompt' });
                        sendResponse({ success: false, error: 'Not logged in', requireLogin: true });
                        return;
                    }
                    // --- EXAMLY INTERCEPTION CHECK ---
                    const cachedData = cachedExamlyDataMap.get(sender.tab.id);
                    if (cachedData && cachedData.ready) {
                        let interceptedResponse = null;

                        if (request.questionIndex !== undefined && request.questionIndex !== null) {
                            if (request.isCoding) {
                                if (cachedData.coding[request.questionIndex]) {
                                    interceptedResponse = cachedData.coding[request.questionIndex].solution;
                                }
                            } else {
                                if (cachedData.mcqs[request.questionIndex]) {
                                    const match = cachedData.mcqs[request.questionIndex];
                                    interceptedResponse = {
                                        answer: `Option ${match.answerIndex + 1}`,
                                        index: match.answerIndex,
                                        text: match.text
                                    };
                                }
                            }
                        }

                        // Fallback to text matching if index lookup failed or wasn't provided
                        if (!interceptedResponse) {
                            if (request.isCoding) {
                                const match = cachedData.coding.find(c => 
                                    request.question.includes(c.questionText) || 
                                    (c.questionText && c.questionText.includes(request.question))
                                );
                                if (match) interceptedResponse = match.solution;
                            } else {
                                const match = cachedData.mcqs.find(m => 
                                    (m.questionText && request.question.includes(m.questionText)) || 
                                    (m.questionText && m.questionText.includes(request.question)) ||
                                    (request.options && request.options.includes(m.text))
                                );
                                if (match) {
                                    interceptedResponse = {
                                        answer: `Option ${match.answerIndex + 1}`,
                                        index: match.answerIndex,
                                        text: match.text
                                    };
                                }
                            }
                        }

                        if (interceptedResponse) {
                            // Check if we should still consume credits
                            if (CONSUME_CREDITS_ON_INTERCEPT) {
                                console.log('[NeoPass] Service request initiated.');
                            } else {
                                const finalResponse = typeof interceptedResponse === 'string' ? interceptedResponse : interceptedResponse.answer;
                                handleQueryResponseForIamNeoExamly(finalResponse, sender.tab.id, request.isMCQ, request.isHackerRank, request.isMultipleChoice, request.isTyped, true);
                                sendResponse({ success: true, response: finalResponse, status: 'success', isIntercepted: true });
                                return;
                            }
                        }
                    }
                    // --- END INTERCEPTION CHECK ---

                    let queryText;
                    if (request.isCoding) {
                        if (request.isHackerRank) {
                            queryText = `You are solving a HackerRank coding problem. Provide ONLY the complete solution code that can be directly run.\n\nIMPORTANT REQUIREMENTS:\n- Provide ONLY the solution code, no explanations or comments\n- The code must be complete and ready to run\n- Include all necessary imports and function definitions\n- Handle input/output exactly as specified\n- Ensure the solution passes all test cases\n\n${request.question}\n\nRespond with ONLY the ${request.programmingLanguage} code:`;
                        } else {
                            queryText = `Instructions: You are tasked with solving a programming problem. Respond strictly with the solution code in the required programming language. \n                            Ensure the code: Meets the requirements outlined in the problem statement.\n                            Stricly Passes all test cases, including edge cases and boundary conditions.\n                            Always get the input from the users.` +
                                `Question:\n${request.question}\n\n` +
                                (request.programmingLanguage ? `Solve Striclty Using This Programing Language:\n${request.programmingLanguage}` : '') +
                                (request.inputFormat ? `Input Format:\n${request.inputFormat}\n\n` : '') +
                                (request.outputFormat ? `Output Format:\n${request.outputFormat}\n\n` : '') +
                                (request.testCases ? `Test Cases:\n${request.testCases}` : '');
                        }
                    } else {
                        queryText = request.code ?
                            `${request.question.trim()}\nCode:\n${request.code.trim()}\nOptions:\n${request.options.trim()}` :
                            `${request.question.trim()}\nOptions:\n${request.options.trim()}`;
                    }
                    const requestType = request.isCoding ? 'coding' : (request.isMCQ ? 'mcq' : 'general');
                    const response = await queryRequest(queryText, request.isMCQ, request.isMultipleChoice, sender.tab.id, requestType, 1);
                    if (response && typeof response === 'string') {
                        handleQueryResponseForIamNeoExamly(response, sender.tab.id, request.isMCQ, request.isHackerRank, request.isMultipleChoice, request.isTyped);
                        sendResponse({ success: true, response, status: 'success' });
                    } else if (response && response.error) {
                        handleQueryResponseForIamNeoExamly(response, sender.tab.id, request.isMCQ, request.isHackerRank, request.isMultipleChoice, request.isTyped);
                        if (response.errorType === 'server' || response.errorType === 'network') {
                            try { await copyToClipboardInTab(queryText, sender.tab.id); showToast(sender.tab.id, 'AI service unavailable. Prompt copied to clipboard.', true, 'Paste the copied prompt into another AI tool and answer manually.'); }
                            catch (clipboardError) { showToast(sender.tab.id, 'AI service unavailable. Please try again later.', true, response.detailedInfo || 'The AI backend is currently returning errors.'); }
                        }
                        sendResponse({ error: response.error, status: 'error', errorType: response.errorType });
                    } else {
                        handleQueryResponseForIamNeoExamly(null, sender.tab.id, request.isMCQ, request.isHackerRank, request.isMultipleChoice, request.isTyped);
                        sendResponse({ error: 'No response from query service', status: 'error', errorType: 'general' });
                    }
                } catch (error) {
                    showToast(sender.tab.id, 'An unexpected error occurred. Please try again.', true);
                    sendResponse({ error: error.message, status: 'error', details: error.toString() });
                }
            })();
            return true;
        }
        return false;
    });

    // Toast actions
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'toggleToastOpacity') {
            toggleToastOpacity().then(newLevel => {
                if (sender.tab && sender.tab.id) {
                    showOpacityLevelToast(sender.tab.id, `Toast opacity set to: ${newLevel}`);
                }
                sendResponse({ success: true, level: newLevel });
            }).catch(error => { 
                console.error('Toggle opacity error:', error);
                sendResponse({ success: false, error: error.toString() }); 
            });
            return true;
        }
        if (message.action === 'getInterceptedData') {
            const cachedData = cachedExamlyDataMap.get(sender.tab.id);
            if (cachedData && cachedData.ready) {
                sendResponse({ success: true, data: cachedData });
            } else {
                sendResponse({ success: false });
            }
            return true;
        }
        if (message.action === 'showToast') {
            const toastMessage = typeof message.message === 'string' ? message.message : JSON.stringify(message.message, null, 2);
            showToast(sender.tab.id, toastMessage, message.isError);
            return true;
        }
        if (message.action === 'showStealthToast') {
            const toastMessage = typeof message.message === 'string' ? message.message : JSON.stringify(message.message, null, 2);
            showStealthToast(sender.tab.id, toastMessage, message.stealthEnabled);
            return true;
        }
        if (message.action === 'showMCQToast') {
            const toastMessage = typeof message.message === 'string' ? message.message : JSON.stringify(message.message, null, 2);
            showMCQToast(sender.tab.id, toastMessage);
            return true;
        }
        if (message.action === 'showSpinnerToast') {
            const toastMessage = typeof message.message === 'string' ? message.message : 'Processing your request...';
            showSpinnerToast(sender.tab.id, toastMessage);
            return true;
        }
        if (message.action === "openNewTab") {
            // openNewMinimizedWindowWithUrl is referenced but undefined in original — keep as no-op
            console.log('openNewTab requested:', message.url);
            return true;
        }
        if (message.action === 'solveSelectedText') {
            handleSelectedTextAI(message.text, sender.tab.id);
            return true;
        }
        return false;
    });

    // Misc: pageReloaded, windowFocus, currentKey
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "pageReloaded" || message.action === "windowFocus") return false;
        return false;
    });

    // Reset context
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'resetContext') {
            console.log('Chat context reset requested from tab:', sender.tab?.id);
            if (sendResponse) sendResponse({ success: true, message: 'Context reset' });
            return true;
        }
        return false;
    });

    // Session expired from content script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'sessionExpired') {
            showToast(sender.tab.id, 'Your session has expired after 24 hours. Please log in again.', true);
            sendResponse({ success: true });
            return true;
        }
        return false;
    });

    // Session check on every message
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action) checkAndHandleSessionExpiration();
        return false;
    });
}

// Clear cache when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
    cachedExamlyDataMap.delete(tabId);
});

export { registerInternalMessageListeners };
