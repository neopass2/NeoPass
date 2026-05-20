// Session expiration handling

import { showToast } from '../ui/toasts.js';

const SESSION_DURATION = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

async function checkAndHandleSessionExpiration() {
    try {
        const data = await chrome.storage.local.get(['loggedIn', 'loginTimestamp']);
        if (data.loggedIn && data.loginTimestamp) {
            const currentTime = Date.now();
            if (currentTime - data.loginTimestamp > SESSION_DURATION) {
                console.log('24-hour session timeout reached, logging out user');
                await chrome.storage.local.remove(['accessToken', 'refreshToken', 'loggedIn', 'username', 'loginTimestamp', 'stealth', 'useCustomAPI', 'aiProvider', 'customEndpoint', 'customAPIKey', 'customModelName']);
                chrome.tabs.query({}, function(tabs) {
                    tabs.forEach(tab => {
                        try { chrome.tabs.sendMessage(tab.id, { action: 'sessionExpired' }).catch(() => {}); } catch (err) {}
                        try { chrome.tabs.reload(tab.id); } catch (err) {}
                    });
                });
            }
        }
    } catch (error) { console.error('Error checking session expiration:', error); }
}

function setupSessionAlarm() {
    chrome.alarms.create('sessionExpirationCheck', { periodInMinutes: 5 });
}

export { SESSION_DURATION, checkAndHandleSessionExpiration, setupSessionAlarm };
