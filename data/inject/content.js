window.addEventListener('blur', function () {
    window.focus();
});

// ============================================
// CONTEXT INVALIDATION DETECTION
// ============================================
let _neopassContextInvalidated = false;

function showContextInvalidatedToast() {
    if (document.getElementById('neopass-context-invalidated-toast')) return;

    const existingUpdate = document.getElementById('neopass-update-notification');
    if (existingUpdate) existingUpdate.remove();

    const gradientContainer = document.createElement('div');
    gradientContainer.className = 'neopass-update-notification';
    gradientContainer.id = 'neopass-context-invalidated-toast';
    gradientContainer.style.cursor = 'default';
    
    const toast = document.createElement('div');
    toast.className = 'neopass-update-notification-inner';
    
    const header = document.createElement('div');
    header.className = 'neopass-update-header';
    
    const title = document.createElement('div');
    title.className = 'neopass-update-title';
    title.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:8px;color:#A855F7"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg><span style="vertical-align:middle">Connection Lost</span>';
    
    const closeBtn = document.createElement('span');
    closeBtn.className = 'neopass-update-close';
    closeBtn.innerHTML = '&times;';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'neopass-update-message';
    messageDiv.innerHTML = 'NeoPass disconnected.<br>Extension was updated or reloaded. Please refresh this page to reconnect.';
    
    const linksContainer = document.createElement('div');
    linksContainer.className = 'neopass-update-links';
    
    const refreshBtn = document.createElement('a');
    refreshBtn.href = '#';
    refreshBtn.innerHTML = 'Refresh Page';
    refreshBtn.className = 'neopass-update-link neopass-update-link-primary';
    refreshBtn.onclick = (e) => {
        e.preventDefault();
        location.reload();
    };
    
    closeBtn.onclick = (e) => {
        e.stopPropagation();
        gradientContainer.style.animation = 'neopassFadeOut 0.3s ease-out';
        setTimeout(() => gradientContainer.remove(), 280);
    };
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    linksContainer.appendChild(refreshBtn);
    toast.appendChild(header);
    toast.appendChild(messageDiv);
    toast.appendChild(linksContainer);
    gradientContainer.appendChild(toast);
    
    document.body.appendChild(gradientContainer);
}

// Wrap chrome.runtime.sendMessage to detect context invalidation
const _originalSendMessage = chrome.runtime.sendMessage.bind(chrome.runtime);
chrome.runtime.sendMessage = function (message, callback) {
    if (_neopassContextInvalidated) {
        showContextInvalidatedToast();
        return;
    }
    try {
        _originalSendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                const errMsg = chrome.runtime.lastError.message || '';
                if (errMsg.includes('Extension context invalidated') ||
                    errMsg.includes('Cannot access') ||
                    errMsg.includes('message port closed')) {
                    _neopassContextInvalidated = true;
                    showContextInvalidatedToast();
                }
            }
            if (callback) callback(response);
        });
    } catch (e) {
        if (e.message && (e.message.includes('Extension context invalidated') ||
            e.message.includes('Cannot access'))) {
            _neopassContextInvalidated = true;
            showContextInvalidatedToast();
        }
    }
};

// Declare shared isMac variable (this will be the first to run)
window.isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0 ||
    navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;

// Automatically enable text selection on all websites
(function () {
    // Function to enable text selection globally
    function enableTextSelectionGlobally() {
        // Remove CSS rules that disable text selection
        const style = document.createElement('style');
        style.id = 'force-text-selection-style';
        style.innerHTML = `
            * {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
                -webkit-touch-callout: default !important;
            }
            /* Override common classes that disable text selection */
            .no-select, .noselect, .unselectable,
            .qaas-disable-text-selection,
            .qaas-disable-text-selection *,
            [data-disable-text-selection],
            [data-disable-text-selection] *,
            [unselectable="on"],
            [onselectstart],
            [ondragstart] {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
                -webkit-touch-callout: default !important;
            }
        `;

        // Only add if not already present
        if (!document.getElementById('force-text-selection-style')) {
            document.head.appendChild(style);
        }

        // Remove specific attributes and classes that disable text selection
        const disabledElements = document.querySelectorAll(`
            .no-select, .noselect, .unselectable,
            .qaas-disable-text-selection, 
            [data-disable-text-selection],
            [unselectable="on"],
            [onselectstart],
            [ondragstart]
        `);

        disabledElements.forEach(element => {
            // Remove classes
            element.classList.remove('no-select', 'noselect', 'unselectable', 'qaas-disable-text-selection');

            // Remove attributes
            element.removeAttribute('data-disable-text-selection');
            element.removeAttribute('unselectable');
            element.removeAttribute('onselectstart');
            element.removeAttribute('ondragstart');

            // Force styles
            element.style.userSelect = 'text';
            element.style.webkitUserSelect = 'text';
            element.style.mozUserSelect = 'text';
            element.style.msUserSelect = 'text';
            element.style.webkitTouchCallout = 'default';
        });

        // Override common event handlers that prevent text selection
        document.onselectstart = null;
        document.ondragstart = null;
        document.oncontextmenu = null;

        // Remove event listeners that might interfere with text selection
        const body = document.body;
        if (body) {
            body.onselectstart = null;
            body.ondragstart = null;
        }
    }

    // Apply immediately
    enableTextSelectionGlobally();

    // Apply when DOM is fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', enableTextSelectionGlobally);
    }

    // Re-apply when new content is added (for dynamic websites)
    const observer = new MutationObserver(function (mutations) {
        let shouldReapply = false;
        mutations.forEach(function (mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Check if any added nodes have text selection disabled
                mutation.addedNodes.forEach(function (node) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const hasDisabledSelection = node.matches && node.matches(`
                            .no-select, .noselect, .unselectable,
                            .qaas-disable-text-selection,
                            [data-disable-text-selection],
                            [unselectable="on"],
                            [onselectstart],
                            [ondragstart]
                        `);
                        if (hasDisabledSelection || node.querySelector) {
                            shouldReapply = true;
                        }
                    }
                });
            }
        });

        if (shouldReapply) {
            enableTextSelectionGlobally();
        }
    });

    // Start observing
    observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
    });
})();

// Function to convert HTML to readable text with proper formatting
function htmlToText(element) {
    if (!element) return '';

    // Clone the element to avoid modifying the original
    const clone = element.cloneNode(true);

    // Handle superscripts - convert <sup>text</sup> to ^text
    clone.querySelectorAll('sup').forEach(sup => {
        sup.textContent = '^' + sup.textContent;
    });

    // Handle subscripts - convert <sub>text</sub> to _text
    clone.querySelectorAll('sub').forEach(sub => {
        sub.textContent = '_' + sub.textContent;
    });

    // Handle line breaks
    clone.querySelectorAll('br').forEach(br => {
        br.replaceWith('\n');
    });

    // Get the text content
    return clone.innerText.trim();
}

