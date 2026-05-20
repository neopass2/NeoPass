// Specialized toast renderers: MCQ, NPTEL, Update, Spinner routed via messaging

import { getToastOpacity } from './toastOpacity.js';

function safeSendToTab(tabId, payload) {
    try {
        chrome.tabs.sendMessage(tabId, payload, () => {
            if (chrome.runtime.lastError) {
                // No receiver on this tab or tab is not ready; ignore.
            }
        });
    } catch (error) {
        // Ignore send failures (restricted tabs, closed tabs, etc.).
    }
}

// showMCQToast
async function showMCQToast(tabId, message, detailedInfo = '') {
    const opacity = await getToastOpacity();
    if (!detailedInfo) {
        detailedInfo = 'This is the answer to the MCQ question based on analysis of the question content. If you received an incorrect answer, please try rephrasing your question or providing more context.';
    }
    safeSendToTab(tabId, {
        action: 'RENDER_TOAST',
        toastType: 'mcq',
        payload: {
            message: message,
            opacity: opacity,
            detailedInfo: detailedInfo
        }
    });
}

// showNPTELToast
async function showNPTELToast(tabId, message, isError = false, detailedInfo = '') {
    const opacity = await getToastOpacity();
    if (!detailedInfo) {
        detailedInfo = isError
            ? 'Possible issues with NPTEL search:\n• The question may not be in our database\n• Try selecting only the exact question text\n• The question might be newly added to NPTEL'
            : 'This answer was found by matching your question with the NPTEL question database. The confidence level depends on how closely your selected text matches a known question.';
    }
    safeSendToTab(tabId, {
        action: 'RENDER_TOAST',
        toastType: 'nptel',
        payload: {
            message: message,
            isError: isError,
            opacity: opacity,
            detailedInfo: detailedInfo
        }
    });
}

// showUpdateToast
function showUpdateToast(tabId, message, latestVersion) {
    chrome.tabs.get(tabId, async (tab) => {
        if (chrome.runtime.lastError) { console.error(chrome.runtime.lastError.message); return; }
        if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:') || tab.url.startsWith('edge://') || tab.url.startsWith('brave://')) {
            console.log('Cannot inject script into this tab type'); return;
        }
        try {
            safeSendToTab(tabId, {
                action: 'RENDER_TOAST',
                toastType: 'update',
                payload: {
                    message: message,
                    latestVersion: latestVersion
                }
            });
        } catch (error) {
            console.error('Error in showUpdateToast:', error);
        }
    });
}

// showSpinnerToast
async function showSpinnerToast(tabId, message = 'Processing your request...') {
    const opacity = await getToastOpacity();
    safeSendToTab(tabId, {
        action: 'RENDER_TOAST',
        toastType: 'spinner',
        payload: {
            message: message,
            opacity: opacity
        }
    });
}

export { showMCQToast, showNPTELToast, showUpdateToast, showSpinnerToast };
