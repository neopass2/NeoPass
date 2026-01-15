document.addEventListener('DOMContentLoaded', function () {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0 || 
                  navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
    
    // Load version from manifest.json
    const versionElement = document.getElementById('extensionVersion');
    if (versionElement) {
        const manifest = chrome.runtime.getManifest();
        versionElement.textContent = `v${manifest.version}`;
    }
    
    const statusMessage = document.getElementById('statusMessage');
    const mainContent = document.getElementById('mainContent');
    const errorElement = document.getElementById('error');
    const logoutButton = document.getElementById('logoutButton');
    const uninstallButton = document.getElementById('uninstallButton');
    
    // Login form elements
    const paidUsernameInput = document.getElementById('paidUsername');
    const paidPasswordInput = document.getElementById('paidPassword');
    const paidLoginButton = document.getElementById('paidLoginButton');

    // Use centralized config (loaded from config.js)
    const API_BASE_URL = CONFIG.BACKEND_BASE_URL;
    const FRONTEND_URL = CONFIG.FRONTEND_URL;
    const SESSION_DURATION = CONFIG.SESSION_DURATION;
    
    // Set up navigation links to website
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

    // Function to update all shortcuts based on platform
    function updateShortcutsForPlatform() {
        // Define shortcut mappings
        const shortcutMappings = {
            // Use Control on macOS for these combos, Alt on others
            'Ctrl + Shift + T': isMac ? 'Ctrl + Shift + T' : 'Alt + Shift + T',

            // Alt-based combos render as Option on macOS
            'Option + Shift + A': isMac ? 'Option + Shift + A' : 'Alt + Shift + A',
            'Option + Shift + V': isMac ? 'Option + Shift + V' : 'Alt + Shift + V',
            'Option + Shift + Q': isMac ? 'Option + Shift + Q' : 'Alt + Shift + Q'
        };

        // Update all shortcut keys
        document.querySelectorAll('.shortcut-key').forEach(element => {
            const currentText = element.textContent.trim();
            if (shortcutMappings[currentText]) {
                element.textContent = shortcutMappings[currentText];
            }
        });
    }

    // Tab Functionality
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Update active class on buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show corresponding tab content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === tabId) {
                    content.classList.add('active');
                }
            });
        });
    });

    // Function to refresh all tabs - important when changing auth state
    function refreshAllTabs() {
        chrome.tabs.query({}, function(tabs) {
            for (let tab of tabs) {
                chrome.tabs.reload(tab.id);
            }
        });
    }

    // Helper Functions
    function showError(message, duration = 5000) {
        errorElement.innerText = message;
        errorElement.classList.remove('hidden');
        setTimeout(() => {
            errorElement.innerText = '';
            errorElement.classList.add('hidden');
        }, duration);
    }

    function showLoggedInState(username, accountData) {
        // Update the Account tab to show account information
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('accountSection').classList.remove('hidden');
        
        // If account data is provided, display it immediately
        if (accountData) {
            displayAccountInfo(accountData);
        } else {
            // Set loading state and fetch account information
            document.getElementById('accountUsername').textContent = 'Loading...';
            const mcqCreditsEl = document.getElementById('accountMcqCredits');
            const codingCreditsEl = document.getElementById('accountCodingCredits');
            if (mcqCreditsEl) mcqCreditsEl.textContent = 'Loading...';
            if (codingCreditsEl) codingCreditsEl.textContent = 'Loading...';
            fetchAccountInfo();
        }
        
        // Update shortcuts based on platform
        updateShortcutsForPlatform();
    }
    
    // Helper function to display account information
    function displayAccountInfo(account) {
        document.getElementById('accountUsername').textContent = account.username;
        
        // Display MCQ credits
        const mcqCreditsElement = document.getElementById('accountMcqCredits');
        if (mcqCreditsElement) {
            const mcqCredits = account.mcqCredits !== undefined ? account.mcqCredits : 0;
            mcqCreditsElement.textContent = mcqCredits.toLocaleString();
            // Color based on credits level
            if (mcqCredits <= 10) {
                mcqCreditsElement.style.color = '#ff4444'; // Red for low
            } else if (mcqCredits <= 50) {
                mcqCreditsElement.style.color = '#fbbf24'; // Amber for medium
            } else {
                mcqCreditsElement.style.color = '#24fb2b'; // Amber (default)
            }
        }
        
        // Display Coding credits
        const codingCreditsElement = document.getElementById('accountCodingCredits');
        if (codingCreditsElement) {
            const codingCredits = account.codingCredits !== undefined ? account.codingCredits : 0;
            codingCreditsElement.textContent = codingCredits.toLocaleString();
            // Color based on credits level
            if (codingCredits <= 10) {
                codingCreditsElement.style.color = '#ff4444'; // Red for low
            } else if (codingCredits <= 50) {
                codingCreditsElement.style.color = '#60a5fa'; // Blue for medium
            } else {
                codingCreditsElement.style.color = '#60a5fa'; // Blue (default)
            }
        }
    }
    
    // Listen for storage changes to update credits in real-time
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') return;
        
        // Update MCQ credits if changed
        if (changes.mcqCreditsRemaining) {
            const mcqCreditsElement = document.getElementById('accountMcqCredits');
            if (mcqCreditsElement) {
                const newCredits = changes.mcqCreditsRemaining.newValue || 0;
                mcqCreditsElement.textContent = newCredits.toLocaleString();
                if (newCredits <= 10) {
                    mcqCreditsElement.style.color = '#ff4444';
                } else if (newCredits <= 50) {
                    mcqCreditsElement.style.color = '#fbbf24';
                } else {
                    mcqCreditsElement.style.color = '#fbbf24';
                }
                console.log(`[Popup] MCQ credits updated to: ${newCredits}`);
            }
        }
        
        // Update Coding credits if changed
        if (changes.codingCreditsRemaining) {
            const codingCreditsElement = document.getElementById('accountCodingCredits');
            if (codingCreditsElement) {
                const newCredits = changes.codingCreditsRemaining.newValue || 0;
                codingCreditsElement.textContent = newCredits.toLocaleString();
                if (newCredits <= 10) {
                    codingCreditsElement.style.color = '#ff4444';
                } else if (newCredits <= 50) {
                    codingCreditsElement.style.color = '#60a5fa';
                } else {
                    codingCreditsElement.style.color = '#60a5fa';
                }
                console.log(`[Popup] Coding credits updated to: ${newCredits}`);
            }
        }
    });
    
    // Function to fetch account information from backend
    async function fetchAccountInfo() {
        try {
            const { accessToken, refreshToken } = await chrome.storage.local.get(['accessToken', 'refreshToken']);
            
            if (!accessToken) {
                // No access token, show login
                logoutUser();
                return;
            }
            
            let response = await fetch(`${API_BASE_URL}/api/account`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            
            // If unauthorized, try to refresh the token
            if (response.status === 401 || response.status === 403) {
                if (refreshToken) {
                    // Try to refresh the access token
                    const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ refreshToken })
                    });
                    
                    if (refreshResponse.ok) {
                        const refreshData = await refreshResponse.json();
                        if (refreshData.success && refreshData.accessToken) {
                            // Store new access token
                            await chrome.storage.local.set({ accessToken: refreshData.accessToken });
                            
                            // Retry account fetch with new token
                            response = await fetch(`${API_BASE_URL}/api/account`, {
                                method: 'GET',
                                headers: {
                                    'Authorization': `Bearer ${refreshData.accessToken}`
                                }
                            });
                        } else {
                            // Refresh failed, logout
                            logoutUser();
                            return;
                        }
                    } else {
                        // Refresh token invalid, logout
                        logoutUser();
                        return;
                    }
                } else {
                    // No refresh token, logout
                    logoutUser();
                    return;
                }
            }
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.account) {
                    // Check if token was auto-refreshed by backend
                    if (data.tokenRefreshed && data.accessToken) {
                        await chrome.storage.local.set({ accessToken: data.accessToken });
                        console.log('✅ Access token auto-refreshed by /api/account');
                    }
                    
                    displayAccountInfo(data.account);
                } else {
                    // Response OK but no account data - show error state
                    displayAccountInfo({ username: 'Error', credits: 0 });
                }
            } else {
                // Request failed, show error state
                displayAccountInfo({ username: 'Error', credits: 0 });
            }
        } catch (error) {
            console.error('Error fetching account info:', error);
            // Network error - show cached username if available
            const { username } = await chrome.storage.local.get(['username']);
            displayAccountInfo({ username: username || 'Offline', credits: 0 });
        }
    }

    function showLoggedOutState() {
        // Show login form in Account tab
        document.getElementById('loginSection').classList.remove('hidden');
        document.getElementById('accountSection').classList.add('hidden');
    }

    // Modified function to check if session is expired - enforce 7 day timeout (matches backend)
    function checkSessionExpiration() {
        chrome.storage.local.get(['loginTimestamp'], function(data) {
            if (data.loginTimestamp) {
                const currentTime = Date.now();
                if (currentTime - data.loginTimestamp > SESSION_DURATION) {
                    // Session expired, log out the user
                    logoutUser();
                    showError('Your session has expired. Please log in again.', 5000);
                }
            }
        });
    }

    // Function to handle logout - revokes token on backend and clears local state
    async function logoutUser() {
        try {
            // Get the refresh token to revoke it on the backend
            const { refreshToken } = await chrome.storage.local.get(['refreshToken']);
            
            if (refreshToken) {
                // Revoke the token on the backend (fire and forget)
                fetch(`${API_BASE_URL}/api/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ refreshToken })
                }).catch(err => console.log('Logout API call failed:', err));
            }
        } catch (error) {
            console.error('Error during logout:', error);
        }
        
        // Always clear local storage
        const authKeys = ['loggedIn', 'username', 'accessToken', 'refreshToken', 'stealth', 'loginTimestamp'];
        chrome.storage.local.remove(authKeys);
        showLoggedOutState();
        refreshAllTabs(); // Ensure all tabs are refreshed on logout
    }

    // Add storage change listener
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
            // Check for remote logout (refreshToken removed) or local logout
            if ((changes.refreshToken && changes.refreshToken.newValue === undefined) ||
                (changes.loggedIn && changes.loggedIn.newValue === false)) {
                showLoggedOutState();
                showError('You have been logged out', 3000);
                
                // Clear any remaining auth data
                chrome.storage.local.remove(['accessToken', 'refreshToken', 'loggedIn', 'username']);
            }
        }
    });

    // Check login status and session expiration on popup open
    chrome.storage.local.get(['loggedIn', 'username', 'loginTimestamp', 'tokenUsage'], function (data) {
        if (data.loggedIn && data.username) {
            // Check if session has expired - enforce 7 day timeout (matches backend)
            const currentTime = Date.now();
            if (data.loginTimestamp && currentTime - data.loginTimestamp > SESSION_DURATION) {
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
    checkSessionExpiration();

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

    // Login button handler for Paid tab
    if (paidLoginButton) {
        paidLoginButton.addEventListener('click', async function () {
            const username = document.getElementById('paidUsername').value.trim();
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
                    
                    // Clear password fields
                    document.getElementById('paidUsername').value = '';
                    document.getElementById('paidPassword').value = '';
                    
                    showError('Logged in successfully!', 2000);
                } else {
                    showError(data.message || 'Login failed');
                }
        
            } catch (error) {
                console.error('Login error:', error);
                showError('An error occurred during login. Please try again.');
            }
        });
    }
    
    // Logout button handler
    logoutButton.addEventListener('click', async function () {
        try {
            logoutUser(); // Use the new centralized logout function
            showError('Logged out successfully', 3000);
        } catch (error) {
            console.error('Logout error:', error);
            showError('An error occurred during logout. Please try again.');
        }
    });
    
    // Error handling for network issues
    window.addEventListener('offline', () => {
        showError('No internet connection. Please check your network.');
    });

    // Add input validation for paid username (already defined above)
    if (paidUsernameInput) {
        paidUsernameInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^a-zA-Z0-9_-]/g, ''); // Only allow alphanumeric, underscore, and hyphen
        });
    }

    // Prevent multiple rapid login attempts
    let lastLoginAttempt = 0;
    const LOGIN_COOLDOWN = 2000; // 2 seconds

    if (paidLoginButton) {
        paidLoginButton.addEventListener('click', function() {
            const now = Date.now();
            if (now - lastLoginAttempt < LOGIN_COOLDOWN) {
                showError('Please wait a moment before trying again');
                return;
            }
            lastLoginAttempt = now;
        });
    }

    // Handle extension install/update
    chrome.runtime.onInstalled.addListener(function(details) {
        if (details.reason === 'install') {
            chrome.storage.local.clear(); // Clear any existing data
            showLoggedOutState();
        }
    });
    
    // Uninstall button event listener
    if (uninstallButton) {
        uninstallButton.addEventListener('click', async () => {
            try {
                // Clear all storage
                await chrome.storage.local.clear();
                
                // Uninstall the extension
                chrome.management.uninstallSelf();
            } catch (error) {
                console.error('Error during uninstall:', error);
                errorElement.textContent = 'Error uninstalling extension';
            }
        });
    }

    // Batch Solve button handler
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
            const startBatchSolveBtn = document.getElementById('startBatchSolve');
            if (startBatchSolveBtn && !startBatchSolveBtn.disabled) {
                startBatchSolveBtn.click();
            }
        }
    });
});

