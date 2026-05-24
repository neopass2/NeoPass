// Custom Ctrl+C override functionality - Prevents default copy on divs
(function() {
    'use strict';

    // ------- Domain whitelist: only enable copy override on target sites -------
    const __NEOPASS_ALLOWED_HOSTS = [
        'iamneo',    // iamneo sites
        'examly',    // examly sites
        'netacad.com' // Cisco Netacad helper (existing behavior)
    ];

    function __isNeopassAllowedHost() {
        try {
            const host = window.location.hostname || '';
            return __NEOPASS_ALLOWED_HOSTS.some(p => host.includes(p));
        } catch (e) {
            return false;
        }
    }

    // If not running on a whitelisted site, bail out silently to avoid interfering
    if (!__isNeopassAllowedHost()) return;

    // Create an invisible textarea for our controlled copy operations
    const invisibleTextarea = document.createElement('textarea');
    invisibleTextarea.id = 'neopass-invisible-copy';
    invisibleTextarea.style.position = 'fixed';
    invisibleTextarea.style.opacity = '0';
    invisibleTextarea.style.pointerEvents = 'none';
    invisibleTextarea.style.left = '-9999px';
    invisibleTextarea.style.top = '-9999px';
    invisibleTextarea.style.width = '1px';
    invisibleTextarea.style.height = '1px';
    invisibleTextarea.style.border = 'none';
    invisibleTextarea.style.outline = 'none';
    invisibleTextarea.style.resize = 'none';
    invisibleTextarea.style.overflow = 'hidden';
    document.body.appendChild(invisibleTextarea);

    // Store the last copied text in a global variable for paste operations
    window.neoPassClipboard = '';

    // Override navigator.clipboard.writeText to use our custom copy AND store in clipboard
    const originalWriteText = navigator.clipboard.writeText;
    navigator.clipboard.writeText = async function(text) {
        window.neoPassClipboard = text; // Store for later paste
        
        try {
            // Try to use the original writeText first for compatibility
            await originalWriteText.call(navigator.clipboard, text);
        } catch (err) {
            await customCopy(text);
        }
        
        return Promise.resolve();
    };

    // Override document.execCommand to use our custom copy method
    const originalExecCommand = document.execCommand;
    document.execCommand = function(command, showUI, value) {
        if (command === 'copy') {
            const activeElement = document.activeElement;
            if (activeElement !== invisibleTextarea) {
                const text = activeElement.value || activeElement.textContent;
                if (text) {
                    return customCopy(text);
                }
                return false;
            }
        }
        return originalExecCommand.call(this, command, showUI, value);
    };

    // Function to perform custom copy operation
    async function customCopy(selectedText) {
        if (!selectedText) return false;

        try {
            // Store in our global clipboard variable
            window.neoPassClipboard = selectedText;
            
            try {
                await originalWriteText.call(navigator.clipboard, selectedText);
            } catch (clipErr) {
            }
            
            invisibleTextarea.value = selectedText;
            invisibleTextarea.select();
            invisibleTextarea.setSelectionRange(0, selectedText.length);

            const success = originalExecCommand.call(document, 'copy');
            
            // Clear the textarea
            invisibleTextarea.value = '';
            invisibleTextarea.blur();
            
            return success;
        } catch (err) {
            return false;
        }
    }

    // Function to get selected text
    function getSelectedText() {
        const selection = window.getSelection();
        return selection.toString().trim();
    }

    // Function removed - login check no longer required

    // CRITICAL: Block ALL copy events at the earliest phase
    document.addEventListener('copy', function(event) {
        // Only allow copy from our invisible textarea
        if (event.target !== invisibleTextarea && document.activeElement !== invisibleTextarea) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }
    }, true); // Capture phase - runs before any other handlers

    // Handle keyboard copy (Ctrl+C / Cmd+C)
    document.addEventListener('keydown', async function(event) {
        if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key === 'c') {
            const selectedText = getSelectedText();
            
            if (selectedText) {
                // Prevent default FIRST
                event.preventDefault();
                event.stopImmediatePropagation();
                
                try {
                    // Store in global clipboard
                    window.neoPassClipboard = selectedText;
                    
                    // Perform custom copy
                    const success = await customCopy(selectedText);
                    
                    // Clear selection after copy
                    window.getSelection().removeAllRanges();
                    
                } catch (error) {
                }
            }
        }
    }, true); // Capture phase

    // Handle context menu copy
    document.addEventListener('contextmenu', function(event) {
        const selectedText = getSelectedText();
        if (selectedText) {
            window.neoPassSelectedText = selectedText;
            window.neoPassClipboard = selectedText; // Also store in main clipboard
        }
    }, true);

    // Log clipboard status for debugging
    window.getNeoPassClipboard = function() {
        return window.neoPassClipboard;
    };

})();