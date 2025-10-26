/**
 * =================================
 * Controller: AI Chat Requests
 * =================================
 * POST /api/chat
 */

const { generateResponse } = require("../services/ai.service");

// Optional: centralize small limits
const MAX_PROMPT_CHARS = 4000;

exports.chat = async (req, res) => {
    console.log("\n💬 [POST /api/chat] Incoming chat request...");

    // 1) Validate content-type (nice-to-have)
    // if (!req.is("application/json")) {
    //   return res.status(415).json({ error: "Content-Type must be application/json" });
    // }

    // 2) Validate & normalize input
    const body = req.body || {};
    const promptRaw = body.prompt;

    if (typeof promptRaw !== "string") {
        console.log("❌ Invalid or missing 'prompt' (must be string).");
        return res.status(400).json({ error: 'The field "prompt" (string) is required.' });
    }

    const prompt = promptRaw.trim();
    if (!prompt) {
        console.log("❌ 'prompt' is empty after trim.");
        return res.status(400).json({ error: 'The field "prompt" cannot be empty.' });
    }

    if (prompt.length > MAX_PROMPT_CHARS) {
        console.log(`❌ 'prompt' too long: ${prompt.length} chars`);
        return res.status(413).json({ error: `Prompt too long (>${MAX_PROMPT_CHARS} chars).` });
    }

    console.log("📩 User Prompt:", prompt.slice(0, 120) + (prompt.length > 120 ? "..." : ""));

    try {
        // 3) Call the AI service
        const aiResponse = await generateResponse(prompt);

        // 4) Normalize service return shape to what frontend expects
        //    Your frontend expects: { response: string, model: "Gemini" }
        let text = "";
        if (typeof aiResponse === "string") {
            text = aiResponse;
        } else if (aiResponse && typeof aiResponse === "object") {
            // try common fields if your service returns an object
            text =
                aiResponse.response ||
                aiResponse.text ||
                aiResponse.output ||
                JSON.stringify(aiResponse);
        } else {
            text = String(aiResponse ?? "");
        }

        console.log("✅ [Chat Complete] Responding with", text.slice(0, 120) + (text.length > 120 ? "..." : ""));
        return res.json({ response: text, model: process.env.GEMINI_MODEL || "Gemini" });

    } catch (err) {
        const msg = err?.message || String(err);
        console.error("💥 Chat processing failed:", msg);

        // Map some common failure modes to clearer codes/messages
        if (/api[_-]?key/i.test(msg) || /unauthorized/i.test(msg)) {
            return res.status(500).json({ error: "Server misconfiguration: missing/invalid API key." });
        }
        if (/timeout/i.test(msg)) {
            return res.status(504).json({ error: "Upstream model request timed out." });
        }
        if (/bad request|invalid/i.test(msg)) {
            return res.status(502).json({ error: "Upstream model rejected the request." });
        }

        // Fallback: service unavailable
        return res.status(503).json({
            error: "The AI service is currently unavailable.",
            details: msg
        });
    }
};
