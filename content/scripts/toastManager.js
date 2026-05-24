// Toast rendering and manager running on the tab context

function removeExistingToast() {
    const toastSelectors = [
        '#neopass-active-toast',
        '#neopass-spinner-toast',
        '#stealth-mode-toast',
        '.neopass-update-toast',
        '#neopass-update-notification',
        '[id*="toast"]',
        '[class*="toast"]'
    ];
    toastSelectors.forEach(selector => {
        const existingToasts = document.querySelectorAll(selector);
        existingToasts.forEach(toast => {
            if (toast && toast.parentNode) {
                toast.classList.remove('neopass-toast-show');
                toast.style.opacity = '0';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.remove();
                    }
                }, 100);
            }
        });
    });
}

function showOpacityLevelToast(msg, opacityValue) {
    removeExistingToast();
    
    const toast = document.createElement('div');
    toast.id = 'neopass-active-toast';
    toast.className = 'neopass-toast';
    toast.style.setProperty('--toast-opacity', opacityValue);
    
    const headerContainer = document.createElement('div');
    headerContainer.className = 'neopass-toast-header neopass-toast-header-center';
    
    const messageContainer = document.createElement('div');
    messageContainer.className = 'neopass-toast-msg-container';
    
    const settingsIcon = document.createElement('span');
    settingsIcon.className = 'neopass-toast-indicator neopass-toast-indicator-info';
    
    const messageText = document.createElement('span');
    messageText.className = 'neopass-toast-text';
    messageText.textContent = msg;
    
    messageContainer.appendChild(settingsIcon);
    messageContainer.appendChild(messageText);
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'neopass-toast-btn neopass-toast-btn-close';
    closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    closeBtn.title = 'Close';
    
    const opacityIndicator = document.createElement('div');
    opacityIndicator.className = 'neopass-toast-opacity-indicator';
    
    function createOpacityBadge(level, text, isActive) {
        const badge = document.createElement('div');
        badge.className = 'neopass-toast-badge' + (isActive ? ' neopass-toast-badge-active' : '');
        badge.textContent = text;
        return badge;
    }
    
    const lowBadge = createOpacityBadge('low', 'Low', opacityValue <= 0.2);
    const mediumBadge = createOpacityBadge('medium', 'Medium', opacityValue > 0.2 && opacityValue < 1.0);
    const highBadge = createOpacityBadge('high', 'High', opacityValue >= 1.0);
    
    opacityIndicator.appendChild(lowBadge);
    opacityIndicator.appendChild(mediumBadge);
    opacityIndicator.appendChild(highBadge);
    
    closeBtn.onclick = function() {
        toast.classList.remove('neopass-toast-show');
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    };
    
    headerContainer.appendChild(messageContainer);
    headerContainer.appendChild(closeBtn);
    toast.appendChild(headerContainer);
    toast.appendChild(opacityIndicator);
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('neopass-toast-show');
        toast.style.opacity = opacityValue;
    }, 10);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.remove('neopass-toast-show');
            toast.style.opacity = '0';
            setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
        }
    }, 3000);
}

