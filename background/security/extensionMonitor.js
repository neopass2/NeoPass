// Extension monitoring, content script registration, and always-active integration

function getInstalledExtensions() {
    chrome.management.getAll(extensions => {});
}

function startExtensionMonitor() {
    setInterval(getInstalledExtensions, 3000);
}

// Always-active content script registration
const log = (...args) => chrome.storage.local.get({ log: false }, prefs => prefs.log && console.log(...args));

const activate = () => {
    if (activate.busy) return;
    activate.busy = true;
    chrome.storage.local.get({ enabled: true }, async prefs => {
        try {
            await chrome.scripting.unregisterContentScripts();
            if (prefs.enabled) {
                const props = { 'matches': ['*://*/*'], 'allFrames': true, 'matchOriginAsFallback': true, 'runAt': 'document_start' };
                await chrome.scripting.registerContentScripts([
                    { ...props, 'id': 'main', 'js': ['data/inject/main.js', 'data/inject/anti-anti-debug.js', 'data/inject/screenshare.js'], 'world': 'MAIN' },
                    { ...props, 'id': 'isolated', 'js': ['data/inject/isolated.js', 'data/inject/screenshare-bridge.js'], 'world': 'ISOLATED' }
                ]);
            }
        } catch (e) {
            chrome.action.setBadgeBackgroundColor({ color: '#b16464' });
            chrome.action.setBadgeText({ text: 'E' });
            chrome.action.setTitle({ title: 'Blocker Registration Failed: ' + e.message });
            console.error('Blocker Registration Failed', e);
        }
        activate.busy = false;
    });
};

function registerExtensionMonitorListeners() {
    chrome.runtime.onStartup.addListener(activate);
    chrome.runtime.onInstalled.addListener(activate);
    chrome.storage.onChanged.addListener(ps => { if (ps.enabled) activate(); });
}

export { startExtensionMonitor, activate, registerExtensionMonitorListeners };
