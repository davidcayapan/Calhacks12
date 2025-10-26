/**
 * =================================
 * Controller: AI Chat Requests
 * =================================
 * Purpose:
 * - Handle POST requests for /api/chat.
 * - Validate input and invoke the AI service.
 */

const { generateResponse } = require('../services/ai.service');

/**
 * Handles the main chat functionality (the 'Send' button).
 */
exports.chat = async (req, res) => {
    console.log("\n💬 [POST /api/chat] Incoming chat request received...");

    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
        console.log("❌ [Error] Invalid or missing 'prompt' in request body.");
        return res.status(400).json({ error: 'The field "prompt" (string) is required.' });
    }

    console.log("📩 User Prompt:", prompt.slice(0, 80) + (prompt.length > 80 ? "..." : ""));

    try {
        // 1. Call the Gemini service to get the response
        const aiResponse = await generateResponse(prompt);

        // 2. Respond to the frontend
        console.log("✅ [Chat Complete] Sending response.");
        res.json({
            response: aiResponse,
            model: "Gemini"
        });

    } catch (error) {
        console.error("💥 Chat processing failed:", error.message);
        res.status(503).json({
            error: "The AI service is currently unavailable.",
            details: error.message
        });
    }
};
