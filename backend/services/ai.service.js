/**
 * =====================================
 * Service: Gemini API Communication
 * =====================================
 * Purpose:
 * - Uses the official @google/genai SDK for robust communication.
 * - Authenticates using GEMINI_API_KEY from environment variables.
 * - Applies a System Instruction to guide the AI toward concise, sustainable answers.
 */

const { GoogleGenAI } = require('@google/genai');
const config = require('../config');

/**
 * Sends a prompt to the Gemini API and returns the response.
 * @param {string} prompt - The user's input prompt.
 * @returns {Promise<string>} The AI-generated text response.
 */
async function generateResponse(prompt) {
    // 1. Authentication and Configuration Check
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured in environment variables. Please set it securely on your server.");
    }

    // Initialize the Gemini AI client
    // The SDK automatically reads GEMINI_API_KEY from the environment
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    // Attempt to load AI configuration from rules.json, falling back to safe defaults
    const aiConfig = config.rules.ai_config || {};

    const modelName = aiConfig.modelName || 'gemini-2.5-flash';
    const systemInstruction = aiConfig.systemInstruction ||
        "You are a helpful and highly efficient AI. Always prioritize concise, direct, and token-efficient responses to reduce computational load and digital carbon footprint. State solutions clearly without unnecessary preamble or flourish. If a user asks for a very long response, gently guide them toward breaking it down into smaller, focused queries.";

    console.log(`🤖 [Gemini] Model: ${modelName}`);

    // 2. Build the Request Payload
    const request = {
        model: modelName,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
            systemInstruction: systemInstruction,
            // Maximum output tokens to encourage conciseness
            maxOutputTokens: 500
        }
    };

    // 3. Execute the API Call
    try {
        const response = await ai.models.generateContent(request);

        const text = response.text.trim();

        if (!text) {
            throw new Error("Received empty response from Gemini API.");
        }

        return text;

    } catch (error) {
        // Log the full error to the console for debugging
        console.error("💥 Gemini API Call Failed:", error);

        // Throw a user-friendly error
        throw new Error(`Gemini API call failed. Details: ${error.message || error}`);
    }
}

module.exports = {
    generateResponse,
};