function showToast(msg, isError, opacity, detailedInfo) {
    removeExistingToast();
    
    const toast = document.createElement('div');
    toast.id = 'neopass-active-toast';
    toast.className = 'neopass-toast' + (isError ? ' neopass-toast-error' : '');
    toast.style.setProperty('--toast-opacity', opacity);
    
    const headerContainer = document.createElement('div');
    headerContainer.className = 'neopass-toast-header';
    
    const messageContainer = document.createElement('div');
    messageContainer.className = 'neopass-toast-msg-container';
    
    const indicatorDot = document.createElement('span');
    indicatorDot.className = 'neopass-toast-indicator' + (isError ? ' neopass-toast-indicator-error' : ' neopass-toast-indicator-success');
    
    const messageText = document.createElement('span');
    messageText.className = 'neopass-toast-text';
    messageText.textContent = msg;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'neopass-toast-msg-inner';
    messageContent.appendChild(indicatorDot);
    messageContent.appendChild(messageText);
    messageContainer.appendChild(messageContent);
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'neopass-toast-buttons';
    
    const infoBtn = document.createElement('button');
    infoBtn.className = 'neopass-toast-btn neopass-toast-btn-info';
    infoBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    infoBtn.title = 'Show more information';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'neopass-toast-btn neopass-toast-btn-close';
    closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    closeBtn.title = 'Close';
    
    const detailedInfoContainer = document.createElement('div');
    detailedInfoContainer.className = 'neopass-toast-details';
    detailedInfoContainer.textContent = detailedInfo;
    
    let expanded = false;
    
    infoBtn.onclick = function() {
        expanded = !expanded;
        detailedInfoContainer.style.display = expanded ? 'block' : 'none';
        infoBtn.innerHTML = expanded ?
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>' :
            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
        if (expanded) {
            if (hideTimeoutId) { clearTimeout(hideTimeoutId); hideTimeoutId = null; }
        } else {
            hideTimeoutId = setTimeout(() => {
                toast.classList.remove('neopass-toast-show');
                toast.style.opacity = '0';
                setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
            }, 5000);
        }
    };
    
    closeBtn.onclick = function() {
        if (hideTimeoutId) { clearTimeout(hideTimeoutId); hideTimeoutId = null; }
        toast.classList.remove('neopass-toast-show');
        toast.style.opacity = '0';
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
    };
    
    buttonsContainer.appendChild(infoBtn);
    buttonsContainer.appendChild(closeBtn);
    headerContainer.appendChild(messageContainer);
    headerContainer.appendChild(buttonsContainer);
    toast.appendChild(headerContainer);
    toast.appendChild(detailedInfoContainer);
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('neopass-toast-show');
        toast.style.opacity = opacity;
    }, 10);
    
    hideTimeoutId = setTimeout(() => {
        toast.classList.remove('neopass-toast-show');
        toast.style.opacity = '0';
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
    }, 5000);
}

function showStealthToast(msg, stealthEnabled, opacity) {
    removeExistingToast();
    
    const toast = document.createElement('div');
    toast.id = 'neopass-active-toast';
    toast.className = 'neopass-toast';
    toast.style.setProperty('--toast-opacity', opacity);
    
    const headerContainer = document.createElement('div');
    headerContainer.className = 'neopass-toast-header neopass-toast-header-center';
    
    const messageContainer = document.createElement('div');
    messageContainer.className = 'neopass-toast-msg-container';
    
    const indicatorDot = document.createElement('span');
    indicatorDot.className = 'neopass-toast-indicator ' + (stealthEnabled ? 'neopass-toast-indicator-success' : 'neopass-toast-indicator-error');
    
    const messageText = document.createElement('span');
    messageText.className = 'neopass-toast-text ' + (stealthEnabled ? 'neopass-toast-stealth-on' : 'neopass-toast-stealth-off');
    messageText.innerHTML = msg.replace(/\n/g, '<br>');
    
    messageContainer.appendChild(indicatorDot);
    messageContainer.appendChild(messageText);
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'neopass-toast-btn neopass-toast-btn-close';
    closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    closeBtn.title = 'Close';
    
    closeBtn.onclick = function() {
        toast.classList.remove('neopass-toast-show');
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    };
    
    headerContainer.appendChild(messageContainer);
    headerContainer.appendChild(closeBtn);
    toast.appendChild(headerContainer);
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('neopass-toast-show');
        toast.style.opacity = opacity;
    }, 10);
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.remove('neopass-toast-show');
            toast.style.opacity = '0';
            setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
        }
    }, 5000);
}

