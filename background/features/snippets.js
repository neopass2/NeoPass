// Snippet processing feature

import { showToast } from '../ui/toasts.js';
import { copyToClipboard } from '../api/request.js';

function registerSnippetsListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'processSnippets') {
            const { snippets } = message;
            if (!snippets.header && !snippets.footer) { showToast(sender.tab.id, 'No snippets found', true); return true; }
            const combinedText = `// Header Snippet\n${snippets.header}\n\n// Footer Snippet\n${snippets.footer}`;
            copyToClipboard(combinedText);
            showToast(sender.tab.id, 'Snippets copied to clipboard');
            return true;
        }
        return false;
    });
}

export { registerSnippetsListener };
