// Update checking and version comparison

import { showUpdateToast } from '../ui/specializedToasts.js';

// Keep track of whether we've checked for an update in this session
const updateCheckedThisSession = { value: false };

function setUpdateChecked(val) { updateCheckedThisSession.value = val; }

function compareVersions(v1, v2) {
    const v1Parts = v1.split('.').map(Number);
    const v2Parts = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
        const v1Part = v1Parts[i] || 0;
        const v2Part = v2Parts[i] || 0;
        if (v1Part > v2Part) return 1;
        if (v1Part < v2Part) return -1;
    }
    return 0;
}

async function checkForUpdate() {
    try {
        const response = await fetch('https://api.github.com/repos/neopass2/NeoPass/releases/latest');
        const data = await response.json();
        const latestVersion = data.tag_name.replace('v', '');
        const currentVersion = chrome.runtime.getManifest().version;
        if (compareVersions(latestVersion, currentVersion) > 0) {
            const { lastUpdateDismissed } = await chrome.storage.local.get(['lastUpdateDismissed']);
            const currentTime = Date.now();
            const showNotificationTimeout = 5 * 60 * 60 * 1000;
            if (!lastUpdateDismissed || (currentTime - lastUpdateDismissed) > showNotificationTimeout) {
                chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                    if (tabs[0] && tabs[0].url &&
                        !tabs[0].url.startsWith('chrome://') && !tabs[0].url.startsWith('chrome-extension://') &&
                        !tabs[0].url.startsWith('about:') && !tabs[0].url.startsWith('edge://') && !tabs[0].url.startsWith('brave://')) {
                        showUpdateToast(tabs[0].id, `Update Available: v${latestVersion}\nSome features may not work. Please update your extension.`, latestVersion);
                    } else {
                        chrome.storage.local.set({ 'pendingUpdateNotification': true, 'pendingUpdateVersion': latestVersion });
                    }
                });
            }
        }
    } catch (error) { console.error('Failed to check for updates:', error); }
}

function setupUpdateAlarm() {
    chrome.alarms.get('updateCheck', (alarm) => {
        if (!alarm) { chrome.alarms.create('updateCheck', { periodInMinutes: 12 * 60 }); }
    });
}

export { checkForUpdate, compareVersions, setupUpdateAlarm, updateCheckedThisSession, setUpdateChecked };
