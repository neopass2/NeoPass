// Request blocking mechanism to prevent multiple simultaneous API requests

import { CONFIG } from '../config.js';

// Track shortcut execution state to prevent multiple requests when held down
const shortcutStates = {
    'customPaste': false,
    'batchSolve': false
};

let isRequestInProgress = false;
let requestTimeout = null;

function canMakeRequest() {
    return !isRequestInProgress;
}

function blockRequests() {
    isRequestInProgress = true;
    
    // Clear any existing timeout
    if (requestTimeout) {
        clearTimeout(requestTimeout);
    }
    
    // Set timeout to unblock after request timeout + 5 seconds buffer
    const safetyTimeout = (CONFIG.REQUEST_TIMEOUT || 15000) + 5000;
    requestTimeout = setTimeout(() => {
        isRequestInProgress = false;
        console.log(`[Request Block] Unblocked after ${safetyTimeout}ms timeout`);
    }, safetyTimeout);
}

function unblockRequests() {
    isRequestInProgress = false;
    
    // Clear the timeout since we got a response
    if (requestTimeout) {
        clearTimeout(requestTimeout);
        requestTimeout = null;
    }
    
    console.log('[Request Block] Unblocked after receiving response');
}

export { shortcutStates, canMakeRequest, blockRequests, unblockRequests };
