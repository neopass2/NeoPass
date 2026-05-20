// Selected text AI feature

import { queryRequest } from '../../api/queryRequest.js';
import { showToast } from '../../ui/toasts.js';
import { showSpinnerToast, showMCQToast } from '../../ui/specializedToasts.js';

function getSelectedText() {
    const selectedText = window.getSelection().toString().trim();
    if (!selectedText) {
        chrome.runtime.sendMessage({ action: 'showToast', message: 'No text selected', isError: true });
        return '';
    }
    return selectedText;
}

function isRetriableSelectedTextError(response) {
    if (!response || !response.error) {
        return false;
    }

    return response.errorType === 'network' || response.errorType === 'server' || response.errorType === 'general';
}

async function handleSelectedTextAI(selectedText, tabId) {
    const cleanedText = (selectedText || '').trim();
    if (!cleanedText) {
        showToast(tabId, 'No text selected', true);
        return;
    }

    await showSpinnerToast(tabId, 'Fetching answers from AI...');

    const prompt = [
        'You are a helpful AI assistant.',
        'Answer the selected text directly and concisely.',
        'If the selection is a question, give the answer first and add a brief explanation only if helpful.',
        'If the selection is not a question, summarize or explain it clearly.',
        '',
        'Selected text:',
        cleanedText
    ].join('\n');

    let response = await queryRequest(prompt, false, false, tabId, 'general', 1);

    if (isRetriableSelectedTextError(response)) {
        await new Promise(resolve => setTimeout(resolve, 800));
        response = await queryRequest(prompt, false, false, tabId, 'general', 1);
    }

    if (typeof response === 'string') {
        showMCQToast(tabId, response, 'AI response generated from the selected text.');
        return;
    }

    if (response && response.error) {
        if (response.errorType === 'auth') {
            return;
        }
        showToast(tabId, response.error, true, response.detailedInfo || 'The AI service returned an error while processing the selected text.');
        return;
    }

    showToast(tabId, 'Service unavailable. Please try again later.', true);
}

export { handleSelectedTextAI, getSelectedText };
