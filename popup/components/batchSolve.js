// Batch Solve button handler — auth/credit checks, status display, keyboard shortcut

import { fetchAccountInfo } from './accountPanel.js';

const API_BASE_URL = CONFIG.BACKEND_BASE_URL;

/**
 * Initialize the Batch Solve button handler with auth/credit checks,
 * status updates, and keyboard shortcut listener (Alt+Shift+Q).
 */
export function initBatchSolve() {
    const startBatchSolveBtn = document.getElementById('startBatchSolve');
    const batchSolveStatus = document.getElementById('batchSolveStatus');

    if (startBatchSolveBtn) {
        startBatchSolveBtn.addEventListener('click', async function() {
            // First check if user is logged in and has credits
            const authData = await chrome.storage.local.get(['loggedIn', 'accessToken', 'refreshToken']);

            if (!authData.loggedIn || !authData.accessToken || !authData.refreshToken) {
                batchSolveStatus.style.display = 'block';
                batchSolveStatus.textContent = '❌ Please login first to use Batch Solve';
                batchSolveStatus.style.color = '#ff4444';
                return;
            }

            // Check credits via account endpoint
            try {
                const accountResponse = await fetch(`${API_BASE_URL}/api/account`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${authData.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!accountResponse.ok) {
                    if (accountResponse.status === 401 || accountResponse.status === 403) {
                        batchSolveStatus.style.display = 'block';
                        batchSolveStatus.textContent = '❌ Session expired. Please login again.';
                        batchSolveStatus.style.color = '#ff4444';
                        return;
                    }
                    throw new Error('Failed to check account status');
                }

                const accountData = await accountResponse.json();

                // Check MCQ credits specifically for batch solve
                const mcqCredits = accountData.account?.mcqCredits ?? accountData.account?.credits ?? 0;
                if (!accountData.account || mcqCredits <= 0) {
                    batchSolveStatus.style.display = 'block';
                    batchSolveStatus.textContent = '❌ Insufficient MCQ credits. Please add more credits.';
                    batchSolveStatus.style.color = '#ff4444';
                    return;
                }
            } catch (error) {
                console.error('Error checking credits:', error);
                batchSolveStatus.style.display = 'block';
                batchSolveStatus.textContent = '❌ Error checking credits. Please try again.';
                batchSolveStatus.style.color = '#ff4444';
                return;
            }

            // Disable button during operation
            startBatchSolveBtn.disabled = true;
            startBatchSolveBtn.textContent = '⏳ Processing...';
            batchSolveStatus.style.display = 'block';
            batchSolveStatus.textContent = 'Starting batch solve...';
            batchSolveStatus.style.color = '';

            try {
                // Get the active tab
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

                if (!tab) {
                    throw new Error('No active tab found');
                }

                // Send message to content script to start batch solve
                chrome.tabs.sendMessage(tab.id, { action: 'startBatchSolve' }, function(response) {
                    if (chrome.runtime.lastError) {
                        batchSolveStatus.textContent = '❌ Error: ' + chrome.runtime.lastError.message;
                        batchSolveStatus.style.color = '#ff4444';
                    } else if (response && response.success) {
                        batchSolveStatus.textContent = '✅ ' + (response.message || 'Batch solve completed!');
                        batchSolveStatus.style.color = '#4ade80';
                        // Refresh account info to update credits display
                        fetchAccountInfo();
                    } else if (response && response.error) {
                        batchSolveStatus.textContent = '❌ ' + response.error;
                        batchSolveStatus.style.color = '#ff4444';
                    } else {
                        batchSolveStatus.textContent = '❌ Unknown error occurred';
                        batchSolveStatus.style.color = '#ff4444';
                    }

                    // Re-enable button
                    startBatchSolveBtn.disabled = false;
                    startBatchSolveBtn.textContent = '🚀 Start Batch Solve';
                });
            } catch (error) {
                batchSolveStatus.textContent = '❌ Error: ' + error.message;
                batchSolveStatus.style.color = '#ff4444';
                startBatchSolveBtn.disabled = false;
                startBatchSolveBtn.textContent = '🚀 Start Batch Solve';
            }
        });
    }

    // Keyboard shortcut listener for Alt+Shift+Q (Batch Solve)
    document.addEventListener('keydown', function(event) {
        // Check for Alt+Shift+Q (or Cmd+Shift+Q on Mac)
        if ((event.altKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'q') {
            event.preventDefault();
            const btn = document.getElementById('startBatchSolve');
            if (btn && !btn.disabled) {
                btn.click();
            }
        }
    });
}
