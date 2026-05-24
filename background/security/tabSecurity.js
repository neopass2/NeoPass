import { fetchDomainIp, allowedIPs } from '../utils/ipValidation.js';

/**
 * Validates the IP address of all open tabs and reloads them if they are on unauthorized domains.
 * This is a security measure to ensure the extension is only active on validated portals.
 */
async function validateOpenTabs() {
    try {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
            if (!tab.url || !tab.url.startsWith('http')) continue;

            try {
                const ip = await fetchDomainIp(tab.url);
                // In v1.0, we only reload if the domain IS one we recognize but the IP is WRONG.
                // However, following 'main' logic, it reloads if the IP is not in the allowed list.
                // To be safe and less annoying, we only reload if it's a known exam portal.
                const hostname = new URL(tab.url).hostname;
                const isExamPortal = hostname.includes('examly') || hostname.includes('iamneo') || hostname.includes('vit.ac.in');
                
                if (isExamPortal) {
                    if (allowedIPs.length === 0) {
                        // If IP allowlist failed to load, avoid reload loops
                        continue;
                    }
                    if (!ip || !allowedIPs.includes(ip)) {
                        console.warn(`[TabSecurity] Unauthorized IP detected for ${hostname}. Reloading tab.`);
                        chrome.tabs.reload(tab.id, () => {
                            if (chrome.runtime.lastError) {
                                // Ignore errors
                            }
                        });
                    }
                }
            } catch (error) {
                // Silently handle errors for specific tabs
            }
        }
    } catch (error) {
        console.error('[TabSecurity] Error validating tabs:', error);
    }
}

/**
 * Registers listeners for tab-based security checks.
 */
function registerTabSecurityListeners() {
    // Check tabs on startup
    chrome.runtime.onStartup.addListener(validateOpenTabs);
    
    // Check tab when it's updated (e.g. navigation)
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.status === 'complete' && tab.url) {
            validateOpenTabs();
        }
    });

    // Run initial check
    validateOpenTabs();
}

export { validateOpenTabs, registerTabSecurityListeners };
