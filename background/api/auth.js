// Authentication token management

import { CONFIG } from '../config.js';

// Helper function to get tokens from chrome storage
async function getTokens() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['accessToken', 'refreshToken'], resolve);
    });
}

// Refresh token function
async function refreshAccessToken(refreshToken, retryCount = 0) {
    const MAX_RETRIES = 2;
    
    try {
        const response = await fetch(`${CONFIG.BACKEND_BASE_URL}${CONFIG.ENDPOINTS.REFRESH_TOKEN}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                refreshToken
            })
        });

        // If refresh token is invalid/expired (401/403), return null to trigger re-login
        if (response.status === 401 || response.status === 403) {
            console.log('[refreshAccessToken] Refresh token is invalid or expired');
            return null;
        }

        // For server errors (5xx), retry
        if (response.status >= 500 && retryCount < MAX_RETRIES) {
            console.log(`[refreshAccessToken] Server error, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
            return refreshAccessToken(refreshToken, retryCount + 1);
        }

        if (!response.ok) {
            throw new Error(`Token refresh failed with status ${response.status}`);
        }

        const data = await response.json();
        if (data.success && data.accessToken) {
            // Store the new access token in chrome storage
            await chrome.storage.local.set({
                accessToken: data.accessToken
            });
            console.log('[refreshAccessToken] Access token refreshed successfully');
            return data.accessToken;
        }
        return null;
    } catch (error) {
        console.error('[refreshAccessToken] Error:', error.message);
        
        // Retry on network errors
        if (retryCount < MAX_RETRIES) {
            console.log(`[refreshAccessToken] Network error, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
            return refreshAccessToken(refreshToken, retryCount + 1);
        }
        
        // After all retries failed, return 'network_error' to distinguish from invalid token
        return 'network_error';
    }
}

export { getTokens, refreshAccessToken };
