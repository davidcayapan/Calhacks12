/**
 * ===================================
 * Controller: Analyze Prompt Requests
 * ===================================
 */

const { analyzePrompt } = require('../services/analyzer.service');

/**
 * Analyze a hardcoded demo prompt
 */
exports.analyzeDemo = (_req, res) => {
    const DEMO_PROMPT = "Write an essay about automation";
    console.log("\n🎯 [Demo Route] Analyzing hardcoded prompt...");
    console.log("📩 Prompt:", DEMO_PROMPT);

    const report = analyzePrompt(DEMO_PROMPT, {});
    console.log("✅ [Demo Report Summary] Score:", report.score, "Grade:", report.grade);
    console.log("🪶 Issues Found:", report.issues.length);

    res.json({ prompt: DEMO_PROMPT, report });
};

/**
 * Analyze a user-provided prompt
 */
exports.analyze = (req, res) => {
    console.log("\n🚀 [POST /api/analyze] Incoming request received...");

    const { prompt, params } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
        console.log("❌ [Error] Invalid or missing 'prompt' in request body.");
        return res.status(400).json({ error: 'The field "prompt" (string) is required.' });
    }

    console.log("📩 Prompt received:", prompt.slice(0, 80) + (prompt.length > 80 ? "..." : ""));
    console.log("⚙️ Params:", params || {});

    const report = analyzePrompt(prompt, params || {});
    console.log("✅ [Analysis Complete]");
    console.log("   → Score:", report.score, "| Grade:", report.grade);
    console.log("   → Issues Found:", report.issues.length);
    console.log("   → Estimated Energy (kWh):", report.impact_estimate.kWh);

    res.json({ prompt, report });
};
