// Credits display and real-time update listener

/**
 * Display account information in the account panel.
 * @param {Object} account - Account data object
 * @param {string} account.username - The username to display
 * @param {number} [account.mcqCredits] - MCQ credits remaining
 * @param {number} [account.codingCredits] - Coding credits remaining
 */
export function displayAccountInfo(account) {
    document.getElementById('accountUsername').textContent = account.username;

    // Display MCQ credits (always yellow)
    const mcqCreditsElement = document.getElementById('accountMcqCredits');
    if (mcqCreditsElement) {
        const mcqCredits = account.mcqCredits !== undefined ? account.mcqCredits : 0;
        mcqCreditsElement.textContent = mcqCredits.toLocaleString();
    }

    // Display Coding credits (always blue)
    const codingCreditsElement = document.getElementById('accountCodingCredits');
    if (codingCreditsElement) {
        const codingCredits = account.codingCredits !== undefined ? account.codingCredits : 0;
        codingCreditsElement.textContent = codingCredits.toLocaleString();
    }
}

/**
 * Initialize the chrome.storage.onChanged listener for real-time credit updates.
 * Updates credit displays whenever mcqCreditsRemaining or codingCreditsRemaining change.
 */
export function initCreditsListener() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') return;

        // Update MCQ credits if changed
        if (changes.mcqCreditsRemaining) {
            const mcqCreditsElement = document.getElementById('accountMcqCredits');
            if (mcqCreditsElement) {
                const newCredits = changes.mcqCreditsRemaining.newValue || 0;
                mcqCreditsElement.textContent = newCredits.toLocaleString();
                console.log(`[Popup] MCQ credits updated to: ${newCredits}`);
            }
        }

        // Update Coding credits if changed
        if (changes.codingCreditsRemaining) {
            const codingCreditsElement = document.getElementById('accountCodingCredits');
            if (codingCreditsElement) {
                const newCredits = changes.codingCreditsRemaining.newValue || 0;
                codingCreditsElement.textContent = newCredits.toLocaleString();
                console.log(`[Popup] Coding credits updated to: ${newCredits}`);
            }
        }
    });
}
