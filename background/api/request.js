// HTTP request helpers and clipboard utilities

import { CONFIG } from '../config.js';

// Helper function to make authenticated request with timeout support
async function makeAuthenticatedRequest(url, method, token, body = null, timeout = CONFIG.REQUEST_TIMEOUT) {
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    const options = {
        method,
        headers,
        ...(body && {
            body: JSON.stringify(body)
        })
    };

    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timed out. The server is taking too long to respond.');
        }
        throw error;
    }
}

// Copy to clipboard using scripting API (with tabId parameter)
async function copyToClipboardInTab(text, tabId) {
    try {
        // Use modern Clipboard API with fallback
        await chrome.scripting.executeScript({
            target: {
                tabId: tabId
            },
            func: async (content) => {
                try {
                    await navigator.clipboard.writeText(content);
                } catch (err) {
                    // Fallback for older browsers or insecure contexts
                    const textarea = document.createElement('textarea');
                    textarea.textContent = content;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                }
            },
            args: [text]
        });
        return true;
    } catch (err) {
        console.error('Failed to copy text:', err);
        return false;
    }
}

// Copy to clipboard using active tab (no tabId parameter)
function copyToClipboard(text) {
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function(tabs) {
        if (tabs[0]) {
            chrome.scripting.executeScript({
                target: {
                    tabId: tabs[0].id
                },
                func: async function(content) {
                    try {
                        await navigator.clipboard.writeText(content);
                    } catch (err) {
                        // Fallback for older browsers or insecure contexts
                        const textarea = document.createElement('textarea');
                        textarea.textContent = content;
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textarea);
                    }
                },
                args: [text]
            });
        }
    });
}

// Check stealth mode status from storage
async function checkStealthMode() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['stealth'], (result) => {
            resolve(result.stealth === true);
        });
    });
}

export { makeAuthenticatedRequest, copyToClipboardInTab, copyToClipboard, checkStealthMode };
