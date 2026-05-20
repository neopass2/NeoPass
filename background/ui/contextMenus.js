// Context menu creation and click handling

import { showToast } from './toasts.js';
import { handleSelectedTextAI } from '../features/ai/selectedText.js';
import { handleFullPageAI } from '../features/ai/fullPageSolve.js';

let extensionStatus = 'on';

function isLoggedIn(callback) {
    chrome.storage.local.get(['loggedIn'], function(result) {
        callback(result.loggedIn);
    });
}

function showLoginPrompt(tabId) {
    showToast(tabId, 'Please log in to use this feature.', true);
    chrome.action.openPopup();
}

function setupContextMenus() {
    chrome.contextMenus.create({ id: 'separator1', type: 'separator', contexts: ['editable', 'selection'] });
    if (extensionStatus === 'on') {
        chrome.contextMenus.create({ id: 'solveSelectedQuestion', title: 'Ask AI About Selected Text', contexts: ['selection'] });
        chrome.contextMenus.create({ id: 'solveFullPageAI', title: 'Solve Full Page With AI', contexts: ['page'] });
        chrome.contextMenus.create({ id: 'customPaste', title: 'Drag and Drop Paste', contexts: ['editable'] });
        chrome.contextMenus.create({ id: 'pasteByTyping', title: 'Paste by Typing', contexts: ['editable'] });
    }
}

function handleContextMenuClick(info, tab) {
    if (info.menuItemId === 'solveSelectedQuestion') {
        if (info.selectionText) {
            handleSelectedTextAI(info.selectionText, tab.id);
        } else {
            showToast(tab.id, 'No text selected', true);
        }
        return;
    }
    if (info.menuItemId === 'solveFullPageAI') {
        handleFullPageAI(tab.id);
        return;
    }
    if (info.menuItemId === 'customPaste') {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['data/inject/customPaste.js']
        }, () => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: async () => {
                    if (typeof performDragDropPaste === 'function') {
                        await performDragDropPaste();
                        return true;
                    }
                    return false;
                }
            });
        });
    }
    if (info.menuItemId === 'pasteByTyping') {
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['data/inject/customPaste.js']
        }, () => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: async () => {
                    if (typeof performPasteByTyping === 'function') {
                        await performPasteByTyping();
                        return true;
                    }
                    return false;
                }
            });
        });
    }
}

export { setupContextMenus, handleContextMenuClick, isLoggedIn, showLoginPrompt };
