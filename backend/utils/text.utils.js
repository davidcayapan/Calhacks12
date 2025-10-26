/**
 * ============================
 * Utility: Text Measurement
 * ============================
 * Purpose:
 *  - Simple helper functions for analyzing prompt length and structure.
 *  - These run instantly and require no external dependencies.
 */

// Count total words in text
function wordCount(s = '') {
    return (s.trim().match(/\S+/g) || []).length;
}

// Count number of sentences
function sentenceCount(s = '') {
    return (s.match(/[.!?]+/g) || []).length || (s.trim() ? 1 : 0);
}

// Calculate average words per sentence
function avgSentenceLength(s = '') {
    const w = wordCount(s);
    const c = sentenceCount(s);
    return c ? w / c : 0;
}

// Measure ratio of long words (>= threshold letters)
function longWordRatio(s = '', threshold = 14) {
    const words = (s.trim().match(/\S+/g) || []);
    const long = words.filter(w => w.length >= threshold).length;
    return words.length ? long / words.length : 0;
}

// Roughly estimate tokens (0.75 per word heuristic)
function estimateTokens(text = '') {
    return Math.round(wordCount(text) * 0.75);
}

module.exports = {
    wordCount,
    sentenceCount,
    avgSentenceLength,
    longWordRatio,
    estimateTokens
};