// Function to extract the question, code, and options
function extractQuestionCodeAndOptions() {
    // Extracting the question text
    const questionElement = document.querySelector('div[aria-labelledby="question-data"]');
    const questionText = questionElement ? htmlToText(questionElement) : '';

    // Extracting the code
    const codeLines = [];
    const codeElements = document.querySelectorAll('.ace_layer.ace_text-layer .ace_line');

    codeElements.forEach(line => {
        codeLines.push(line.innerText.trim());
    });

    const codeText = codeLines.length > 0 ? codeLines.join('\n') : null; // Set to null if no code is found

    // Extracting options
    const optionsElements = document.querySelectorAll('div[aria-labelledby="each-option"]'); // Update this selector as necessary
    const optionsText = [];
    optionsElements.forEach((option, index) => {
        optionsText.push(`Option ${index + 1}: ${htmlToText(option)}`);
    });

    return {
        question: questionText,
        code: codeText, // This can be null if no code is present
        options: optionsText.join('\n') // Join options with new line characters
    };
}

// Function to extract the current question index (0-based) from Examly UI
function getExamlyQuestionIndex() {
    try {
        const textNodes = document.evaluate('//text()[contains(., "Question No :")]', document, null, XPathResult.ANY_TYPE, null);
        let node = textNodes.iterateNext();
        while (node) {
            const match = node.textContent.match(/Question No : (\d+) \/ \d+/);
            if (match) return parseInt(match[1]) - 1; // 0-indexed
            node = textNodes.iterateNext();
        }
    } catch (e) {
        console.warn('Could not extract question index', e);
    }
    return null;
}

// Async function to handle question, code, and options extraction
async function handleQuestionExtraction() {
    const { question, code, options } = extractQuestionCodeAndOptions();

    if (!question) {
        return;
    }

    // Send the extracted data to background.js
    // The clicking will be handled by the clickMCQOption message handler
    chrome.runtime.sendMessage({
        action: 'extractData',
        question: question,
        code: code,
        options: options,
        isMCQ: true,
        questionIndex: getExamlyQuestionIndex(),
        _neopassMeta: { trigger: 'alt-shift-a', platform: 'examly' }
    });
}

// Function to extract coding question details
function extractCodingQuestion(isTyped = false) {
    // Extract programming language
    const programmingLanguageElement = document.querySelector('span.inner-text');
    const programmingLanguage = programmingLanguageElement ? programmingLanguageElement.innerText.trim() : 'Programming language not found.';

    // Extract question components
    const questionElement = document.querySelector('div[aria-labelledby="question-data"]');
    const questionText = questionElement ? htmlToText(questionElement) : 'Question not found.';

    const inputFormatElement = document.querySelector('div[aria-labelledby="input-format"]');
    const inputFormatText = inputFormatElement ? htmlToText(inputFormatElement) : '';

    const outputFormatElement = document.querySelector('div[aria-labelledby="output-format"]');
    const outputFormatText = outputFormatElement ? htmlToText(outputFormatElement) : '';

    // Extract sample test cases with robust fallback method
    const testCases = [];

    // Try Method 1: Find test case containers with aria-labelledby="each-tc-card"
    let containers = document.querySelectorAll('div[aria-labelledby="each-tc-card"]');

    if (containers.length > 0) {
        containers.forEach((container) => {
            const inputPre = container.querySelector('div[aria-labelledby="each-tc-input-container"] pre');
            const outputPre = container.querySelector('div[aria-labelledby="each-tc-output-container"] pre');

            if (inputPre && outputPre) {
                testCases.push({
                    input: inputPre.textContent.trim(),
                    output: outputPre.textContent.trim()
                });
            }
        });
    }

    // Try Method 2: Find by aria-labelledby="each-tc-container"
    if (testCases.length === 0) {
        containers = document.querySelectorAll('[aria-labelledby="each-tc-container"]');

        if (containers.length > 0) {
            containers.forEach((container) => {
                const inputPre = container.querySelector('[aria-labelledby="each-tc-input"]');
                const outputPre = container.querySelector('[aria-labelledby="each-tc-output"]');

                if (inputPre && outputPre) {
                    testCases.push({
                        input: inputPre.textContent.trim(),
                        output: outputPre.textContent.trim()
                    });
                }
            });
        }
    }

    // Try Method 3: Find pre elements with Input/Output labels
    if (testCases.length === 0) {
        const allPres = document.querySelectorAll('pre');
        const inputs = [];
        const outputs = [];

        allPres.forEach(pre => {
            const text = pre.textContent.trim();
            const prevElement = pre.previousElementSibling;

            if (prevElement) {
                const labelText = prevElement.textContent.toLowerCase();
                if (labelText.includes('input') && !labelText.includes('output')) {
                    inputs.push(text);
                } else if (labelText.includes('output')) {
                    outputs.push(text);
                }
            }
        });

        // Pair inputs and outputs
        for (let i = 0; i < Math.min(inputs.length, outputs.length); i++) {
            testCases.push({
                input: inputs[i],
                output: outputs[i]
            });
        }
    }

    let testCasesText = '';
    if (testCases.length > 0) {
        testCases.forEach((testCase, index) => {
            testCasesText += `Sample Test Case ${index + 1}:\nInput:\n${testCase.input}\nOutput:\n${testCase.output}\n\n`;
        });
    } else {
        testCasesText = 'No test cases found. Please check the page structure.';
    }

    // Extract whitelist keywords from instruction cards
    let whitelistText = '';
    const instructionCards = document.querySelectorAll('div[aria-labelledby="instruction-card"]');
    instructionCards.forEach(card => {
        const header = card.querySelector('[aria-labelledby="instruction-header"]');
        if (header && header.textContent.trim().toLowerCase().includes('whitelist')) {
            const sets = card.querySelectorAll('[aria-labelledby="list"]');
            sets.forEach(set => {
                const setHeader = set.querySelector('[aria-labelledby="set-header"]');
                const values = set.querySelectorAll('[aria-labelledby="list-value-card"]');
                const keywords = Array.from(values).map(v => v.textContent.trim()).filter(Boolean);
                if (keywords.length > 0) {
                    const setName = setHeader ? setHeader.textContent.trim() : '';
                    whitelistText += (setName ? setName + ' ' : '') + keywords.join(', ') + '\n';
                }
            });
        }
    });
    whitelistText = whitelistText.trim();

    // Extract header and footer snippet code from readonly editors
    let headerSnippet = '';
    let footerSnippet = '';
    const headerEditorEl = document.querySelector('[aria-labelledby="editor-question"][id*="ttHeaderEditor"]');
    const footerEditorEl = document.querySelector('[aria-labelledby="editor-question"][id*="ttFooterEditor"]');
    if (headerEditorEl) {
        const headerLines = headerEditorEl.querySelectorAll('.ace_line');
        headerSnippet = Array.from(headerLines).map(line => line.textContent).join('\n').trim();
    }
    if (footerEditorEl) {
        const footerLines = footerEditorEl.querySelectorAll('.ace_line');
        footerSnippet = Array.from(footerLines).map(line => line.textContent).join('\n').trim();
    }

    // Send data to background.js for querying
    chrome.runtime.sendMessage({
        action: 'extractData',
        programmingLanguage: programmingLanguage,
        question: questionText,
        inputFormat: inputFormatText,
        outputFormat: outputFormatText,
        testCases: testCasesText,
        headerSnippet: headerSnippet,
        footerSnippet: footerSnippet,
        whitelist: whitelistText,
        isCoding: true,
        isTyped: isTyped,
        questionIndex: getExamlyQuestionIndex(),
        _neopassMeta: { trigger: isTyped ? 'alt-shift-t' : 'alt-shift-a', platform: 'examly' }
    }, async (response) => {
        if (response && response.success && response.response) {
            const qNum = getExamlyQuestionIndex() + 1 || "";
            const color = response.isIntercepted ? '#4CAF50' : '#2196F3';
            console.log(`%cQuestion ${qNum} solved`, `color: ${color}; font-weight: bold;`);

            if (isTyped) {
                try {
                    let cleanedResponse = response.response.trim()
                        .replace(/^```[a-z]*\n/, '')
                        .replace(/\n```$/, '');

                    window.dispatchEvent(new CustomEvent('NEOPASS_INSERT_CODE_TYPED', {
                        detail: { code: cleanedResponse }
                    }));
                    console.log('[content.js] Dispatched NEOPASS_INSERT_CODE_TYPED from extractCodingQuestion');
                } catch (e) {
                    console.error('[content.js] Error dispatching typed code:', e);
                }
            }
        }
    });
}

