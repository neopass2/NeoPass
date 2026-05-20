// Storage change listeners (remote logout detection)

/**
 * Initialize storage change listeners for remote logout detection.
 * When refreshToken is removed or loggedIn is set to false from another context,
 * shows the logged-out state and clears remaining auth data.
 * @param {Function} showLoggedOutState - Function to show the logged-out UI
 * @param {Function} showError - Function to display error/info messages
 */
export function initStorageListeners(showLoggedOutState, showError) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
            // Check for remote logout (refreshToken removed) or local logout
            if ((changes.refreshToken && changes.refreshToken.newValue === undefined) ||
                (changes.loggedIn && changes.loggedIn.newValue === false)) {
                showLoggedOutState();
                showError('You have been logged out', 3000);

                // Clear any remaining auth data
                chrome.storage.local.remove(['accessToken', 'refreshToken', 'loggedIn', 'username']);
            }
        }
    });
}
