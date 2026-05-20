/**
 * NetAcad Solver Background Feature
 * Intercepts the quiz configuration JSON from NetAcad and notifies the content script.
 */

export function registerNetacadSolverListener() {

    chrome.webRequest.onSendHeaders.addListener(async (details) => {
        const { url } = details;
        
        // We only care about the components.json request which contains the answers
        if (url.includes('components.json')) {
            
            // Broadcast to tabs. NetAcad often loads this once per session/module.
            // We use a small interval to ensure the content script has loaded and is ready to receive.
            const handleSendUrl = async () => {
                const tabs = await chrome.tabs.query({ url: "*://*.netacad.com/*" });
                
                for (const tab of tabs) {
                    try {
                        chrome.tabs.sendMessage(tab.id, {
                            action: "netacadComponentsUrl",
                            componentsUrl: url
                        });
                    } catch (e) {
                        // Content script might not be ready yet
                    }
                }
            };

            // Run once immediately
            handleSendUrl();

            // Then try a few more times in case the tab was still loading
            let attempts = 0;
            const interval = setInterval(() => {
                handleSendUrl();
                attempts++;
                if (attempts > 5) clearInterval(interval);
            }, 2000);
        }
    },
    {
        urls: ['https://*.netacad.com/*/components.json']
    });

    // Optional: Disable caching for components.json to ensure we always intercept it
    chrome.webRequest.onBeforeSendHeaders.addListener((details) => {
        return {
            requestHeaders: details.requestHeaders.map(header => {
                if (header.name.toLowerCase() === 'cache-control') {
                    return {
                        name: 'Cache-Control',
                        value: 'no-cache, no-store, must-revalidate'
                    };
                }
                return header;
            })
        };
    },
    { urls: ['https://*.netacad.com/*/components.json'] },
    ["requestHeaders", "extraHeaders"]
    );
}
