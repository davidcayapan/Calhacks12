/**
 * =======================================
 * Service: Rule-based Prompt Analyzer
 * =======================================
 * Focus: PROMPT ONLY (no model-specific logic)
 * - LLM-free heuristics
 * - Defensive config merge
 * - Actionable issues, tips, autofixes
 * - Simple impact estimate using a single midpoint coefficient
 */

const config = require('../config'); // expects { rules } or {}
const {
    wordCount,
    sentenceCount,
    avgSentenceLength,
    longWordRatio,
    estimateTokens
} = require('../utils/text.utils');

// ---------- 0) Normalize config defensively ----------
const FALLBACK = {
    thresholds: {
        maxWordsPrompt: 150,
        maxSentencesPrompt: 10,
        longWordLen: 14,
        defaultMaxTokens: 300
    },
    vaguePhrases: [
        "\\b(improve|make (it|this) better|refine|polish|any ideas|your thoughts|enhance)\\b"
    ],
    verbosePhrases: [
        "\\b(in great detail)\\b", "\\b(elaborate on)\\b", "\\b(\\d+-word)\\b"
    ],
    taskKeywords: {
        summarize: "\\b(summarize|tl;dr|shorten|brief)\\b",
        extract: "\\b(extract|pull|list|find fields|json|csv|table)\\b",
        write: "\\b(write|compose|draft|create|essay)\\b",
        code: "\\b(code|function|class|regex|sql|python|javascript)\\b",
        translate: "\\b(translate|into|from)\\b"
    },
    impact: {
        kWh_per_1k_tokens_mid: 0.02,
        grid_kgCO2_per_kWh: 0.35,
        water_L_per_kWh: 1.0
    }
};

const RULES_IN = (config && config.rules && typeof config.rules === 'object') ? config.rules : {};
const rules = {
    thresholds: { ...FALLBACK.thresholds, ...(RULES_IN.thresholds || {}) },
    vaguePhrases: Array.isArray(RULES_IN.vaguePhrases) ? RULES_IN.vaguePhrases : FALLBACK.vaguePhrases,
    verbosePhrases: Array.isArray(RULES_IN.verbosePhrases) ? RULES_IN.verbosePhrases : FALLBACK.verbosePhrases,
    taskKeywords: typeof RULES_IN.taskKeywords === 'object' ? RULES_IN.taskKeywords : FALLBACK.taskKeywords,
    impact: { ...FALLBACK.impact, ...(RULES_IN.impact || {}) }
};

// ---------- 1) Helpers (prompt-only signals) ----------
function detectTask(text) {
    for (const [task, pattern] of Object.entries(rules.taskKeywords)) {
        if (new RegExp(pattern, 'i').test(text)) return task;
    }
    return 'general';
}

function detectLanguage(text) {
    // Cheap heuristic: % ASCII letters
    const ascii = (text.match(/[A-Za-z]/g) || []).length;
    const total = text.replace(/\s/g, '').length || 1;
    return (ascii / total) > 0.85 ? 'en' : 'unknown';
}

function fleschReadingEase(text) {
    const words = (text.trim().match(/\S+/g) || []);
    const S = sentenceCount(text) || 1;
    const W = words.length || 1;
    const syllables = words.reduce((s, w) => s + (w.match(/[aeiouy]+/gi) || []).length, 0) || W;
    const FRE = 206.835 - 1.015 * (W / S) - 84.6 * (syllables / W);
    return Number(FRE.toFixed(1));
}

