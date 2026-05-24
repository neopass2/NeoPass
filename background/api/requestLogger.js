// Request Logger — Fire-and-forget logging for interception/netacad events
// Sends classified log events to POST /api/log-request without blocking the main flow.

import { CONFIG } from '../config.js';
import { getTokens } from './auth.js';

/**
 * Log an interception/netacad event to the backend.
 * Fire-and-forget: never blocks, never throws. Retries once on failure.
 *
 * @param {Object} params
 * @param {string} params.trigger   - 'alt-shift-a', 'ctrl-q', 'netacad', etc.
 * @param {string} params.platform  - 'examly', 'netacad', 'hackerrank', 'generic'
 * @param {string} params.category  - 'mcq' or 'coding'
 * @param {number} [params.questionCount=1] - Number of questions in this event
 */
async function logInterceptionRequest({ trigger, platform, category, questionCount = 1 }) {
    try {
        const { accessToken } = await getTokens();
        if (!accessToken) return; // Not logged in — skip silently

        const url = `${CONFIG.BACKEND_BASE_URL}/api/log-request`;
        const body = JSON.stringify({
            triggerSource: trigger,
            platform: platform,
            category: category || 'mcq',
            questionCount: questionCount
        });

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        };

        // Fire-and-forget — don't await in caller
        fetch(url, { method: 'POST', headers, body })
            .then(resp => {
                if (!resp.ok && resp.status !== 202) {
                    console.debug('[RequestLogger] Log failed with status:', resp.status);
                    // Retry once after 5 seconds
                    setTimeout(() => {
                        fetch(url, { method: 'POST', headers, body }).catch(() => {});
                    }, 5000);
                }
            })
            .catch(() => {
                // Silently ignore — logging should never disrupt UX
            });

    } catch (e) {
        // Silently ignore all errors
    }
}

export { logInterceptionRequest };