function solveIamneoExamly() {
    // Check if this is a coding question or MCQ
    const codingQuestionElement = document.querySelector('div[aria-labelledby="input-format"]');
    if (codingQuestionElement) {
        extractCodingQuestion(false);
    } else {
        handleQuestionExtraction();
    }
}
document.addEventListener('keydown', (event) => {
    // Use Option (Alt) key on all platforms
    const modifierKey = event.altKey;

    if (modifierKey && event.shiftKey && event.code === 'KeyA') {
        solveIamneoExamly();
    }
});



// Alt+Shift+H: HackerRank solve
document.addEventListener('keydown', (event) => {
    const modifierKey = event.altKey;
    if (modifierKey && event.shiftKey && event.code === 'KeyH') {
        handleHackerRankMCQ('alt-shift-h');
    }
});

// Ctrl+Q: Global MCQ Solver (Solve selection or detect question)
document.addEventListener('keydown', (event) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? event.metaKey : event.ctrlKey;

    if (modifier && event.code === 'KeyQ') {
        const selectedText = window.getSelection().toString().trim();
        if (selectedText) {
            event.preventDefault();
            chrome.runtime.sendMessage({ action: 'solveSelectedText', text: selectedText, _neopassMeta: { trigger: 'ctrl-q', platform: 'generic' } });
        } else {
            // Fallback: Try to solve based on platform detection
            const currentUrl = window.location.href;
            if (currentUrl.includes('examly.io') || currentUrl.includes('iamneo.ai')) {
                event.preventDefault();
                solveIamneoExamly();
            } else if (currentUrl.includes('hackerrank.com')) {
                event.preventDefault();
                handleHackerRankMCQ('ctrl-q');
            } else {
                // Generic detection could go here, but for now we notify
                chrome.runtime.sendMessage({ action: 'showToast', message: 'No text selected. Select the question text and press Ctrl+Q.', isError: true });
            }
        }
    }
});

// Alt+Shift+O: Toggle toast opacity
document.addEventListener('keydown', (event) => {
    const modifierKey = event.altKey;
    if (modifierKey && event.shiftKey && event.code === 'KeyO') {
        chrome.runtime.sendMessage({ action: 'toggleToastOpacity' });
    }
});

// Function to extract code from snippets
function extractSnippets() {
    const headerContainer = Array.from(document.querySelectorAll('div[aria-labelledby="tt-header"]'))
        .find(container => container.innerText.includes('Header Snippet'));
    const footerContainer = Array.from(document.querySelectorAll('div[aria-labelledby="footer"]'))
        .find(container => container.innerText.includes('Footer Snippet'));

    const extractCode = container => {
        if (!container) return '';
        const codeLines = container.querySelectorAll('.ace_line');
        return Array.from(codeLines).map(line => line.textContent).join('\n');
    };

    const snippets = {
        header: extractCode(headerContainer),
        footer: extractCode(footerContainer)
    };

    // Send snippets directly to background.js
    chrome.runtime.sendMessage({
        action: 'processSnippets',
        snippets: snippets
    });
}

