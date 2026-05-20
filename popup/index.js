// Popup entry point — orchestrates all modules

import { initTabs } from './components/tabs.js';
import { showError } from './components/errorBanner.js';
import { updateShortcutsForPlatform } from './components/shortcuts.js';
import { initCreditsListener } from './components/creditsBadge.js';
import { showLoggedInState, showLoggedOutState, logoutUser } from './components/accountPanel.js';
import { initLoginForm } from './components/loginForm.js';
import { initBatchSolve } from './components/batchSolve.js';
import { isSessionExpired, checkSessionExpiration } from './state/session.js';
import { initStorageListeners } from './state/storage.js';
import { initEmailPrompt } from './components/emailPrompt.js';
import { initNotificationsTab } from './components/notificationsTab.js';

document.addEventListener('DOMContentLoaded', function () {
    // ── Version display ──────────────────────────────────────────
    const versionElement = document.getElementById('extensionVersion');
    if (versionElement) {
        const manifest = chrome.runtime.getManifest();
        versionElement.textContent = `v${manifest.version}`;
    }

    // ── Navigation links ─────────────────────────────────────────
    const FRONTEND_URL = CONFIG.FRONTEND_URL;

    const createAccountLink = document.getElementById('createAccountLink');
    const buyCreditsLink = document.getElementById('buyCreditsLink');
    const buyCreditsLinkLoggedIn = document.getElementById('buyCreditsLinkLoggedIn');

    if (createAccountLink) {
        createAccountLink.href = `${FRONTEND_URL}/signup`;
    }
    if (buyCreditsLink) {
        buyCreditsLink.href = `${FRONTEND_URL}/pricing`;
    }
    if (buyCreditsLinkLoggedIn) {
        buyCreditsLinkLoggedIn.href = `${FRONTEND_URL}/pricing`;
    }

    // ── Initialize UI modules ────────────────────────────────────
    initTabs();
    initLoginForm();
    initBatchSolve();
    initCreditsListener();
    initStorageListeners(showLoggedOutState, showError);
    initEmailPrompt();
    initNotificationsTab();

    // ── Logout button handler ────────────────────────────────────
    const logoutButton = document.getElementById('logoutButton');
    logoutButton.addEventListener('click', async function () {
        try {
            logoutUser();
            showError('Logged out successfully', 3000);
        } catch (error) {
            console.error('Logout error:', error);
            showError('An error occurred during logout. Please try again.');
        }
    });

    // ── Uninstall button handler ─────────────────────────────────
    const uninstallButton = document.getElementById('uninstallButton');
    if (uninstallButton) {
        uninstallButton.addEventListener('click', async () => {
            try {
                // Clear all storage
                await chrome.storage.local.clear();

                // Uninstall the extension
                chrome.management.uninstallSelf();
            } catch (error) {
                console.error('Error during uninstall:', error);
                const errorElement = document.getElementById('error');
                if (errorElement) errorElement.textContent = 'Error uninstalling extension';
            }
        });
    }

    // ── Check login status on popup open ─────────────────────────
    chrome.storage.local.get(['loggedIn', 'username', 'loginTimestamp', 'tokenUsage'], function (data) {
        if (data.loggedIn && data.username) {
            // Check if session has expired
            if (data.loginTimestamp && isSessionExpired(data.loginTimestamp)) {
                logoutUser();
                showError('Your session has expired. Please log in again.', 5000);
            } else {
                showLoggedInState(data.username, data.tokenUsage);
            }
        } else {
            showLoggedOutState();
        }

        // Update shortcuts based on platform
        updateShortcutsForPlatform();
    });

    // Run a session check when popup opens
    checkSessionExpiration(logoutUser, showError);

    // ── Handle extension install/update ──────────────────────────
    chrome.runtime.onInstalled.addListener(function(details) {
        if (details.reason === 'install') {
            chrome.storage.local.clear(); // Clear any existing data
            showLoggedOutState();
        }
    });

    // ── Offline handler ──────────────────────────────────────────
    window.addEventListener('offline', () => {
        showError('No internet connection. Please check your network.');
    });
});