function showMCQToast(msg, opacity, detailedInfo) {
    removeExistingToast();
    
    const isNotMCQ = msg.toLowerCase().includes("not an mcq");
    const toast = document.createElement('div');
    toast.id = 'neopass-active-toast';
    toast.className = 'neopass-toast neopass-toast-mcq';
    toast.style.setProperty('--toast-opacity', opacity);
    
    const headerContainer = document.createElement('div');
    headerContainer.className = 'neopass-toast-header neopass-toast-header-center';
    
    const answerContainer = document.createElement('div');
    answerContainer.className = 'neopass-toast-answer-container';
    
    if (!isNotMCQ) {
        let optionIdentifier = null, optionAnswer = msg;
        const match = msg.match(/^([A-Za-z0-9]{1,3})[.)\s]\s*(.+)$/);
        if (match) { 
            optionIdentifier = match[1].trim(); 
            optionAnswer = match[2].trim(); 
        }
        
        if (optionIdentifier) {
            const isLetter = /^[A-Za-z]{1,3}$/.test(optionIdentifier);
            
            const optionDot = document.createElement('div');
            optionDot.className = 'neopass-toast-option-dot ' + 
                (isLetter ? 'neopass-toast-option-dot-letter' : 'neopass-toast-option-dot-number');
            optionDot.textContent = optionIdentifier.toUpperCase();
            answerContainer.appendChild(optionDot);
        }
        
        const answerText = document.createElement('span');
        answerText.className = 'neopass-toast-text';
        answerText.textContent = optionAnswer;
        answerContainer.appendChild(answerText);
    } else {
        const messageText = document.createElement('span');
        messageText.className = 'neopass-toast-text';
        messageText.textContent = msg;
        answerContainer.appendChild(messageText);
    }
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'neopass-toast-buttons';
    
    const infoSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    const closeSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    const chevronSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>';
    
    const infoBtn = document.createElement('button');
    infoBtn.className = 'neopass-toast-btn neopass-toast-btn-info';
    infoBtn.innerHTML = infoSvg;
    infoBtn.title = 'Show more information';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'neopass-toast-btn neopass-toast-btn-close';
    closeBtn.innerHTML = closeSvg;
    closeBtn.title = 'Close';
    
    const detailedInfoContainer = document.createElement('div');
    detailedInfoContainer.className = 'neopass-toast-details';
    detailedInfoContainer.textContent = isNotMCQ ? 'The selected text does not appear to be a multiple-choice question. Please try selecting a valid MCQ.' : detailedInfo;
    
    let expanded = false;
    let hideTimeoutId = null;
    
    infoBtn.onclick = function() {
        expanded = !expanded;
        detailedInfoContainer.style.display = expanded ? 'block' : 'none';
        infoBtn.innerHTML = expanded ? chevronSvg : infoSvg;
    };
    
    closeBtn.onclick = function() {
        toast.classList.remove('neopass-toast-show');
        toast.style.opacity = '0';
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
    };
    
    buttonsContainer.appendChild(infoBtn);
    buttonsContainer.appendChild(closeBtn);
    headerContainer.appendChild(answerContainer);
    headerContainer.appendChild(buttonsContainer);
    toast.appendChild(headerContainer);
    toast.appendChild(detailedInfoContainer);
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('neopass-toast-show');
        toast.style.opacity = opacity;
    }, 10);
}

