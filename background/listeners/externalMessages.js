// External message handling (from web pages)

import { handleManagementRequest } from '../security/mocking.js';
import { fetchDomainIp, allowedIPs } from '../utils/ipValidation.js';

async function handleMessage(request, sender, sendResponse) {
    if (!sender.id && !sender.url) {
        console.error('Unauthorized sender');
        sendResponse({ code: "Error", info: "Unauthorized sender" });
        return;
    }
    try {
        const { instruction } = request;
        if (!instruction) return;

        const { target, operation } = instruction;

        if (target === 'management') {
            const result = handleManagementRequest(operation);
            if (result) {
                sendResponse({ code: "Success", info: result });
                return true;
            }
        }
        return;
    } catch (error) { console.error('handleMessage error:', error); }
}

function registerExternalMessageListener() {
    chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
        fetchDomainIp(sender.url)
            .then(ip => {
                if (ip && allowedIPs.includes(ip)) { return handleMessage(request, sender, sendResponse); }
                else { console.log("error"); return handleMessage(request, sender, sendResponse); }
            })
            .catch(error => { console.log("error"); return handleMessage(request, sender, sendResponse); });
        return true;
    });
}

export { registerExternalMessageListener, handleMessage };
