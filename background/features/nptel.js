// NPTEL dataset search and matching

import { normalizeText } from '../utils/formatting.js';
import { showNPTELToast } from '../ui/specializedToasts.js';

let dataset = [];

async function loadNptelDataset() {
    try {
        const response = await fetch(chrome.runtime.getURL('data/nptel.json'));
        dataset = await response.json();
        // console.log(`NPTEL dataset loaded: ${dataset.length} questions`);
    } catch (error) {
        console.error('Failed to load NPTEL dataset:', error);
    }
}

function levenshteinDistance(s1, s2) {
    const dp = Array(s1.length + 1).fill(null).map(() => Array(s2.length + 1).fill(0));
    for (let i = 0; i <= s1.length; i++) {
        for (let j = 0; j <= s2.length; j++) {
            if (i === 0) dp[i][j] = j;
            else if (j === 0) dp[i][j] = i;
            else dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+(s1[i-1]===s2[j-1]?0:1));
        }
    }
    return dp[s1.length][s2.length];
}

function findAnswer(query) {
    const normalizedQuery = normalizeText(query);
    const bestAnswers = [];
    let smallestDistance = Infinity;
    for (const item of dataset) {
        const normalizedQuestion = normalizeText(item.question);
        const distance = levenshteinDistance(normalizedQuery, normalizedQuestion);
        const threshold = 15;
        if (distance <= threshold) {
            if (distance < smallestDistance) { smallestDistance = distance; bestAnswers.length = 0; bestAnswers.push(item.answer); }
            else if (distance === smallestDistance) { bestAnswers.push(item.answer); }
        }
    }
    return bestAnswers.length > 0 ? bestAnswers : null;
}

function handleNPTEL(result, tabId) {
    const selectedText = typeof result === 'string' ? result.trim() : (result?.result || result?.selectionText || '').trim();
    if (selectedText) {
        const bestAnswers = findAnswer(selectedText);
        if (bestAnswers) {
            if (Array.isArray(bestAnswers) && bestAnswers.length > 0) {
                const uniqueAnswers = [...new Set(bestAnswers)];
                let answersString;
                if (uniqueAnswers.length > 1) { answersString = 'Could be:\n' + uniqueAnswers.map((answer, index) => `${index + 1}. ${answer}`).join('\n'); }
                else { answersString = uniqueAnswers[0]; }
                showNPTELToast(tabId, answersString);
            } else { showNPTELToast(tabId, 'Answer not found.\nPlease select only the question.', true); }
        } else { showNPTELToast(tabId, 'Answer not found.\nPlease select only the question.', true); }
    } else { showNPTELToast(tabId, 'No text selected', true); }
}

export { dataset, loadNptelDataset, findAnswer, levenshteinDistance, handleNPTEL };
