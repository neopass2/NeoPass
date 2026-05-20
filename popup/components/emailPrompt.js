import { showError } from './errorBanner.js';
import { displayAccountInfo } from './creditsBadge.js';
import { logoutUser } from './accountPanel.js';

const API_BASE_URL = CONFIG.BACKEND_BASE_URL;
const SET_EMAIL_ENDPOINT = CONFIG.ENDPOINTS?.SET_EMAIL || '/api/account/email';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let initialized = false;

export function initEmailPrompt() {
    if (initialized) return;
    initialized = true;

    const overlay = document.getElementById('emailPromptOverlay');
    const closeBtn = document.getElementById('emailPromptClose');
    const form = document.getElementById('emailPromptForm');
    const input = document.getElementById('emailPromptInput');
    const errorEl = document.getElementById('emailPromptError');

    if (!overlay || !closeBtn || !form || !input || !errorEl) return;

    closeBtn.addEventListener('click', () => {
        overlay.classList.add('hidden');
        errorEl.classList.add('hidden');
        errorEl.textContent = '';
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorEl.classList.add('hidden');
        errorEl.textContent = '';

        const email = (input.value || '').trim();
        if (!EMAIL_REGEX.test(email)) {
            errorEl.textContent = 'Please enter a valid email address.';
            errorEl.classList.remove('hidden');
            return;
        }

        try {
            const { accessToken, refreshToken } = await chrome.storage.local.get(['accessToken', 'refreshToken']);
            if (!accessToken) {
                showError('Please log in again to set your email.');
                logoutUser();
                return;
            }

            let response = await fetch(`${API_BASE_URL}${SET_EMAIL_ENDPOINT}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({ email })
            });

            if (response.status === 401 || response.status === 403) {
                if (refreshToken) {
                    const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ refreshToken })
                    });

                    if (refreshResponse.ok) {
                        const refreshData = await refreshResponse.json();
                        if (refreshData.success && refreshData.accessToken) {
                            await chrome.storage.local.set({ accessToken: refreshData.accessToken });
                            response = await fetch(`${API_BASE_URL}${SET_EMAIL_ENDPOINT}`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${refreshData.accessToken}`
                                },
                                body: JSON.stringify({ email })
                            });
                        }
                    }
                }
            }

            const data = await response.json();
            if (!response.ok) {
                const message = data.error?.message || data.message || 'Failed to save email.';
                errorEl.textContent = message;
                errorEl.classList.remove('hidden');
                return;
            }

            if (data?.account) {
                displayAccountInfo(data.account);
            }

            overlay.classList.add('hidden');
            input.value = '';
            showError('Email saved successfully!', 2000);
        } catch (err) {
            console.error('Email save error:', err);
            errorEl.textContent = 'Failed to save email. Please try again.';
            errorEl.classList.remove('hidden');
        }
    });
}

export function showEmailPromptIfMissing(account) {
    const overlay = document.getElementById('emailPromptOverlay');
    const input = document.getElementById('emailPromptInput');
    if (!overlay || !input) return;

    if (!account?.email) {
        overlay.classList.remove('hidden');
        input.focus();
    }
}
