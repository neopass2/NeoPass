// Tab, window, and storage event listeners

import { showUpdateToast } from '../ui/specializedToasts.js';
import { checkForUpdate, updateCheckedThisSession, setUpdateChecked } from '../update/checkForUpdate.js';
import { fetchDomainIp, allowedIPs } from '../utils/ipValidation.js';

let tabDetails = null;

function registerTabEventListeners() {
    // Tab activated
    chrome.tabs.onActivated.addListener((activeInfo) => {
        chrome.tabs.get(activeInfo.tabId, (tab) => { tabDetails = tab; });
    });

    // Tab updated — pending update notifications + update check
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status === "complete") { tabDetails = tab; }

        if (changeInfo.status === 'complete' && tab.url &&
            !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://') &&
            !tab.url.startsWith('about:') && !tab.url.startsWith('edge://') && !tab.url.startsWith('brave://')) {
            // Check for pending notifications
            chrome.storage.local.get(['pendingUpdateNotification', 'pendingUpdateVersion'], function(data) {
                if (data.pendingUpdateNotification) {
                    chrome.storage.local.set({ 'pendingUpdateNotification': false });
                    showUpdateToast(tab.id, `Update Available: v${data.pendingUpdateVersion}\nSome features may not work. Please update your extension.`, data.pendingUpdateVersion);
                }
            });
            if (!updateCheckedThisSession.value) {
                setUpdateChecked(true);
                checkForUpdate();
            }
        }
    });

    // Window focus changed
    chrome.windows.onFocusChanged.addListener((windowId) => {
        if (windowId === chrome.windows.WINDOW_ID_NONE) return;
        chrome.tabs.query({ active: true, windowId: windowId }, (tabs) => {
            if (tabs.length > 0) tabDetails = tabs[0];
        });
    });

    // Storage change listener for remote logout
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
            if (changes.refreshToken && changes.refreshToken.newValue === undefined) {
                chrome.storage.local.remove(['accessToken', 'refreshToken', 'loggedIn', 'username']);
                chrome.tabs.query({}, function(tabs) {
                    tabs.forEach(tab => {
                        chrome.tabs.sendMessage(tab.id, { action: 'remoteLogout' }).catch(() => {});
                    });
                });
            }
        }
    });

    // Tab reload on startup
    // Tab reload on startup
    chrome.tabs.query({}, async tabs => {
        for (let tab of tabs) {
            if (!tab.url) continue;
            try {
                let ip = await fetchDomainIp(tab.url);
                if (!ip || !allowedIPs.includes(ip)) {
                    chrome.tabs.reload(tab.id, () => { chrome.runtime.lastError; });
                }
            } catch (error) { /* Silently handle */ }
        }
    });
}

export { registerTabEventListeners };