function showNPTELToast(msg, isError, opacity, detailedInfo) {
    removeExistingToast();
    
    const toast = document.createElement('div');
    toast.id = 'neopass-active-toast';
    toast.className = 'neopass-toast' + (isError ? ' neopass-toast-error' : '');
    toast.style.setProperty('--toast-opacity', opacity);
    
    const headerContainer = document.createElement('div');
    headerContainer.className = 'neopass-toast-header';
    
    const messageContainer = document.createElement('div');
    messageContainer.className = 'neopass-toast-msg-container';
    
    const indicatorDot = document.createElement('span');
    indicatorDot.className = 'neopass-toast-indicator' + (isError ? ' neopass-toast-indicator-error' : ' neopass-toast-indicator-success');
    
    const messageText = document.createElement('span');
    messageText.className = 'neopass-toast-text';
    messageText.innerHTML = msg.replace(/\n/g, '<br>');
    
    const messageContent = document.createElement('div');
    messageContent.className = 'neopass-toast-msg-inner';
    messageContent.appendChild(indicatorDot);
    messageContent.appendChild(messageText);
    messageContainer.appendChild(messageContent);
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'neopass-toast-buttons';
    
    const infoSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    const closeSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    const chevronSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>';
    
    const infoBtn = document.createElement('button');
    infoBtn.className = 'neopass-toast-btn neopass-toast-btn-info';
    infoBtn.innerHTML = infoSvg;
    infoBtn.title = 'Show more information';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'neopass-toast-btn neopass-toast-btn-close';
    closeBtn.innerHTML = closeSvg;
    closeBtn.title = 'Close';
    
    const detailedInfoContainer = document.createElement('div');
    detailedInfoContainer.className = 'neopass-toast-details';
    detailedInfoContainer.textContent = detailedInfo;
    
    let expanded = false;
    let hideTimeoutId = null;
    
    infoBtn.onclick = function() {
        expanded = !expanded;
        detailedInfoContainer.style.display = expanded ? 'block' : 'none';
        infoBtn.innerHTML = expanded ? chevronSvg : infoSvg;
        if (expanded) {
            if (hideTimeoutId) { clearTimeout(hideTimeoutId); hideTimeoutId = null; }
        } else {
            hideTimeoutId = setTimeout(() => {
                toast.classList.remove('neopass-toast-show');
                toast.style.opacity = '0';
                setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
            }, 5000);
        }
    };
    
    closeBtn.onclick = function() {
        if (hideTimeoutId) { clearTimeout(hideTimeoutId); hideTimeoutId = null; }
        toast.classList.remove('neopass-toast-show');
        toast.style.opacity = '0';
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
    };
    
    buttonsContainer.appendChild(infoBtn);
    buttonsContainer.appendChild(closeBtn);
    headerContainer.appendChild(messageContainer);
    headerContainer.appendChild(buttonsContainer);
    toast.appendChild(headerContainer);
    toast.appendChild(detailedInfoContainer);
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('neopass-toast-show');
        toast.style.opacity = opacity;
    }, 10);
    
    hideTimeoutId = setTimeout(() => {
        toast.classList.remove('neopass-toast-show');
        toast.style.opacity = '0';
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300);
    }, 5000);
}

function showUpdateToast(msg, version) {
    removeExistingToast();
    
    const gradientContainer = document.createElement('div');
    gradientContainer.className = 'neopass-update-notification';
    gradientContainer.id = 'neopass-update-notification';
    
    const toast = document.createElement('div');
    toast.className = 'neopass-update-notification-inner';
    
    const header = document.createElement('div');
    header.className = 'neopass-update-header';
    
    const title = document.createElement('div');
    title.className = 'neopass-update-title';
    title.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;margin-right:8px"><path fill-rule="evenodd" clip-rule="evenodd" d="M4.6109 4.68601C4.72546 4.54406 4.90822 4.47575 5.0878 4.50778L16.575 6.55656C16.6715 6.57377 16.7608 6.61896 16.8318 6.68651L19.3446 9.07676C19.5379 9.26064 19.5528 9.5639 19.3784 9.76583L11.122 19.3268C11.0084 19.4583 10.8347 19.5214 10.6632 19.4935C10.4917 19.4656 10.347 19.3506 10.281 19.1898L4.53742 5.18979C4.46819 5.02103 4.49635 4.82796 4.6109 4.68601ZM6.19646 6.59904L10.4853 17.053L11.2894 10.6786L6.19646 6.59904ZM12.2688 10.9045L11.4468 17.4207L17.7491 10.1226L12.2688 10.9045ZM17.9075 9.08986L13.7298 9.68594L16.4453 7.69901L17.9075 9.08986ZM15.2483 7.33573L6.84451 5.83688L11.8343 9.83381L15.2483 7.33573Z" fill="#A855F7"/></svg><span style="vertical-align:middle;color:#A855F7;font-weight:700">NeoPass Update</span>';
    
    const closeBtn = document.createElement('span');
    closeBtn.className = 'neopass-update-close';
    closeBtn.innerHTML = '&times;';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'neopass-update-message';
    messageDiv.innerHTML = msg.replace('\n', '<br>');
    
    const linksContainer = document.createElement('div');
    linksContainer.className = 'neopass-update-links';
    
    const createLink = (text, url, isPrimary) => {
        const link = document.createElement('a');
        link.href = url;
        link.innerHTML = text;
        link.className = 'neopass-update-link ' + (isPrimary ? 'neopass-update-link-primary' : 'neopass-update-link-secondary');
        return link;
    };
    
    const downloadLink = createLink('Download', 'https://github.com/neopass2/NeoPass/releases/latest/download/NeoPass.zip', true);
    const websiteLink = createLink('Website', 'https://neopassfree.tech', false);
    
    gradientContainer.onclick = (e) => {
        if (e.target === gradientContainer || e.target === toast || e.target === messageDiv) {
            window.open('https://github.com/neopass2/NeoPass/releases/latest');
        }
    };
    
    closeBtn.onclick = (e) => {
        e.stopPropagation();
        gradientContainer.style.animation = 'neopassFadeOut 0.3s ease-out';
        setTimeout(() => gradientContainer.remove(), 280);
        chrome.runtime.sendMessage({ action: "updateDismissed", version: version, timestamp: Date.now() });
    };
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    linksContainer.appendChild(downloadLink);
    linksContainer.appendChild(websiteLink);
    toast.appendChild(header);
    toast.appendChild(messageDiv);
    toast.appendChild(linksContainer);
    gradientContainer.appendChild(toast);
    
    const existingToast = document.getElementById('neopass-update-notification');
    if (existingToast) { existingToast.remove(); }
    document.body.appendChild(gradientContainer);
}

