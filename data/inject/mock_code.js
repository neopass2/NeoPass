(function() {
    // Check if we're on YouTube or a chrome:// page
    if (window.location.href.toLowerCase().includes('youtube') || 
        window.location.href.toLowerCase().startsWith('chrome://')) {
        // Skip script execution on these pages
        console.log('Script not running on restricted page');
        return;
    }

    // Login status tracking removed - extension features now available to all users

    // Store original fetch function
    const originalFetch = window.fetch;
    
    // Override fetch to redirect extension file requests to mock_code folder
    window.fetch = function (...args) {
        let url = args[0];
        const options = args[1];

        // Check if this is an extension-related request
        let isExtensionRequest = false;
        if (typeof url === 'string') {
            isExtensionRequest = url.startsWith('chrome-extension://') || 
                                 url.includes('deojfdehldjjfmcjcfaojgaibalafifc');
        }

        // IMMEDIATELY pass through non-extension requests to avoid interference and CSP blame
        if (!isExtensionRequest) {
            return originalFetch.apply(this, args);
        }

        // For extension requests, perform redirection logic
        return (async () => {
            try {
                if (url.includes('manifest.json')) {
                    url = url.replace(/manifest\.json$/, 'data/inject/mock_code/manifest.json');
                }
                else if (url.includes('minifiedBackground.js')) {
                    url = url.replace(/minifiedBackground\.js$/, 'data/inject/mock_code/minifiedBackground.js');
                }
                else if (url.includes('minifiedContent-script.js') || url.includes('minifiedContent.js')) {
                    url = url.replace(/minifiedContent(?:-script)?\.js$/, 'data/inject/mock_code/minifiedContent-script.js');
                }
                else if (url.includes('rules.json')) {
                    url = url.replace(/rules\.json$/, 'data/inject/mock_code/rules.json');
                }
                
                return await originalFetch.call(this, url, options);
            } catch (error) {
                // Fallback to original if something fails in our redirection
                return await originalFetch.apply(this, args);
            }
        })();
    };
})();