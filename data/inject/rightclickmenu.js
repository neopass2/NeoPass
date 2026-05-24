(function() {
"use strict";

    // Only suppress contextmenu propagation on whitelisted hosts
    const __NEOPASS_ALLOWED_HOSTS = ['iamneo', 'examly', 'netacad.com'];
    function __isNeopassAllowedHost() {
        try { return __NEOPASS_ALLOWED_HOSTS.some(p => (window.location.hostname || '').includes(p)); } catch (e) { return false; }
    }

    if (!__isNeopassAllowedHost()) {
        // Do nothing on other hosts to avoid breaking normal right-click behavior
        return;
    }

    if (!window.__ENABLE_RIGHT_CLICK_SETUP) {
      window.document.addEventListener('contextmenu', (event) => {
        event.stopPropagation();
      }, true);
    }
    window.__ENABLE_RIGHT_CLICK_SETUP = true;

})();