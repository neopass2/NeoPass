/**
 * Screenshare Auth Bridge (Isolated World)
 * Syncs extension state to the DOM for use by the MAIN world screenshare script.
 */
(function() {
    const id = 'np-ss-auth-port';
    let port = document.getElementById(id);
    if (!port) {
        port = document.createElement('span');
        port.id = id;
        port.style.display = 'none';
        document.documentElement.append(port);
    }

    const sync = () => {
        chrome.storage.local.get({
            accessToken: '',
            loggedIn: false,
            isPro: false
        }, prefs => {
            port.dataset.npToken = prefs.accessToken || '';
            port.dataset.npLoggedIn = prefs.loggedIn ? 'true' : 'false';
            port.dataset.npIsPro = prefs.isPro ? 'true' : 'false';
        });
    };

    // Initial sync
    sync();

    // Listen for storage changes
    chrome.storage.onChanged.addListener(sync);

    // Watch for requests from MAIN world to open login
    const observer = new MutationObserver(() => {
        if (port.dataset.npOpenLogin === 'true') {
            port.dataset.npOpenLogin = 'false';
            try {
                chrome.runtime.sendMessage({ action: 'showLoginPrompt' });
            } catch (err) {
                console.error('[NeoPass Bridge] Failed to send login prompt message');
            }
        }
    });
    observer.observe(port, { attributes: true, attributeFilter: ['data-np-open-login'] });
})();