function showSpinnerToast(msg, opacity) {
    removeExistingToast();
    
    const toast = document.createElement('div');
    toast.id = 'neopass-spinner-toast';
    toast.className = 'neopass-toast';
    toast.style.setProperty('--toast-opacity', opacity);
    
    const headerContainer = document.createElement('div');
    headerContainer.className = 'neopass-toast-header neopass-toast-header-center';
    
    const messageContainer = document.createElement('div');
    messageContainer.className = 'neopass-toast-msg-container';
    
    const spinnerDot = document.createElement('span');
    spinnerDot.className = 'neopass-toast-spinner-dot';
    
    const messageText = document.createElement('span');
    messageText.className = 'neopass-toast-text';
    messageText.textContent = msg;
    
    messageContainer.appendChild(spinnerDot);
    messageContainer.appendChild(messageText);
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'neopass-toast-btn neopass-toast-btn-close';
    closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    closeBtn.title = 'Close';
    
    closeBtn.onclick = function() {
        toast.classList.remove('neopass-toast-show');
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    };
    
    headerContainer.appendChild(messageContainer);
    headerContainer.appendChild(closeBtn);
    toast.appendChild(headerContainer);
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('neopass-toast-show');
        toast.style.opacity = opacity;
    }, 10);
}

// Runtime message listener for rendering UI toasts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'RENDER_TOAST') {
        const { toastType, payload } = message;
        if (toastType === 'removeExisting') {
            removeExistingToast();
        } else if (toastType === 'opacityLevel') {
            showOpacityLevelToast(payload.message, payload.opacity);
        } else if (toastType === 'standard') {
            showToast(payload.message, payload.isError, payload.opacity, payload.detailedInfo);
        } else if (toastType === 'stealth') {
            showStealthToast(payload.message, payload.stealthEnabled, payload.opacity);
        } else if (toastType === 'mcq') {
            showMCQToast(payload.message, payload.opacity, payload.detailedInfo);
        } else if (toastType === 'nptel') {
            showNPTELToast(payload.message, payload.isError, payload.opacity, payload.detailedInfo);
        } else if (toastType === 'update') {
            showUpdateToast(payload.message, payload.latestVersion);
        } else if (toastType === 'spinner') {
            showSpinnerToast(payload.message, payload.opacity);
        }
        sendResponse({ success: true });
        return true;
    }
});

// Context invalidation detection for toast manager
// Periodically check if the extension context is still valid
(function detectContextInvalidation() {
    let checkInterval = setInterval(() => {
        try {
            // Attempt a lightweight operation that requires valid context
            if (!chrome.runtime || !chrome.runtime.id) {
                clearInterval(checkInterval);
                showContextInvalidatedToastFromToastManager();
            }
        } catch (e) {
            clearInterval(checkInterval);
            showContextInvalidatedToastFromToastManager();
        }
    }, 5000); // Check every 5 seconds

    function showContextInvalidatedToastFromToastManager() {
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
        title.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:8px;color:#A855F7"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg><span style="vertical-align:middle;color:#A855F7;font-weight:700">Connection Lost</span>';
        
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
        
        document.body.prepend(gradientContainer);
    }
})();
