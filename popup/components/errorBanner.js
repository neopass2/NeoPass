// Error banner display utility

const errorElement = document.getElementById('error');

/**
 * Show an error/info message in the banner at the top of the popup.
 * Auto-hides after the specified duration.
 * @param {string} message - The message to display
 * @param {number} [duration=5000] - How long to show the message (ms)
 */
export function showError(message, duration = 5000) {
    errorElement.innerText = message;
    errorElement.classList.remove('hidden');
    setTimeout(() => {
        errorElement.innerText = '';
        errorElement.classList.add('hidden');
    }, duration);
}

export function showInfo(message, duration = 5000) {
    showError(message, duration);
}