// Remove old listener and add new one
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'extractSnippets') {
        extractSnippets();
    }
    if (message.action === 'solveIamneoExamly') {
        solveIamneoExamly();
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'clickMCQOption') {
        const qNum = getExamlyQuestionIndex() + 1 || "";
        const color = request.isIntercepted ? '#4CAF50' : '#2196F3';
        console.log(`%cQuestion ${qNum} solved → "${request.response}"`, `color: ${color}; font-weight: bold;`);

        (async () => {
            try {
                // Check if this is HackerRank
                if (request.isHackerRank) {
                    let clicked = false;

                    // Handle multiple choice questions (checkboxes) differently
                    if (request.isMultipleChoice) {

                        // Enhanced parsing for multiple options
                        // Look for patterns like: "1. text, 3. text" or "A. text, C. text" or "1, 3" or "A, C"
                        const optionNumbers = [];

                        // Pattern 1: "1. text, 3. text" or "A. text, C. text"
                        let matches = request.response.match(/([A-Z]|\d+)\.\s*[^,]+/gi);
                        if (matches) {
                            matches.forEach(match => {
                                const num = match.match(/^([A-Z]|\d+)\./);
                                if (num) {
                                    let optionIndex;
                                    if (isNaN(num[1])) {
                                        // Convert A,B,C to 0,1,2
                                        optionIndex = num[1].charCodeAt(0) - 'A'.charCodeAt(0);
                                    } else {
                                        // Convert 1,2,3 to 0,1,2
                                        optionIndex = parseInt(num[1]) - 1;
                                    }
                                    if (optionIndex >= 0) {
                                        optionNumbers.push(optionIndex);
                                    }
                                }
                            });
                        }

                        // Pattern 2: Simple comma-separated numbers or letters: "1, 3, 5" or "A, C, E"
                        if (optionNumbers.length === 0) {
                            const simpleMatches = request.response.match(/(?:^|[,\s])([A-Z]|\d+)(?=[,\s]|$)/gi);
                            if (simpleMatches) {
                                simpleMatches.forEach(match => {
                                    const cleaned = match.trim().replace(/^[,\s]+|[,\s]+$/g, '');
                                    let optionIndex;
                                    if (isNaN(cleaned)) {
                                        // Convert A,B,C to 0,1,2
                                        optionIndex = cleaned.charCodeAt(0) - 'A'.charCodeAt(0);
                                    } else {
                                        // Convert 1,2,3 to 0,1,2
                                        optionIndex = parseInt(cleaned) - 1;
                                    }
                                    if (optionIndex >= 0) {
                                        optionNumbers.push(optionIndex);
                                    }
                                });
                            }
                        }

                        // Remove duplicates
                        const uniqueOptionNumbers = [...new Set(optionNumbers)];

                        // Click all the selected options for multiple choice
                        const checkboxes = document.querySelectorAll('[role="checkbox"]');
                        if (checkboxes.length > 0) {

                            // Click options with delay to ensure UI state is properly updated
                            for (let i = 0; i < uniqueOptionNumbers.length; i++) {
                                const optionNumber = uniqueOptionNumbers[i];

                                if (optionNumber >= 0 && optionNumber < checkboxes.length) {
                                    const checkbox = checkboxes[optionNumber];

                                    // Wait a bit before checking and clicking each option
                                    await new Promise(resolve => setTimeout(resolve, 300));

                                    // Re-check the current state after delay
                                    const isCurrentlyChecked = checkbox.getAttribute('aria-checked') === 'true' ||
                                        checkbox.getAttribute('data-state') === 'checked' ||
                                        checkbox.checked === true;

                                    // Only click if not already checked
                                    if (!isCurrentlyChecked) {

                                        // Try multiple click methods to ensure it works
                                        checkbox.click();

                                        // Alternative click method - dispatch events directly
                                        checkbox.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                                        checkbox.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                                        checkbox.dispatchEvent(new MouseEvent('click', { bubbles: true }));

                                        // Wait a bit more to let the UI update
                                        await new Promise(resolve => setTimeout(resolve, 200));

                                        // Verify the click worked
                                        const newState = checkbox.getAttribute('aria-checked') === 'true' ||
                                            checkbox.getAttribute('data-state') === 'checked' ||
                                            checkbox.checked === true;

                                        if (newState) {
                                            clicked = true;
                                        } else {

                                            // Retry once more
                                            checkbox.click();
                                            await new Promise(resolve => setTimeout(resolve, 100));

                                            const retryState = checkbox.getAttribute('aria-checked') === 'true' ||
                                                checkbox.getAttribute('data-state') === 'checked' ||
                                                checkbox.checked === true;

                                            if (retryState) {
                                                clicked = true;
                                            }
                                        }
                                    } else {
                                        clicked = true; // Still count as successful
                                    }
                                }
                            }

                            // If no options were found, fall back to single option logic
                            if (uniqueOptionNumbers.length === 0) {
                                const optionMatch = request.response.match(/(?:options?\s*)?([A-Z]|\d+)\.?/i);
                                if (optionMatch) {
                                    let optionNumber;
                                    if (isNaN(optionMatch[1])) {
                                        optionNumber = optionMatch[1].charCodeAt(0) - 'A'.charCodeAt(0);
                                    } else {
                                        optionNumber = parseInt(optionMatch[1]) - 1;
                                    }

                                    if (optionNumber >= 0 && optionNumber < checkboxes.length) {
                                        await new Promise(resolve => setTimeout(resolve, 200));

                                        const checkbox = checkboxes[optionNumber];
                                        const isCurrentlyChecked = checkbox.getAttribute('aria-checked') === 'true' ||
                                            checkbox.getAttribute('data-state') === 'checked' ||
                                            checkbox.checked === true;

                                        if (!isCurrentlyChecked) {
                                            checkbox.click();
                                            clicked = true;
                                        } else {
                                            clicked = true;
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        // Single choice question - use enhanced logic
                        const optionMatch = request.response.match(/(?:options?\s*)?([A-Z]|\d+)\.?/i);
                        if (optionMatch) {
                            let optionNumber;
                            if (isNaN(optionMatch[1])) {
                                // Handle letter options (A, B, C, etc.)
                                optionNumber = optionMatch[1].toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
                            } else {
                                // Handle number options (1, 2, 3, etc.)
                                optionNumber = parseInt(optionMatch[1]) - 1;
                            }

                            // Add a small delay before clicking
                            await new Promise(resolve => setTimeout(resolve, 200));

                            // Direct index-based selection (Examly)
                            const optionIdSelector = `#tt-option-${optionNumber} > label > span.checkmark1`;
                            const optionEl = document.querySelector(optionIdSelector);
                            if (optionEl) {
                                optionEl.dispatchEvent(new Event("click", { bubbles: true }));
                                clicked = true;
                            }

                            if (!clicked) {
                                // 2. Try new layout first - check for radio buttons
                                const newLayoutRadios = document.querySelectorAll('[role="radio"]');
                                if (newLayoutRadios.length > optionNumber && optionNumber >= 0) {
                                    const radio = newLayoutRadios[optionNumber];

                                    // Check if already selected
                                    const isCurrentlyChecked = radio.getAttribute('aria-checked') === 'true' ||
                                        radio.getAttribute('data-state') === 'checked' ||
                                        radio.checked === true;

                                    if (!isCurrentlyChecked) {
                                        radio.click();
                                        clicked = true;
                                    } else {
                                        clicked = true;
                                    }
                                }
                            }
                        }
                    }

                    if (!clicked) {
                        chrome.runtime.sendMessage({
                            action: 'showMCQToast',
                            message: request.response,
                        });
                    }
                } else {
                    // Original logic for other platforms (Examly)
                    const optionMatch = request.response.match(/(?:options?\s*)?(\d+)\.?/i);
                    if (optionMatch) {
                        const optionNumber = parseInt(optionMatch[1]) - 1;
                        // Use exact same selector as Alt+Shift+Q
                        const answerElement = document.querySelector(`#tt-option-${optionNumber} > label > span.checkmark1`);

                        if (answerElement) {
                            answerElement.dispatchEvent(new Event("click", { bubbles: true }));
                        } else {
                            chrome.runtime.sendMessage({
                                action: 'showMCQToast',
                                message: request.response,
                            });
                        }
                    } else {
                        chrome.runtime.sendMessage({
                            action: 'showMCQToast',
                            message: request.response,
                        });
                    }
                }
            } catch (error) {
                chrome.runtime.sendMessage({
                    action: 'showMCQToast',
                    message: request.response,
                });
            }
        })();
    }
});

// Function to extract HackerRank MCQ data (updated for new layout)
function extractHackerRankMCQ() {
    const questions = [];

    // Try new layout first (2024+ layout)
    const newLayoutQuestions = document.querySelectorAll('.QuestionDetails_container__AIu0X');

    if (newLayoutQuestions.length > 0) {
        // New layout processing
        newLayoutQuestions.forEach((container, index) => {
            const questionData = {
                questionNumber: index + 1,
                title: '',
                instruction: '',
                options: [],
                selectedAnswer: null
            };

            // Extract question title from new layout
            const titleElement = container.querySelector('.qaas-block-question-title, h2');
            if (titleElement) {
                // Remove bookmark icon and get clean title
                const titleText = titleElement.textContent || titleElement.innerText;
                questionData.title = titleText.replace(/Bookmark question \d+/g, '').trim();
            }

            // Extract question instruction/content from new layout
            const instructionElement = container.querySelector('.qaas-block-question-instruction, .RichTextPreview_richText__1vKu5');
            if (instructionElement) {
                let instructionText = instructionElement.textContent || instructionElement.innerText;
                instructionText = instructionText.replace(/\s+/g, ' ').trim();
                questionData.instruction = instructionText;
            }

            // Look for options in multiple possible containers
            let optionsContainer = container.nextElementSibling;
            let attempts = 0;
            while (optionsContainer && attempts < 5) {
                // Check for both radio buttons and checkboxes
                const hasOptions = optionsContainer.querySelector('[role="checkbox"], [role="radio"], .ui-radio');
                if (hasOptions) {
                    break;
                }
                optionsContainer = optionsContainer.nextElementSibling;
                attempts++;
            }

            // Also check for options within the same container or nearby
            if (!optionsContainer || !optionsContainer.querySelector('[role="checkbox"], [role="radio"]')) {
                optionsContainer = container.parentElement?.querySelector('.Control_container__F35yA') ||
                    document.querySelector('.Control_container__F35yA');
            }

            if (optionsContainer) {
                // Try radio buttons first (new layout)
                let optionElements = optionsContainer.querySelectorAll('[role="radio"]');

                // If no radio buttons, try checkboxes
                if (optionElements.length === 0) {
                    optionElements = optionsContainer.querySelectorAll('[role="checkbox"]');
                }

                optionElements.forEach((option, optionIndex) => {
                    const labelId = option.getAttribute('aria-labelledby');
                    const labelElement = labelId ? document.getElementById(labelId) :
                        option.closest('.Control_optionList__vIubt, li')?.querySelector('label');

                    if (labelElement) {
                        const optionText = labelElement.textContent.trim();
                        const isChecked = option.getAttribute('aria-checked') === 'true' ||
                            option.getAttribute('data-state') === 'checked';

                        questionData.options.push({
                            value: option.value || optionIndex.toString(),
                            text: optionText,
                            isSelected: isChecked
                        });

                        if (isChecked) {
                            questionData.selectedAnswer = option.value || optionIndex.toString();
                        }
                    }
                });
            }

            // Only add question if it has options (to distinguish from coding questions)
            if (questionData.options.length > 0) {
                questions.push(questionData);
            }
        });
    } else {
        // Fallback to old layout
        const oldLayoutQuestions = document.querySelectorAll('.grouped-mcq__question');

        oldLayoutQuestions.forEach((container, index) => {
            const questionData = {
                questionNumber: index + 1,
                title: '',
                instruction: '',
                options: [],
                selectedAnswer: null
            };

            // Extract question title from old layout
            const titleElement = container.querySelector('.question-view__title');
            if (titleElement) {
                questionData.title = titleElement.textContent.trim();
            }

            // Extract question instruction/content from old layout
            const instructionElement = container.querySelector('.question-view__instruction');
            if (instructionElement) {
                let instructionText = instructionElement.textContent.trim();
                instructionText = instructionText.replace(/\s+/g, ' ').trim();
                questionData.instruction = instructionText;
            }

            // Extract options from old layout
            const optionElements = container.querySelectorAll('.ui-radio');
            optionElements.forEach((option, optionIndex) => {
                const labelElement = option.querySelector('.label');
                const inputElement = option.querySelector('input[type="radio"]');

                if (labelElement && inputElement) {
                    const optionText = labelElement.textContent.trim();
                    const optionValue = inputElement.value;
                    const isChecked = inputElement.checked;

                    questionData.options.push({
                        value: optionValue,
                        text: optionText,
                        isSelected: isChecked
                    });

                    if (isChecked) {
                        questionData.selectedAnswer = optionValue;
                    }
                }
            });

            questions.push(questionData);
        });
    }

    return questions;
}

// Function to extract HackerRank coding question (updated for new layout)
function extractHackerRankCoding() {
    const getCleanText = el => el?.innerText?.trim() || "";

    // Try new layout first (2024+ layout)
    let language = "Unknown";
    let title = "No Title Found";
    let instruction = "No Instructions Found";
    let details = "";
    let starterCode = "";

    // Check for new layout language selector
    const newLanguageSelector = document.querySelector('.select-language .css-3d4y2u-singleValue, .select-language .css-x7738g');
    if (newLanguageSelector) {
        language = getCleanText(newLanguageSelector);
    } else {
        // Fallback to old layout
        language = getCleanText(document.querySelector('.select-language .css-x7738g')) || "Unknown";
    }

    // Try new layout question container
    let container = document.querySelector('.QuestionDetails_container__AIu0X');
    if (container) {
        // New layout
        const titleElement = container.querySelector('.qaas-block-question-title, h2');
        if (titleElement) {
            const titleText = titleElement.textContent || titleElement.innerText;
            title = titleText.replace(/Bookmark question \d+/g, '').trim();
        }

        const instructionElement = container.querySelector('.qaas-block-question-instruction, .RichTextPreview_richText__1vKu5');
        if (instructionElement) {
            instruction = getCleanText(instructionElement);
        }

        // Look for details sections in new layout
        const detailsElements = container.querySelectorAll('details');
        if (detailsElements.length > 0) {
            details = Array.from(detailsElements).map(detail => {
                const summary = getCleanText(detail.querySelector('summary'));
                const content = getCleanText(detail.querySelector('.collapsable-details'));
                return `\n${summary}\n${'-'.repeat(summary.length)}\n${content}`;
            }).join('\n');
        }
    } else {
        // Fallback to old layout
        container = document.querySelector('#main-splitpane-left');
        if (container) {
            title = getCleanText(container.querySelector('.question-view__title')) || "No Title Found";
            instruction = getCleanText(container.querySelector('.question-view__instruction')) || "No Instructions Found";

            details = Array.from(container.querySelectorAll('details') || []).map(detail => {
                const summary = getCleanText(detail.querySelector('summary'));
                const content = getCleanText(detail.querySelector('.collapsable-details'));
                return `\n${summary}\n${'-'.repeat(summary.length)}\n${content}`;
            }).join('\n');
        }
    }

    // Get starter code from Monaco editor (works for both layouts)
    const codeLines = Array.from(document.querySelectorAll('.view-lines .view-line')).map(line =>
        line.innerText
    ).join('\n').trim();

    starterCode = codeLines;

    return {
        language,
        title,
        instruction,
        details,
        starterCode: starterCode
    };
}

// Function to normalize code indentation
function normalizeCodeIndentation(code) {
    if (!code) return code;

    const lines = code.split('\n');

    // Remove empty lines at the beginning and end
    while (lines.length > 0 && lines[0].trim() === '') {
        lines.shift();
    }
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
        lines.pop();
    }

    if (lines.length === 0) return '';

    // Find the minimum indentation (excluding empty lines)
    let minIndent = Infinity;
    for (const line of lines) {
        if (line.trim() !== '') {
            const indent = line.match(/^\s*/)[0].length;
            minIndent = Math.min(minIndent, indent);
        }
    }

    // Remove the common indentation from all lines
    if (minIndent > 0 && minIndent !== Infinity) {
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim() !== '') {
                lines[i] = lines[i].substring(minIndent);
            }
        }
    }

    return lines.join('\n');
}

