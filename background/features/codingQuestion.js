// Coding question extraction feature

import { showToast } from '../ui/toasts.js';
import { copyToClipboard } from '../api/request.js';

function registerCodingQuestionListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'extractCodingQuestion') {
            const { data } = message;
            const formattedText = `Programming Language:\n${data.programmingLanguage}\n\nQuestion:\n${data.question}\n\nInput Format:\n${data.inputFormat}\n\nOutput Format:\n${data.outputFormat}\n\nSample Test Cases:\n${data.testCases}`;
            copyToClipboard(formattedText);
            showToast(sender.tab.id, 'Coding question details copied to clipboard');
            return true;
        }
        return false;
    });
}

export { registerCodingQuestionListener };
