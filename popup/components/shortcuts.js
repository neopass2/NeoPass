// Platform-aware shortcut label updates

const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0 ||
              navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;

/**
 * Update all shortcut key labels based on the user's platform (Mac vs others).
 */
export function updateShortcutsForPlatform() {
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
