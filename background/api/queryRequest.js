// AI query request orchestration with comprehensive error handling

import { CONFIG } from '../config.js';
import { canMakeRequest, blockRequests, unblockRequests } from '../state/requestGate.js';
import { getTokens, refreshAccessToken } from './auth.js';
import { makeAuthenticatedRequest, copyToClipboard } from './request.js';
import { showToast } from '../ui/toasts.js';
import { showMCQToast } from '../ui/specializedToasts.js';

// Enhanced queryRequest function with comprehensive error handling
// Returns either:
// - String: successful response text
// - Object: { error: string, errorType: string, detailedInfo: string }
// requestType: 'mcq', 'coding', or 'general' (default)
async function queryRequest(text, isMCQ = false, isMultipleChoice = false, tabId = null, requestType = 'general', questionCount = 1, retryCount = 0, _neopassMeta = null) {
    // Check if a request is already in progress
    if (!canMakeRequest()) {
        console.log('[Request Block] Request blocked - another request is in progress');
        return { 
            error: 'Please wait for your previous request to complete.', 
            errorType: 'rateLimit',
            detailedInfo: 'Multiple simultaneous requests are not allowed. Please wait a moment before trying again.'
        };
    }
    
    // Block new requests
    blockRequests();
    
    try {
        // Check if user is logged in (REQUIRED for all AI requests)
        const {
            accessToken,
            refreshToken
        } = await getTokens();

        // Login is mandatory - no custom API fallback
        if (!accessToken || !refreshToken) {
            unblockRequests();
            
            // Show toast notification if tabId is available
            if (tabId) {
                showToast(tabId, 'Please login to use AI features', true, 'Login is required to use this extension. Click the extension icon to login.');
            }
            
            // Open popup to Account tab after a short delay
            setTimeout(() => {
                try {
                    chrome.action.openPopup();
                } catch (e) {
                    console.log('Could not open popup automatically:', e.message);
                }
            }, 1000);
            
            return { 
                error: 'Please login to use AI features.', 
                errorType: 'auth',
                detailedInfo: 'Login is required to use this extension. Please click the extension icon and login with your account.'
            };
        }

        // Select endpoint based on request type
        let endpoint = CONFIG.ENDPOINTS.MCQ_TEXT; // default to MCQ endpoint
        if (requestType === 'mcq' || isMCQ) {
            endpoint = CONFIG.ENDPOINTS.MCQ_TEXT;
        } else if (requestType === 'coding') {
            endpoint = CONFIG.ENDPOINTS.CODING_TEXT;
        }

        const API_URL = `${CONFIG.BACKEND_BASE_URL}${endpoint}`;
        const body = {
            prompt: text,
            questionCount: questionCount, // For MCQ, this is the number of questions; for coding, it's always 1
            // Classification metadata (optional, for analytics)
            triggerSource: _neopassMeta?.trigger || null,
            platform: _neopassMeta?.platform || null
        };

        if (isMCQ) {
            if (isMultipleChoice) {
                // Multiple choice question - can select multiple options
                body.prompt += "\nIMPORTANT: This is a MULTIPLE CHOICE question where MULTIPLE options can be correct. Analyze the question carefully and provide ALL correct options.\n\nFormat your response EXACTLY like this:\n- If options are A, B, C and A and C are correct: 'A. [text of option A], C. [text of option C]'\n- If options are 1, 2, 3 and 1 and 3 are correct: '1. [text of option 1], 3. [text of option 3]'\n- If only one option is correct, provide just that one: 'B. [text of option B]'\n\nDO NOT include explanations, reasoning, or anything else. ONLY the correct option(s) in the exact format shown above, separated by commas if multiple.\nIf this is not an MCQ question, simply respond with 'Not an MCQ'";
            } else {
                // Single choice question - only one option can be selected
                body.prompt += "\nIMPORTANT: This is a SINGLE CHOICE question where ONLY ONE option is correct. Analyze the question carefully and provide the single correct option.\n\nFormat your response EXACTLY like this:\n- If options are A, B, C: 'A. [text of option A]' or 'C. [text of option C]'\n- If options are 1, 2, 3: '1. [text of option 1]' or '3. [text of option 3]'\n\nDO NOT include explanations, reasoning, or anything else. ONLY the single correct answer in the exact format shown above.\nIf this is not an MCQ question, simply respond with 'Not an MCQ'";
            }
        }
        console.log('[queryRequest] Sending request to API', API_URL, 'with body:', body, 'requestType:', requestType, 'questionCount:', questionCount);
        try {
            let response = await makeAuthenticatedRequest(API_URL, 'POST', accessToken, body);

            if (!response.ok && (response.status === 401 || response.status === 403)) {
                console.log('[queryRequest] Token expired/invalid, attempting refresh...');
                const newAccessToken = await refreshAccessToken(refreshToken);

                if (newAccessToken === 'network_error') {
                    // Network error during refresh - don't logout, just show error
                    return { error: 'Network error. Please check your connection and try again.', errorType: 'network' };
                }

                if (!newAccessToken) {
                    // Refresh token is truly invalid - logout required
                    chrome.storage.local.remove(['accessToken', 'refreshToken', 'loggedIn']);
                    return { error: 'Session expired. Please log in again.', errorType: 'auth' };
                }

                console.log('[queryRequest] Token refreshed, retrying request...');
                response = await makeAuthenticatedRequest(API_URL, 'POST', newAccessToken, body);
            }

            if (!response.ok) {
                if (response.status >= 500 && retryCount < 2) {
                    const delayMs = 1000 * (retryCount + 1);
                    console.log(`[queryRequest] Server error ${response.status}, retrying in ${delayMs}ms (${retryCount + 1}/2)...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    return queryRequest(text, isMCQ, isMultipleChoice, tabId, requestType, questionCount, retryCount + 1, _neopassMeta);
                }

                let errorMessage = 'An unexpected error occurred. Please try again.';
                let errorType = 'general';
                let detailedInfo = `Server responded with status ${response.status}`;
                
                try {
                    const errorData = await response.json();
                console.error("Error querying:", errorData);
                
                // Handle specific error types based on status code and response
                if (response.status === 429) {
                    errorType = 'rateLimit';
                    if (errorData.error && errorData.error.includes('Token limit exceeded')) {
                        errorMessage = 'Token limit exceeded. Please upgrade or wait for your limit to reset.';
                        if (errorData.details) {
                            detailedInfo = `You have used ${errorData.details.used} out of ${errorData.details.limit} tokens. ${errorData.details.remaining} tokens remaining.`;
                        } else {
                            detailedInfo = 'You have reached your token limit for this billing period.';
                        }
                    } else if (errorData.message && errorData.message.includes('Daily request limit exceeded')) {
                        errorMessage = 'Daily request limit exceeded. Please try again tomorrow.';
                        detailedInfo = `You have reached your daily request limit. ${errorData.nextReset ? `Limit resets at ${new Date(errorData.nextReset).toLocaleString()}` : 'Limit resets daily at midnight UTC.'}`;
                    } else if (errorData.message && errorData.message.includes('wait for your previous request')) {
                        errorMessage = 'Please wait for your previous request to complete.';
                        detailedInfo = 'Multiple simultaneous requests are not allowed. Please wait a moment before trying again.';
                    } else {
                        errorMessage = 'Too many requests. Please wait before trying again.';
                        detailedInfo = 'Rate limit exceeded. Please wait a few moments before making another request.';
                    }
                } else if (response.status === 403) {
                    errorType = 'forbidden';
                    
                    // Check if this is a quota/account issue
                    if (errorData.message && errorData.message.includes('star')) {
                        errorMessage = 'Please star the repository to use this service.';
                        detailedInfo = 'This service requires starring the GitHub repository. Please star it and try again.';
                    } else {
                        errorMessage = 'Access denied. Please check your account status.';
                        detailedInfo = 'Your request was denied. This may be due to account restrictions or service limitations.';
                    }
                } else if (response.status >= 500) {
                    errorType = 'server';
                    if ([502, 503, 504].includes(response.status)) {
                        errorMessage = 'AI service is temporarily unavailable. Please try again shortly.';
                        detailedInfo = `Upstream error (${response.status}) from ${API_URL}. This is usually temporary.`;
                    } else {
                        errorMessage = 'Service temporarily unavailable. Please try again in a moment.';
                        detailedInfo = `The server encountered an internal error (${response.status}) at ${API_URL}. This is usually temporary.`;
                    }
                } else if (response.status === 400) {
                    errorType = 'client';
                    errorMessage = 'Invalid request. Please try rephrasing your question.';
                    detailedInfo = 'The request format was invalid. Try shortening your text or rephrasing your question.';
                } else {
                    errorMessage = errorData.message || `Server error (${response.status})`;
                    detailedInfo = errorData.error || `HTTP ${response.status}: ${errorMessage}`;
                }
                } catch (parseError) {
                    console.error("Error parsing error response:", parseError);
                    detailedInfo = `HTTP ${response.status}: Unable to parse error details`;
                }
                
                return { error: errorMessage, errorType, detailedInfo };
            }

            const responseData = await response.json();
            
            // Check if token was auto-refreshed by the server
            if (responseData.tokenRefreshed && responseData.accessToken) {
                await chrome.storage.local.set({ accessToken: responseData.accessToken });
                console.log('✅ Access token auto-refreshed by server');
            }
            
            // Update MCQ or Coding credits in storage for popup to reflect
            if (responseData.mcqCreditsRemaining !== undefined) {
                await chrome.storage.local.set({ mcqCreditsRemaining: responseData.mcqCreditsRemaining });
                console.log(`[queryRequest] MCQ credits remaining: ${responseData.mcqCreditsRemaining}`);
            }
            if (responseData.codingCreditsRemaining !== undefined) {
                await chrome.storage.local.set({ codingCreditsRemaining: responseData.codingCreditsRemaining });
                console.log(`[queryRequest] Coding credits remaining: ${responseData.codingCreditsRemaining}`);
            }
            
            return responseData.text;
        } catch (error) {
            console.error("Error querying:", error);
            let errorMessage = 'Network error. Please check your connection and try again.';
            let errorType = 'network';
            let detailedInfo = 'Failed to connect to the service. This could be due to network issues or service downtime.';
            
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorMessage = 'Unable to connect to the service. Please try again.';
                detailedInfo = 'Network connection failed. Please check your internet connection and try again.';
            } else if (error.message.includes('timeout')) {
                errorMessage = 'Request timed out. Please try again.';
                detailedInfo = 'The request took too long to complete. This may be due to high server load.';
            } else {
                detailedInfo = error.message || 'An unexpected error occurred during the request.';
            }
            
            return { error: errorMessage, errorType, detailedInfo };
        }
    } catch (error) {
        console.error("Error in queryRequest:", error);
        return { 
            error: 'An unexpected error occurred.', 
            errorType: 'general',
            detailedInfo: error.message || 'Failed to process the request.'
        };
    } finally {
        // Ensure we always unblock requests even if something unexpected happens
        unblockRequests();
    }
}

function handleQueryResponse(response, tabId, isMCQ = false) {
    if (response && typeof response === 'string') {
        // Success case - response is the actual text
        if (isMCQ) {
            showMCQToast(tabId, response);
        } else {
            copyToClipboard(response);
            showToast(tabId, 'Copied to Clipboard!');
        }
    } else if (response && response.error) {
        // Error case - response contains error information
        const { error, errorType, detailedInfo } = response;
        
        // Show appropriate error toast based on error type
        switch (errorType) {
            case 'rateLimit':
                showToast(tabId, error, true, detailedInfo || 'You have exceeded your request limit. Please wait before trying again.');
                break;
            case 'auth':
                showToast(tabId, error, true, detailedInfo || 'Please log in or refresh your session to continue using the service.');
                break;
            case 'forbidden':
                showToast(tabId, error, true, detailedInfo || 'Access to this feature is restricted. Please check your account status.');
                break;
            case 'server':
                showToast(tabId, error, true, detailedInfo || 'The service is experiencing issues. Please try again in a few moments.');
                break;
            case 'network':
                showToast(tabId, error, true, detailedInfo || 'Please check your internet connection and try again.');
                break;
            case 'client':
                showToast(tabId, error, true, detailedInfo || 'There was an issue with your request. Try rephrasing or shortening your text.');
                break;
            default:
                showToast(tabId, error, true, detailedInfo || 'An unexpected error occurred. Please try again after 30 seconds.');
        }
    } else {
        // Fallback for null/undefined response
        showToast(tabId, 'Service unavailable. Please try again after 30s.', true, 'The service did not respond. This may be due to high server load or maintenance.');
    }
}

function handleQueryResponseForIamNeoExamly(response, tabId, isMCQ = false, isHackerRank = false, isMultipleChoice = false, isTyped = false, isIntercepted = false) {
    if (response && typeof response === 'string') {
        // Success case - response is the actual text
        if (isMCQ) {
            chrome.tabs.sendMessage(tabId, {
                action: 'clickMCQOption',
                response: response,
                isHackerRank: isHackerRank,
                isMultipleChoice: isMultipleChoice,
                isIntercepted: isIntercepted
            });
        } else {
            // Clean code block markers before injecting
            const cleanedCode = response.trim()
                .replace(/^```[a-zA-Z0-9]*\s*\n?/, '')
                .replace(/\n?```\s*$/, '');

            // Copy to clipboard as fallback
            copyToClipboard(cleanedCode);

            if (isTyped) {
                // Typed mode: Injection is handled via custom events in content.js and exam.js.
                // We do not inject anything from the service worker to prevent duplicate inputs.
                console.log('[NeoPass] Service worker: Typed mode response generated, passing back to content script.');
            } else {
                // Instant mode: inject directly into Ace editor
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: function(code) {
                        // Target answer editor specifically
                        var answerEl = document.querySelector('[aria-labelledby="editor-answer"]');
                        if (answerEl) {
                            try {
                                var ed = ace.edit(answerEl);
                                ed.setValue(code);
                                ed.clearSelection();
                                ed.navigateFileEnd();
                            } catch(e) {}
                        } else {
                            // Fallback for all visible editors
                            var editors = document.querySelectorAll('.ace_editor');
                            editors.forEach(function(el) {
                                try {
                                    var ed = ace.edit(el);
                                    if (!ed.getReadOnly()) {
                                        ed.setValue(code);
                                        ed.clearSelection();
                                        ed.navigateFileEnd();
                                    }
                                } catch(e) {}
                            });
                        }
                    },
                    args: [cleanedCode],
                    world: 'MAIN'
                }).catch(err => console.error('Instant injection failed:', err));
            }
        }
    } else if (response && response.error) {
        // Error case
        const { error, errorType, detailedInfo } = response;
        showToast(tabId, error, true, detailedInfo || 'An error occurred during the request.');
    } else {
        showToast(tabId, 'Service unavailable. Please try again later.', true);
    }
}

export { queryRequest, handleQueryResponse, handleQueryResponseForIamNeoExamly };
