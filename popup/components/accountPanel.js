// Account panel — logged-in/out state toggling, account info, logout

import { displayAccountInfo } from './creditsBadge.js';
import { showError, showInfo } from './errorBanner.js';
import { updateShortcutsForPlatform } from './shortcuts.js';
import { showEmailPromptIfMissing } from './emailPrompt.js';

const API_BASE_URL = CONFIG.BACKEND_BASE_URL;

/**
 * Refresh all open tabs. Called after logout to ensure content scripts
 * respond to the changed auth state.
 */
function refreshAllTabs() {
    chrome.tabs.query({}, function(tabs) {
        for (let tab of tabs) {
            chrome.tabs.reload(tab.id);
        }
    });
}

/**
 * Show the logged-in state: hide login form, show account section.
 * If accountData is provided, display it immediately; otherwise fetch from API.
 * @param {string} username - The logged-in username
 * @param {Object} [accountData] - Optional pre-fetched account data
 */
export function showLoggedInState(username, accountData) {
    // Update the Account tab to show account information
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('accountSection').classList.remove('hidden');

    // If account data is provided, display it immediately
    if (accountData) {
        displayAccountInfo(accountData);
    } else {
        // Set loading state and fetch account information
        document.getElementById('accountUsername').textContent = 'Loading...';
        const mcqCreditsEl = document.getElementById('accountMcqCredits');
        const codingCreditsEl = document.getElementById('accountCodingCredits');
        if (mcqCreditsEl) mcqCreditsEl.textContent = 'Loading...';
        if (codingCreditsEl) codingCreditsEl.textContent = 'Loading...';
        fetchAccountInfo();
    }

    // Update shortcuts based on platform
    updateShortcutsForPlatform();
}

/**
 * Show the logged-out state: show login form, hide account section.
 */
export function showLoggedOutState() {
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('accountSection').classList.add('hidden');
}

/**
 * Fetch account information from the backend API.
 * Handles token refresh if the access token is expired.
 */
export async function fetchAccountInfo() {
    try {
        const { accessToken, refreshToken } = await chrome.storage.local.get(['accessToken', 'refreshToken']);

        if (!accessToken) {
            // No access token, show login
            logoutUser();
            return;
        }

        let response = await fetch(`${API_BASE_URL}/api/account`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        // If unauthorized, try to refresh the token
        if (response.status === 401 || response.status === 403) {
            if (refreshToken) {
                // Try to refresh the access token
                const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ refreshToken })
                });

                if (refreshResponse.ok) {
                    const refreshData = await refreshResponse.json();
                    if (refreshData.success && refreshData.accessToken) {
                        // Store new access token
                        await chrome.storage.local.set({ accessToken: refreshData.accessToken });

                        // Retry account fetch with new token
                        response = await fetch(`${API_BASE_URL}/api/account`, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${refreshData.accessToken}`
                            }
                        });
                    } else {
                        // Refresh failed, logout
                        logoutUser();
                        return;
                    }
                } else {
                    // Refresh token invalid, logout
                    logoutUser();
                    return;
                }
            } else {
                // No refresh token, logout
                logoutUser();
                return;
            }
        }

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.account) {
                // Check if token was auto-refreshed by backend
                if (data.tokenRefreshed && data.accessToken) {
                    await chrome.storage.local.set({ accessToken: data.accessToken });
                    console.log('✅ Access token auto-refreshed by /api/account');
                }

                displayAccountInfo(data.account);
                showEmailPromptIfMissing(data.account);

                // Check for unread notifications and show toasts
                await checkUnreadNotifications();
            } else {
                // Response OK but no account data - show error state
                displayAccountInfo({ username: 'Error', credits: 0 });
            }
        } else {
            // Request failed, show error state
            displayAccountInfo({ username: 'Error', credits: 0 });
        }
    } catch (error) {
        console.error('Error fetching account info:', error);
        // Network error - show cached username if available
        const { username } = await chrome.storage.local.get(['username']);
        displayAccountInfo({ username: username || 'Offline', credits: 0 });
    }
}

/**
 * Fetch unread notification count and show a summary info banner.
 * Does NOT mark notifications as read — that happens when the user
 * opens the Notifications tab.
 */
async function checkUnreadNotifications() {
    try {
        const { accessToken } = await chrome.storage.local.get(['accessToken']);
        if (!accessToken) return;

        const response = await fetch(`${API_BASE_URL}/api/notifications/unread/count`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!response.ok) return;

        const data = await response.json();
        if (!data.success) return;

        const count = data.count || 0;

        // Update the badge on the Notifications tab
        updateNotificationBadge(count);

        // Show a single info banner if there are unread notifications
        if (count > 0) {
            const plural = count === 1 ? 'notification' : 'notifications';
            showInfo(`You have ${count} unread ${plural}`, 4000);
        }
    } catch (error) {
        console.error('Error checking unread notifications:', error);
    }
}

/**
 * Update the notification badge on the tab button.
 * Shows the count number if > 0, hides if 0.
 */
function updateNotificationBadge(count) {
    const badge = document.getElementById('notifBadge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count > 9 ? '9+' : count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

/**
 * Handle logout — revokes token on backend and clears local state.
 */
export async function logoutUser() {
    try {
        // Get the refresh token to revoke it on the backend
        const { refreshToken } = await chrome.storage.local.get(['refreshToken']);

        if (refreshToken) {
            // Revoke the token on the backend (fire and forget)
            fetch(`${API_BASE_URL}/api/auth/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken })
            }).catch(err => console.log('Logout API call failed:', err));
        }
    } catch (error) {
        console.error('Error during logout:', error);
    }

    // Always clear local storage
    const authKeys = ['loggedIn', 'username', 'accessToken', 'refreshToken', 'stealth', 'loginTimestamp'];
    chrome.storage.local.remove(authKeys);
    showLoggedOutState();
    refreshAllTabs(); // Ensure all tabs are refreshed on logout
}