// Function to insert code into Monaco editor with proper formatting
async function insertCodeIntoMonacoEditor(text) {

    // Normalize the code indentation first
    const normalizedText = normalizeCodeIndentation(text);

    // 1. Try to find Monaco editor instance through the global scope
    if (typeof monaco !== 'undefined' && window.monaco) {
        try {
            const editor = window.monaco.editor.getEditors()[0];
            if (editor) {
                editor.setValue(normalizedText);
                editor.focus();
                return true;
            }
        } catch (error) {
        }
    }

    // 2. Try to access Monaco editor through DOM manipulation
    const monacoEditor = document.querySelector('.monaco-editor');

    if (!monacoEditor) {
        return false;
    }

    try {
        // 3. Focus the editor properly
        const editorTextArea = monacoEditor.querySelector('textarea.inputarea') ||
            monacoEditor.querySelector('textarea') ||
            monacoEditor.querySelector('.monaco-editor-background');

        if (editorTextArea) {
            editorTextArea.focus();
            editorTextArea.click();
        } else {
            monacoEditor.focus();
            monacoEditor.click();
        }

        // 4. Wait a bit for focus to settle
        await new Promise(resolve => setTimeout(resolve, 200));

        // 5. Clear existing content using keyboard shortcuts

        // Use Select All (Cmd+A on macOS, Ctrl+A elsewhere)
        document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'a',
            code: 'KeyA',
            ctrlKey: !window.isMac,
            metaKey: window.isMac,
            bubbles: true
        }));

        await new Promise(resolve => setTimeout(resolve, 100));

        // Use Delete or Backspace to clear
        document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Delete',
            code: 'Delete',
            bubbles: true
        }));

        await new Promise(resolve => setTimeout(resolve, 100));

        // 6. Copy normalized text to clipboard
        await navigator.clipboard.writeText(normalizedText);

        // 7. Paste (Cmd+V on macOS, Ctrl+V elsewhere)
        document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'v',
            code: 'KeyV',
            ctrlKey: !window.isMac,
            metaKey: window.isMac,
            bubbles: true
        }));

        await new Promise(resolve => setTimeout(resolve, 300));

        // 8. Try input event as fallback
        if (editorTextArea) {

            // Set the value directly on the textarea
            editorTextArea.value = normalizedText;

            // Trigger input events
            editorTextArea.dispatchEvent(new Event('input', { bubbles: true }));
            editorTextArea.dispatchEvent(new Event('change', { bubbles: true }));

            // Try to trigger Monaco's internal update
            editorTextArea.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'End',
                code: 'End',
                bubbles: true
            }));
        }

        return true;

    } catch (error) {

        // Final fallback: copy to clipboard
        try {
            await navigator.clipboard.writeText(normalizedText);
        } catch (clipboardError) {
        }

        return false;
    }
}

