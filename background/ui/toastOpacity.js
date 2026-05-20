// Toast opacity state management

// Define opacity levels for toast messages
const opacityLevels = {
    high: 1.0,
    medium: 0.5,
    low: 0.2
};

// Default opacity level
let currentOpacityLevel = "high";

// Track active toast element ID
let activeToastId = null;

// Function to toggle and store toast opacity level
async function toggleToastOpacity() {
    // Rotate through opacity levels
    switch (currentOpacityLevel) {
        case "high":
            currentOpacityLevel = "medium";
            break;
        case "medium":
            currentOpacityLevel = "low";
            break;
        case "low":
            currentOpacityLevel = "high";
            break;
        default:
            currentOpacityLevel = "high";
    }

    // Store the new opacity level
    await chrome.storage.local.set({
        'toastOpacityLevel': currentOpacityLevel
    });

    return currentOpacityLevel;
}

// Get the current toast opacity value
async function getToastOpacity() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['toastOpacityLevel'], (result) => {
            if (result.toastOpacityLevel) {
                currentOpacityLevel = result.toastOpacityLevel;
            }
            resolve(opacityLevels[currentOpacityLevel] || 1.0);
        });
    });
}

// Initialize opacity level from storage
function initOpacityFromStorage() {
    chrome.storage.local.get(['toastOpacityLevel'], (result) => {
        if (result.toastOpacityLevel) {
            currentOpacityLevel = result.toastOpacityLevel;
        }
    });
}

export { opacityLevels, currentOpacityLevel, activeToastId, toggleToastOpacity, getToastOpacity, initOpacityFromStorage };
