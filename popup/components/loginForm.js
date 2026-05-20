// Login form handling — input validation, Enter-key navigation, login API call

import { showError } from './errorBanner.js';
import { showLoggedInState } from './accountPanel.js';
import { showEmailPromptIfMissing } from './emailPrompt.js';

const API_BASE_URL = CONFIG.BACKEND_BASE_URL;

// Prevent multiple rapid login attempts
let lastLoginAttempt = 0;
const LOGIN_COOLDOWN = CONFIG.LOGIN_COOLDOWN || 2000; // 2 seconds

/**
 * Initialize the login form: input validation, Enter-key navigation,
 * login button click handler with rate limiting.
 */
export function initLoginForm() {
    const paidUsernameInput = document.getElementById('paidUsername');
    const paidPasswordInput = document.getElementById('paidPassword');
    const paidLoginButton = document.getElementById('paidLoginButton');

    // Input validation for username — only allow alphanumeric, underscore, and hyphen
    if (paidUsernameInput) {
        paidUsernameInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^a-zA-Z0-9_-]/g, '');
        });
    }

    // Username field: press Enter to move to password field
    if (paidUsernameInput && paidPasswordInput) {
        paidUsernameInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                paidPasswordInput.focus();
            }
        });
    }

    // Password field: press Enter to submit login
    if (paidPasswordInput && paidLoginButton) {
        paidPasswordInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                paidLoginButton.click();
            }
        });
    }

    // Login button handler
    if (paidLoginButton) {
        paidLoginButton.addEventListener('click', async function () {
            // Rate limiting
            const now = Date.now();
            if (now - lastLoginAttempt < LOGIN_COOLDOWN) {
                showError('Please wait a moment before trying again');
                return;
            }
            lastLoginAttempt = now;

            const username = document.getElementById('paidUsername').value.trim().toLowerCase(); // Normalize to lowercase
            const password = document.getElementById('paidPassword').value;

            if (!username || !password) {
                showError('Please enter both username and password');
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username,
                        password
                    })
                });

                const data = await response.json();

                if (data.success) {
                    const loginTimestamp = Date.now(); // Record exact login time

                    // Store login timestamp with other user data
                    await chrome.storage.local.set({
                        loggedIn: true,
                        username: username,
                        accessToken: data.accessToken,
                        refreshToken: data.refreshToken,
                        stealth: false,  // Default to false
                        loginTimestamp: loginTimestamp // Store login timestamp
                    });

                    // Display account info immediately from login response
                    showLoggedInState(username, data.account);
                    showEmailPromptIfMissing(data.account);

                    // Clear password fields
                    document.getElementById('paidUsername').value = '';
                    document.getElementById('paidPassword').value = '';

                    showError('Logged in successfully!', 2000);
                } else {
                    // Handle error response format: { success: false, error: { message: "..." } }
                    const errorMessage = data.error?.message || data.message || 'Login failed';
                    showError(errorMessage);
                }

            } catch (error) {
                console.error('Login error:', error);
                showError('An error occurred during login. Please try again.');
            }
        });
    }
}
