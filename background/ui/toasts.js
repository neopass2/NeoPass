// All toast rendering functions routed via messaging

import { formatToastContent } from '../utils/formatting.js';
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

// Function to remove any existing toast
function removeExistingToast(tabId) {
    safeSendToTab(tabId, {
        action: 'RENDER_TOAST',
        toastType: 'removeExisting'
    });
}

// Show a toast with the current opacity level (for opacity toggle feedback)
async function showOpacityLevelToast(tabId, message) {
    const opacityValue = await getToastOpacity();
    safeSendToTab(tabId, {
        action: 'RENDER_TOAST',
        toastType: 'opacityLevel',
        payload: {
            message: message,
            opacity: opacityValue
        }
    });
}

// Main showToast function
async function showToast(tabId, message, isError = false, detailedInfo = '') {
    const normalizedMessage = formatToastContent(message);
    const opacity = await getToastOpacity();
    if (!detailedInfo) {
        if (isError) {
            detailedInfo = 'Possible causes:\n• Network connection issues\n• Server timeout\n• Authorization issues\n• Extension needs to be updated';
        } else {
            detailedInfo = 'Operation completed successfully.';
        }
    }
    safeSendToTab(tabId, {
        action: 'RENDER_TOAST',
        toastType: 'standard',
        payload: {
            message: normalizedMessage,
            isError: isError,
            opacity: opacity,
            detailedInfo: detailedInfo
        }
    });
}

// Show stealth mode toast notification
async function showStealthToast(tabId, message, stealthEnabled) {
    const opacity = await getToastOpacity();
    safeSendToTab(tabId, {
        action: 'RENDER_TOAST',
        toastType: 'stealth',
        payload: {
            message: message,
            stealthEnabled: stealthEnabled,
            opacity: opacity
        }
    });
    chrome.storage.local.set({ stealth: stealthEnabled });
}

export {
    removeExistingToast,
    showOpacityLevelToast,
    showToast,
    showStealthToast
};