function countRepeats(text) {
    const toks = (text.toLowerCase().match(/\b[a-z0-9'-]+\b/g) || []);
    const bigrams = new Map();
    for (let i = 0; i < toks.length - 1; i++) {
        const key = toks[i] + ' ' + toks[i + 1];
        bigrams.set(key, (bigrams.get(key) || 0) + 1);
    }
    let repeats = 0;
    bigrams.forEach(v => { if (v >= 3) repeats += 1; });
    return repeats;
}

function hasForcedLength(text) {
    return /\b\d{2,4}\s*-\s*word(s)?\b/i.test(text) || /\b\d{2,4}\s*words\b/i.test(text);
}

function hasFormatInstruction(text) {
    return /\b(json|csv|table|bullets?|outline|headings?)\b/i.test(text);
}

function vaguenessScore(text) {
    const weakVerbs = ['improve', 'optimize', 'enhance', 'refine', 'fix', 'make better', 'help', 'elaborate'];
    const weakAdverbs = ['really', 'very', 'extremely', 'significantly', 'highly'];
    let hits = 0;
    weakVerbs.forEach(v => { if (new RegExp(`\\b${v}\\b`, 'i').test(text)) hits++; });
    weakAdverbs.forEach(a => { if (new RegExp(`\\b${a}\\b`, 'i').test(text)) hits++; });
    return hits; // 0..N
}

// ---------- 2) Main analyzer (PROMPT-ONLY) ----------
function analyzePrompt(prompt, params = {}) {
    console.log("\n🔍 [Analyzer] Start | chars:", (prompt || '').length);

    // 2.1 Basic metrics
    const lang = detectLanguage(prompt);
    const inputWords = wordCount(prompt);
    const inputSentences = sentenceCount(prompt);
    const inputTokens = estimateTokens(prompt);
    const avgLen = avgSentenceLength(prompt);
    const longRatio = longWordRatio(prompt, rules.thresholds.longWordLen);
    const fre = fleschReadingEase(prompt);
    const repeats = countRepeats(prompt);
    const task = detectTask(prompt);

    console.log("📊 [Metrics]");
    console.log("   Lang:", lang, "| Words:", inputWords, "| Sentences:", inputSentences, "| Tokens:", inputTokens);
    console.log("   Avg sentence:", avgLen.toFixed(2), "| Long-word%:", (longRatio * 100).toFixed(1), "| FRE:", fre, "| Repeats:", repeats);
    console.log("   Task:", task);

    // 2.2 Issue detection (prompt-only)
    const issues = [];
    const tips = [];

    if (inputWords > rules.thresholds.maxWordsPrompt) {
        issues.push({ id: 'PROMPT_TOO_LONG', sev: 'med', msg: `Prompt has ${inputWords} words; target ≤ ${rules.thresholds.maxWordsPrompt}.` });
        tips.push('Trim background and keep only necessary facts.');
    }
    if (inputSentences > (rules.thresholds.maxSentencesPrompt || 10)) {
        issues.push({ id: 'TOO_MANY_SENTENCES', sev: 'low', msg: `Contains ${inputSentences} sentences; try ≤ ${rules.thresholds.maxSentencesPrompt}.` });
    }

    const vagueRegexHit = (rules.vaguePhrases || []).some(rx => new RegExp(rx, 'i').test(prompt));
    const vScore = vaguenessScore(prompt);
    if (vagueRegexHit || vScore >= 2) {
        issues.push({ id: 'VAGUE_LANGUAGE', sev: vScore >= 3 ? 'high' : 'med', msg: 'Vague verbs/adverbs likely to trigger retries.' });
        tips.push('Specify audience, exact format, and success criteria to have a more refined.');
    }

    const verboseRegexHit = (rules.verbosePhrases || []).some(rx => new RegExp(rx, 'i').test(prompt));
    if (verboseRegexHit || hasForcedLength(prompt)) {
        issues.push({ id: 'FORCED_VERBOSITY', sev: 'high', msg: 'Avoid word counts / “in great detail”; bound output by structure instead.' });
        tips.push('Ask for an outline, 3 bullets, or JSON keys instead of word counts.');
    }

    if ((inputWords >= 40) && (fre < 40 || longRatio > 0.12)) {
        issues.push({ id: 'READABILITY', sev: 'low', msg: 'Complex phrasing; simpler sentences improve accuracy and reduce retries.' });
    }

    if (task === 'extract' && !hasFormatInstruction(prompt)) {
        issues.push({ id: 'MISSING_SCHEMA', sev: 'med', msg: 'Extraction without format; specify JSON/CSV/table and required keys.' });
    }

    const maxTokens = Number.isFinite(params.max_tokens) ? params.max_tokens : null;
    if (!maxTokens) {
        issues.push({ id: 'NO_MAX_TOKENS', sev: 'high', msg: 'No output cap set; responses may be longer than needed.' });
        tips.push('Looks good! Also, it is also good practice to define output length limit (e.g., max_tokens).');
    }

    if (!hasFormatInstruction(prompt) && (task === 'summarize' || task === 'write')) {
        issues.push({ id: 'MISSING_FORMAT', sev: 'med', msg: 'No format guidance is provided. Try for bullets, outline, or a small paragraph limit.' });
    }

    if (repeats >= 1) {
        issues.push({ id: 'REDUNDANCY', sev: 'low', msg: 'Repeated phrases detected. Tighten wording to reduce processing.' });
    }

    const temp = typeof params.temperature === 'number' ? params.temperature : null;
    if (temp !== null && temp > 0.7 && /^(summarize|extract|translate|code)$/.test(task)) {
        issues.push({ id: 'HIGH_TEMP_DETERMINISTIC', sev: 'med', msg: `Temperature ${temp} high for ${task}; try ≤ 0.3.` });
    }

    // 2.3 Scores
    const weights = { high: 22, med: 11, low: 5 };
    const penalty = issues.reduce((sum, i) => sum + (weights[i.sev] || 0), 0);
    const score = Math.max(0, 100 - Math.min(70, penalty));
    const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D';

    // retry risk (0–1)
    let retryRisk = 0;
    if (issues.find(i => i.id === 'VAGUE_LANGUAGE')) retryRisk += 0.35;
    if (issues.find(i => i.id === 'NO_MAX_TOKENS')) retryRisk += 0.35;
    if (issues.find(i => i.id === 'MISSING_FORMAT')) retryRisk += 0.15;
    if (issues.find(i => i.id === 'HIGH_TEMP_DETERMINISTIC')) retryRisk += 0.15;
    retryRisk = Math.min(1, Number(retryRisk.toFixed(2)));

    console.log("📈 [Scores] →", { score, grade, retryRisk });

    // 2.4 Impact estimate (prompt-only; model-agnostic midpoint)
    const outCap = maxTokens || rules.thresholds.defaultMaxTokens;
    const totalTokens = inputTokens + outCap;
    const kWh = (totalTokens / 1000) * rules.impact.kWh_per_1k_tokens_mid;
    const CO2e_kg = kWh * rules.impact.grid_kgCO2_per_kWh;
    const water_L = kWh * rules.impact.water_L_per_kWh;

    console.log("🌍 [Impact] kWh:", kWh.toFixed(4), "| CO2e_kg:", CO2e_kg.toFixed(4), "| water_L:", water_L.toFixed(4));
    console.log("✅ [Analysis Complete]");

    // 2.5 Autofixes (prompt-only)
    const autofixes = [];
    if (!maxTokens) autofixes.push({ id: 'SET_MAX_TOKENS', diff: { max_tokens: 200 } });
    if (temp !== null && temp > 0.7 && /^(summarize|extract|translate|code)$/.test(task)) {
        autofixes.push({ id: 'LOWER_TEMP', diff: { temperature: 0.3 } });
    }
    if (!hasFormatInstruction(prompt)) {
        autofixes.push({ id: 'ADD_FORMAT_HINT', hint: 'Ask for 3 bullets, or JSON {key:...} with 4 fields.' });
    }

    // 2.6 Suggested rewrite (skeleton based on task)
    let suggestedPrompt = null;
    if (task === 'summarize') {
        suggestedPrompt = "Summarize the text into 3 bullets for a 10-year-old, ≤120 words total.";
    } else if (task === 'extract') {
        suggestedPrompt = "Extract JSON with keys: title, date, author, topic. Keep one object only.";
    } else if (task === 'translate') {
        suggestedPrompt = "Translate into Spanish, neutral tone, ≤120 words. Keep names unchanged.";
    } else if (task === 'code') {
        suggestedPrompt = "Write a Python function with a docstring and one example. ≤40 lines.";
    } else {
        suggestedPrompt = "Answer in 3 concise bullets (≤120 words total).";
    }

    return {
        score,
        grade,
        retryRisk, // 0..1
        metrics: {
            input: {
                lang,
                words: inputWords,
                sentences: inputSentences,
                tokens: inputTokens,
                avgSentence: Number(avgLen.toFixed(2)),
                longWordRatio: Number(longRatio.toFixed(3)),
                fleschReadingEase: fre,
                repeats
            },
            params: {
                max_tokens: maxTokens || null,
                temperature: temp,
                task
            }
        },
        issues,
        tips,
        autofixes,
        impact_estimate: {
            kWh: Number(kWh.toFixed(4)),
            CO2e_kg: Number(CO2e_kg.toFixed(4)),
            water_L: Number(water_L.toFixed(4))
        },
        suggestedPrompt
    };
}

module.exports = { analyzePrompt };
