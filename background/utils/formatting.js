// Pure formatting and parsing utility functions

function formatToastContent(value) {
    if (typeof value === 'string') {
        return value;
    }

    if (value === null || value === undefined) {
        return '';
    }

    if (typeof value === 'object') {
        try {
            return JSON.stringify(value, null, 2);
        } catch (error) {
            return String(value);
        }
    }

    return String(value);
}

function extractJsonArrayFromText(text) {
    if (!text || typeof text !== 'string') {
        return null;
    }

    const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');

    try {
        return JSON.parse(cleaned);
    } catch (error) {
        const startIndex = cleaned.indexOf('[');
        const endIndex = cleaned.lastIndexOf(']');
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            try {
                return JSON.parse(cleaned.slice(startIndex, endIndex + 1));
            } catch (innerError) {
                console.error('Failed to parse JSON array from AI response:', innerError, cleaned);
            }
        }
        return null;
    }
}

// Normalization function to clean up text (used by NPTEL)
function normalizeText(text) {
    return text
        .toLowerCase() // Convert to lowercase
        .replace(/[-]/g, ' ') // Replace dashes with spaces
        .replace(/[^\w\s]/g, '') // Remove all non-word characters (except whitespace)
        .trim(); // Trim leading and trailing spaces
}

export { formatToastContent, extractJsonArrayFromText, normalizeText };
