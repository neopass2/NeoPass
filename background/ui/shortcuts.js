// Keyboard shortcut command handler

import { shortcutStates } from '../state/requestGate.js';
import { showToast } from './toasts.js';
import { handleSelectedTextAI } from '../features/ai/selectedText.js';

function registerShortcutListener() {
    chrome.commands.onCommand.addListener((command) => {
        if (shortcutStates[command]) {
            return;
        }
        shortcutStates[command] = true;
        (async () => {
            try {
                // Enforce login for all shortcuts - check local storage directly
                const loginStatus = await new Promise(resolve => {
                    chrome.storage.local.get(["loggedIn"], function(result) {
                        resolve(result.loggedIn === true);
                    });
                });

                const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!activeTab || !activeTab.id) return;

                if (!loginStatus) {
                    // Prompt login and abort shortcut
                    showToast(activeTab.id, 'Please log in to use this feature.', true);
                    try {
                        chrome.action.openPopup();
                    } catch (e) {
                        console.log('Could not open popup automatically:', e.message);
                    }
                    shortcutStates[command] = false;
                    return;
                }

                if (command === 'customPaste') {
                    await chrome.scripting.executeScript({
                        target: { tabId: activeTab.id },
                        func: async () => {
                            try {
                                const clipboardText = await navigator.clipboard.readText();
                                const activeElement = document.activeElement;
                                if (activeElement && (activeElement.isContentEditable || activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                                    const start = activeElement.selectionStart || 0;
                                    const end = activeElement.selectionEnd || 0;
                                    const text = activeElement.value || activeElement.textContent;
                                    const newText = text.substring(0, start) + clipboardText + text.substring(end);
                                    if (activeElement.isContentEditable) { activeElement.textContent = newText; }
                                    else { activeElement.value = newText; }
                                    activeElement.dispatchEvent(new Event('input', { bubbles: true }));
                                    activeElement.dispatchEvent(new Event('change', { bubbles: true }));
                                    return true;
                                }
                            } catch (err) {
                                console.error('Clipboard API read failed:', err);
                                return false;
                            }
                        }
                    });
                } else if (command === 'batchSolve') {
                    const response = await new Promise(resolve => {
                        chrome.tabs.sendMessage(activeTab.id, { action: 'startBatchSolve' }, resolve);
                    });
                    if (chrome.runtime.lastError) { console.log('Batch solve error:', chrome.runtime.lastError.message); }
                    else if (response && response.success) { console.log('Batch solve completed:', response.message); }
                    else if (response && response.error) { console.log('Batch solve failed:', response.error); }
                } else if (command === 'selectedTextAI') {
                    const results = await chrome.scripting.executeScript({
                        target: { tabId: activeTab.id },
                        func: () => window.getSelection().toString().trim()
                    });
                    const selectedText = results?.[0]?.result || '';
                    if (!selectedText) { showToast(activeTab.id, 'No text selected', true); return; }
                    await handleSelectedTextAI(selectedText, activeTab.id, { trigger: 'ctrl-shift-q', platform: 'generic' });
                }
            } catch (error) {
                console.error(`Shortcut handler failed for ${command}:`, error);
            } finally {
                shortcutStates[command] = false;
            }
        })();
    });
}

export { registerShortcutListener };