// Function to handle HackerRank extraction (both MCQ and coding, updated for new layout)
function handleHackerRankMCQ(triggerSource = 'ctrl-q') {
    // Check if it's a coding question first (Monaco editor present)
    const monacoEditor = document.querySelector('.monaco-editor, .hr-monaco-editor');

    // Check for MCQ options specifically (more precise detection)
    const hasRadioOptions = document.querySelector('[role="radio"], [role="radiogroup"]');
    const hasCheckboxOptions = document.querySelector('[role="checkbox"]');
    const hasOldMcqOptions = document.querySelector('.grouped-mcq__question .ui-radio');
    const hasOptionsControl = document.querySelector('.Control_container__F35yA');

    // More precise MCQ detection
    const isMCQ = hasRadioOptions || hasCheckboxOptions || hasOldMcqOptions ||
        (hasOptionsControl && !monacoEditor);

    if (monacoEditor && !isMCQ) {
        // This is definitely a coding question
        const codingData = extractHackerRankCoding();

        if (!codingData.instruction || codingData.instruction === "No Instructions Found") {
            chrome.runtime.sendMessage({
                action: 'showToast',
                message: 'No HackerRank coding question found.',
                isError: true
            });
            return;
        }

        // Format the question for AI
        const questionText = `
Language: ${codingData.language}

Title: ${codingData.title}

Instructions:
${codingData.instruction}

${codingData.details}

Starter Code:
-------------
${codingData.starterCode}
        `.trim();

        // Send the extracted data to background.js
        chrome.runtime.sendMessage({
            action: 'extractData',
            programmingLanguage: codingData.language,
            question: questionText,
            inputFormat: codingData.details,
            outputFormat: '',
            testCases: '',
            isHackerRank: true,
            isCoding: true,
            _neopassMeta: { trigger: triggerSource, platform: 'hackerrank' }
        }, async (response) => {

            if (response && response.success && response.response) {
                try {

                    // Clean the response more thoroughly
                    let cleanedResponse = response.response.trim();

                    // Remove code block delimiters if present (more comprehensive)
                    cleanedResponse = cleanedResponse
                        .replace(/^```[a-zA-Z]*\s*\n/, '')     // Remove opening ``` with optional language
                        .replace(/\n\s*```\s*$/, '')          // Remove closing ``` with optional whitespace
                        .replace(/^```[a-zA-Z]*\s*/, '')      // Remove opening ``` without newline
                        .replace(/\s*```\s*$/, '');           // Remove closing ``` without newline

                    // Remove any leading/trailing whitespace after code block removal
                    cleanedResponse = cleanedResponse.trim();

                    // Insert code into Monaco editor with proper formatting
                    const success = await insertCodeIntoMonacoEditor(cleanedResponse);

                    if (!success) {
                        // If insertion fails, copy to clipboard as fallback
                        await navigator.clipboard.writeText(cleanedResponse);
                        chrome.runtime.sendMessage({
                            action: 'showToast',
                            message: 'Code copied to clipboard.',
                            isError: false
                        });
                    } else {
                        chrome.runtime.sendMessage({
                            action: 'showToast',
                            message: 'Code auto-filled.',
                            isError: false
                        });
                    }
                } catch (error) {
                    chrome.runtime.sendMessage({
                        action: 'showToast',
                        message: 'Error processing response',
                        isError: true
                    });
                }
            }
        });

    } else if (isMCQ) {
        // This is an MCQ question
        const extractedData = extractHackerRankMCQ();

        if (extractedData.length === 0) {
            chrome.runtime.sendMessage({
                action: 'showToast',
                message: 'No HackerRank MCQ questions found.',
                isError: true
            });
            return;
        }

        // Process the first question
        const firstQuestion = extractedData[0];

        if (!firstQuestion.instruction && !firstQuestion.title) {
            chrome.runtime.sendMessage({
                action: 'showToast',
                message: 'No question text found.',
                isError: true
            });
            return;
        }

        if (firstQuestion.options.length === 0) {
            chrome.runtime.sendMessage({
                action: 'showToast',
                message: 'No options found for MCQ question.',
                isError: true
            });
            return;
        }

        // Format the question and options for AI with explicit instructions
        const questionText = firstQuestion.title ? `${firstQuestion.title}\n${firstQuestion.instruction}` : firstQuestion.instruction;
        const optionsText = firstQuestion.options.map((option, index) =>
            `Option ${index + 1}: ${option.text}`
        ).join('\n');

        // Detect if this is a multiple choice question (checkboxes) or single choice (radio buttons)
        const hasCheckboxes = document.querySelector('[role="checkbox"]');
        const isMultipleChoice = hasCheckboxes && !document.querySelector('[role="radio"]');

        // Add explicit instruction for multiple choice questions
        let finalQuestionText = questionText;
        if (isMultipleChoice) {
            finalQuestionText = `[MULTIPLE CHOICE QUESTION - SELECT ALL CORRECT OPTIONS]\n\n${questionText}\n\nIMPORTANT: This question allows multiple correct answers. Please respond with ALL correct option numbers separated by commas (e.g., "Options 1, 3, 5" or "1, 3, 5").`;
        } else {
            finalQuestionText = `[SINGLE CHOICE QUESTION - SELECT ONE OPTION]\n\n${questionText}\n\nIMPORTANT: This question allows only ONE correct answer. Please respond with the single correct option number (e.g., "Option 2" or "2").`;
        }

        // Send the extracted data to background.js
        chrome.runtime.sendMessage({
            action: 'extractData',
            question: finalQuestionText,  // Use the enhanced question text
            code: null,
            options: optionsText,
            isHackerRank: true,
            isMCQ: true,
            isMultipleChoice: isMultipleChoice,  // Add flag for multiple choice questions
            _neopassMeta: { trigger: triggerSource, platform: 'hackerrank' }
        }, (response) => {
        });
    } else {
        chrome.runtime.sendMessage({
            action: 'showToast',
            message: 'No HackerRank question found on this page.',
            isError: true
        });
    }
}

// Listen for code request from exam.js (Alt+Shift+T)
window.addEventListener('NEOPASS_REQUEST_CODE_TYPED', function (event) {
    console.log('[content.js] Received NEOPASS_REQUEST_CODE_TYPED event from exam.js');
    extractCodingQuestion(true); // isTyped = true
});

// ============================================
// BATCH SOLVE WORKFLOW (Scrape → Solve → Mark)
// ============================================

// Helper function to get element by XPath
function getElementByXpath(xpath) {
    return document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
    ).singleNodeValue;
}

// Get total number of questions from the question counter
function getTotalQuestions() {
    // Try to find the question counter element: "Question No : X / Y"
    const questionElement = document.querySelector("#content-left > content-left > div > div.t-h-full > testtaking-question > div > div.t-flex.t-items-center.t-justify-between.t-whitespace-nowrap.t-px-10.t-py-8.lg\\:t-py-8.lg\\:t-px-20.t-bg-primary\\/\\[0\\.1\\].t-border-b.t-border-solid.t-border-b-neutral-2.t-min-h-\\[30px\\].lg\\:t-min-h-\\[35px\\].ng-star-inserted > div:nth-child(1) > div > div");

    if (questionElement) {
        const match = questionElement.textContent.match(/Question No : \d+ \/ (\d+)/);
        if (match) {
            return parseInt(match[1]);
        }
    }

    // Fallback: count sidebar buttons
    const sidebarButtons = document.querySelectorAll('div[role="menuitemradio"]');
    return sidebarButtons.length;
}

// Scrape all questions
async function scrapeAll() {
    const questions = [];
    const totalQuestions = getTotalQuestions();

    for (let i = 1; i <= totalQuestions; i++) {
        // Click the sidebar button for question i
        const xpath = `//div[@role='menuitemradio'][normalize-space()='${i}']`;
        const sidebarButton = getElementByXpath(xpath);

        if (sidebarButton) {
            sidebarButton.click();

            // Wait for question to load
            await new Promise(r => setTimeout(r, 600));

            // Use existing selector for question text
            const questionElement = document.querySelector('div[aria-labelledby="question-data"]');
            const questionText = questionElement ? htmlToText(questionElement) : '';

            // Use existing selector for options
            const optionsElements = document.querySelectorAll('div[aria-labelledby="each-option"]');
            const options = [];
            optionsElements.forEach((option, index) => {
                options.push(htmlToText(option));
            });

            // Also check for code if present
            const codeLines = [];
            const codeElements = document.querySelectorAll('.ace_layer.ace_text-layer .ace_line');
            codeElements.forEach(line => {
                codeLines.push(line.innerText.trim());
            });
            const codeText = codeLines.length > 0 ? codeLines.join('\n') : null;

            questions.push({
                id: i,
                text: questionText,
                code: codeText,
                options: options
            });
        }
    }

    return questions;
}

async function solveBatch(questions) {

    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
            action: 'batchSolve',
            questions: questions
        }, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            if (response && response.success && response.answers) {
                resolve(response.answers);
            } else if (response && response.error) {
                reject(new Error(response.error));
            } else {
                reject(new Error('Invalid response from batch solve'));
            }
        });
    });
}

