// Chat feature

import { CONFIG } from '../config.js';
import { getTokens, refreshAccessToken } from '../api/auth.js';
import { makeAuthenticatedRequest } from '../api/request.js';

function safeSendToTab(tabId, payload) {
    try {
        chrome.tabs.sendMessage(tabId, payload, () => {
            if (chrome.runtime.lastError) {
                // No receiver on this tab or tab is not ready; ignore.
            }
        });
    } catch (error) {
        // Ignore send failures (restricted tabs, closed tabs, etc.).
    }
}

function sendChatResponse(tabId, content) {
    safeSendToTab(tabId, { action: "updateChatHistory", role: "assistant", content: content });
}

function sendChatErrorResponse(tabId, content) {
    safeSendToTab(tabId, { action: "updateChatHistory", role: "error", content: content });
}

async function handleChatMessage(message, sender) {
    try {
        const { accessToken, refreshToken } = await getTokens();
        if (!accessToken || !refreshToken) { sendChatErrorResponse(sender.tab.id, "Please login to use chat features. Click the extension icon to login."); return; }
        const chatEndpoint = `${CONFIG.BACKEND_BASE_URL}/api/pro-chat`;
        let response = await makeAuthenticatedRequest(chatEndpoint, "POST", accessToken, { message: message.message, context: message.context });
        if (!response.ok && (response.status === 401 || response.status === 403)) {
            const newAccessToken = await refreshAccessToken(refreshToken);
            if (newAccessToken === 'network_error') { sendChatErrorResponse(sender.tab.id, "Network error. Please check your connection and try again."); return; }
            if (!newAccessToken) { chrome.storage.local.remove(['accessToken', 'refreshToken', 'loggedIn']); sendChatErrorResponse(sender.tab.id, "Session expired. Please log in again."); return; }
            response = await makeAuthenticatedRequest(chatEndpoint, "POST", newAccessToken, { message: message.message, context: message.context });
            if (!response.ok && (response.status === 401 || response.status === 403)) { chrome.storage.local.remove(['accessToken', 'refreshToken', 'loggedIn']); sendChatErrorResponse(sender.tab.id, "Session expired. Please log in again."); return; }
        }
        if (!response.ok) {
            let errorMessage = "Sorry, I encountered an error processing your message.";
            try {
                const errorData = await response.json();
                if (response.status === 429) {
                    if (errorData.error && errorData.error.includes('Token limit exceeded')) { errorMessage = "Token limit exceeded. Please upgrade or wait for your limit to reset."; if (errorData.details) errorMessage += ` (Used: ${errorData.details.used}/${errorData.details.limit})`; }
                    else if (errorData.message && errorData.message.includes('Daily request limit exceeded')) { errorMessage = "You've reached your daily chat limit. Please try again tomorrow."; }
                    else if (errorData.message && errorData.message.includes('wait for your previous request')) { errorMessage = "Please wait for your previous message to be processed before sending another."; }
                    else { errorMessage = "Too many requests. Please wait a moment before trying again."; }
                } else if (response.status === 403) { errorMessage = errorData.message && errorData.message.includes('star') ? "Please star the repository to use the chat feature." : "Access denied. Please check your account status or try logging in again."; }
                else if (response.status === 500) { errorMessage = "The chat service is temporarily unavailable. Please try again in a moment."; }
                else if (response.status === 400) { errorMessage = "Your message couldn't be processed. Try rephrasing or shortening it."; }
                else { errorMessage = errorData.message || `Service error (${response.status}). Please try again.`; }
            } catch (parseError) { errorMessage = `Chat service error (${response.status}). Please try again later.`; }
            sendChatErrorResponse(sender.tab.id, errorMessage); return;
        }
        const data = await response.json();
        if (response.ok && data.success) {
            if (data.tokenRefreshed && data.accessToken) { await chrome.storage.local.set({ accessToken: data.accessToken }); }
            sendChatResponse(sender.tab.id, data.response);
        } else { sendChatErrorResponse(sender.tab.id, `Sorry, ${data.error || "Failed to get a response. Please try again."}`); }
    } catch (error) {
        console.error("Chat processing error:", error);
        let errorMessage = "Sorry, I encountered an error processing your message.";
        if (error.name === 'TypeError' && error.message.includes('fetch')) errorMessage = "Unable to connect to the chat service. Please check your connection and try again.";
        else if (error.message.includes('timeout')) errorMessage = "The request timed out. Please try again.";
        else errorMessage = "Sorry, I encountered an unexpected error. Please try again or log in again if the issue persists.";
        sendChatErrorResponse(sender.tab.id, errorMessage);
    }
}

function registerChatListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "processChatMessage") {
            (async () => {
                try { await handleChatMessage(message, sender); sendResponse({ success: true }); }
                catch (error) { console.error('Chat processing error:', error); sendResponse({ success: false, error: error.message }); }
            })();
            return true;
        }
        return false;
    });
}

export { handleChatMessage, sendChatResponse, sendChatErrorResponse, registerChatListener };
