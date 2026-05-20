// Session expiration logic

/**
 * Check if a session is expired based on the login timestamp.
 * @param {number} loginTimestamp - The timestamp (ms) when the user logged in
 * @returns {boolean} True if the session has expired
 */
export function isSessionExpired(loginTimestamp) {
    if (!loginTimestamp) return false;
    const currentTime = Date.now();
    return currentTime - loginTimestamp > CONFIG.SESSION_DURATION;
}

/**
 * Check session expiration from storage and trigger logout if expired.
 * @param {Function} logoutUser - The logout function to call if session is expired
 * @param {Function} showError - The error display function
 */
export function checkSessionExpiration(logoutUser, showError) {
    chrome.storage.local.get(['loginTimestamp'], function(data) {
        if (data.loginTimestamp) {
            if (isSessionExpired(data.loginTimestamp)) {
                logoutUser();
                showError('Your session has expired. Please log in again.', 5000);
            }
        }
    });
}