// Auto-mark answers
async function markAnswers(answers, isInterceptedBatch = false) {

    for (const answer of answers) {
        // Use the same reliable XPath logic as scrapeAll to find the sidebar button
        const xpath = `//div[@role='menuitemradio'][normalize-space()='${answer.id}']`;
        const sidebarButton = getElementByXpath(xpath);

        if (sidebarButton) {
            // Click the question to load it
            sidebarButton.click();

            // Wait for question to load
            await new Promise(resolve => setTimeout(resolve, 800));

            let clicked = false;

            // 1. Direct index-based mapping
            const optionMatch = answer.answer.match(/(?:Option\s*)?(\d+)/i);
            if (optionMatch) {
                const optionIndex = parseInt(optionMatch[1]) - 1;
                const optionIdSelector = `#tt-option-${optionIndex} > label > span.checkmark1`;
                const answerElement = document.querySelector(optionIdSelector);

                if (answerElement) {
                    answerElement.dispatchEvent(new Event("click", { bubbles: true }));
                    clicked = true;
                }

                // Fallback: Try role="radio" based on index
                if (!clicked) {
                    const radios = document.querySelectorAll('[role="radio"]');
                    if (radios.length > optionIndex && optionIndex >= 0) {
                        radios[optionIndex].click();
                        clicked = true;
                    }
                }
            }

            // 2. Fallback to Text matching
            if (!clicked) {
                const optionsElements = document.querySelectorAll('div[aria-labelledby="each-option"], .option-text, [role="radio"]');
                for (let i = 0; i < optionsElements.length; i++) {
                    const optionText = htmlToText(optionsElements[i]);
                    if (optionText && (optionText === answer.answer || optionText.includes(answer.answer) || answer.answer.includes(optionText))) {
                        // Click the corresponding input/span
                        const clickSelectors = [
                            `#tt-option-${i} > label > span.checkmark1`,
                            `input[type="radio"]`,
                            `span.checkmark1`,
                            `[role="radio"]`
                        ];

                        for (const selector of clickSelectors) {
                            const el = optionsElements[i].querySelector(selector) ||
                                (optionsElements[i].matches(selector) ? optionsElements[i] : null);
                            if (el) {
                                el.dispatchEvent(new Event("click", { bubbles: true }));
                                clicked = true;
                                break;
                            }
                        }
                        if (clicked) break;
                    }
                }
            }

            if (clicked) {
                const color = isInterceptedBatch ? '#4CAF50' : '#2196F3';
                console.log(`%cQuestion ${answer.id} solved`, `color: ${color}; font-weight: bold;`);
            } else {
                console.warn(`Error: Question ${answer.id} not marked`);
            }
        }
    }
}

// Main batch solve workflow
async function startBatchSolveWorkflow() {
    try {
        console.log('Executing batch solve');

        chrome.runtime.sendMessage({
            action: 'showSpinnerToast',
            message: 'Executing Batch Solve'
        });

        // 1. Check for local intercepted data first (Bypass AI completely)
        const interceptedDataResponse = await new Promise(resolve => {
            chrome.runtime.sendMessage({ action: 'getInterceptedData' }, resolve);
        });

        if (interceptedDataResponse && interceptedDataResponse.success && interceptedDataResponse.data) {
            const interceptedData = interceptedDataResponse.data;

            if (interceptedData.mcqs.length > 0 || interceptedData.coding.length > 0) {
                // Scrape all questions in the current section
                const scrapedQuestions = await scrapeAll();
                const validatedAnswers = [];
                let skippedCount = 0;

                // Helper: Decode HTML entities and clean text for accurate matching
                function cleanHtmlText(html) {
                    if (!html) return '';
                    return html.replace(/<[^>]*>?/gm, '') // remove tags
                        .replace(/&nbsp;/g, ' ')
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'")
                        .replace(/&rsquo;/g, "'")
                        .replace(/&lsquo;/g, "'")
                        .replace(/\s+/g, ' ')
                        .trim();
                }

                for (const scraped of scrapedQuestions) {
                    let bestMatch = null;
                    let bestScore = -1;

                    const scrapedQText = cleanHtmlText(scraped.text);
                    const scrapedOptionsStr = scraped.options.join('\n');
                    const scrapedOptionsCleaned = scraped.options.map(opt => cleanHtmlText(opt).toLowerCase());

                    for (let m of interceptedData.mcqs) {
                        let score = 0;
                        if (m.sectionRelativeIndex === (scraped.id - 1)) score += 5; // scraped.id is 1-based

                        const mQText = cleanHtmlText(m.questionText);
                        if (mQText && scrapedQText && (mQText.includes(scrapedQText) || scrapedQText.includes(mQText))) {
                            score += 10;
                        }

                        if (m.optionTexts && m.optionTexts.length > 0) {
                            let optMatchCount = 0;
                            for (let opt of m.optionTexts) {
                                let cleanOpt = cleanHtmlText(opt).toLowerCase();
                                if (cleanOpt && scrapedOptionsCleaned.some(dOpt => dOpt.includes(cleanOpt) || cleanOpt.includes(dOpt))) {
                                    optMatchCount++;
                                }
                            }
                            score += (optMatchCount * 3);
                        }

                        if (score > bestScore && score > 0) {
                            bestScore = score;
                            bestMatch = m;
                        }
                    }

                    if (bestMatch && bestScore >= 5) {
                        const answerText = bestMatch.text || '';
                        const cleanAnswer = cleanHtmlText(answerText).toLowerCase();
                        let domIndex = -1;
                        for (let i = 0; i < scraped.options.length; i++) {
                            const optText = scraped.options[i].trim();
                            const cleanOptText = cleanHtmlText(optText).toLowerCase();
                            if (cleanOptText === cleanAnswer || cleanOptText.includes(cleanAnswer) || cleanAnswer.includes(cleanOptText)) {
                                domIndex = i;
                                break;
                            }
                        }

                        if (domIndex !== -1) {
                            validatedAnswers.push({ id: scraped.id, answer: `Option ${domIndex + 1}` });
                        } else {
                            skippedCount++;
                        }
                    } else {
                        skippedCount++;
                    }
                }

                if (validatedAnswers.length > 0) {
                    await markAnswers(validatedAnswers, true);
                    const msg = skippedCount > 0
                        ? `Batch solve: ${validatedAnswers.length} marked, ${skippedCount} skipped (mismatch)`
                        : `Instant batch solve complete`;
                    chrome.runtime.sendMessage({
                        action: 'showToast',
                        message: msg,
                        isError: false
                    });
                    
                    // Log the successful batch interception to the backend
                    chrome.runtime.sendMessage({
                        action: 'logBatchInterception',
                        count: validatedAnswers.length
                    });

                    return { success: true, message: msg };
                } else {
                    // Fall through to AI batch solve below
                }
            }
        }

        // 2. Fallback to AI Batch solve
        const questions = await scrapeAll();
        if (questions.length === 0) {
            throw new Error('No questions found to scrape');
        }

        // Check available MCQ credits before scraping
        const creditsResponse = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'getMcqCredits' }, (response) => {
                resolve(response || { success: false });
            });
        });

        if (!creditsResponse || !creditsResponse.success) {
            throw new Error('Failed to check MCQ credits');
        }

        const availableCredits = creditsResponse.mcqCredits;

        if (availableCredits <= 0) {
            throw new Error('No MCQ credits available.');
        }

        // Filter out coding questions (only process MCQs)
        let mcqQuestions = questions.filter(q => q.options && q.options.length > 0);

        if (mcqQuestions.length === 0) {
            throw new Error('No MCQ questions found');
        }

        // Limit questions to available credits
        if (mcqQuestions.length > availableCredits) {
            mcqQuestions = mcqQuestions.slice(0, availableCredits);
        }

        // Step 2: Send to AI for batch solving
        const answers = await solveBatch(mcqQuestions);

        // Step 3: Auto-mark the answers
        await markAnswers(answers);

        chrome.runtime.sendMessage({
            action: 'showToast',
            message: `Successfully solved and marked ${answers.length} questions`,
            isError: false,
            detailedInfo: 'The answers have been marked automatically.'
        });

        const remainingMessage = mcqQuestions.length < questions.filter(q => q.options && q.options.length > 0).length
            ? ` (limited to ${mcqQuestions.length} due to available credits)`
            : '';

        return { success: true, message: `Successfully solved and marked ${answers.length} questions${remainingMessage}` };
    } catch (error) {
        console.error('[Batch Solve] Error:', error);
        return { success: false, error: error.message };
    }
}

// Listen for messages from popup/worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'startBatchSolve') {
        startBatchSolveWorkflow().then(result => {
            sendResponse(result);
        });
        return true; // Keep message channel open for async response
    }
});


