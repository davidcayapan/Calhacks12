const API_BASE = process.env.APP_API_URL || "http://localhost:3000";

export async function analyzePrompt(prompt, params = {}) {
    try {
        const res = await fetch(`${API_BASE}/api/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, params })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error("Analyze error:", err);
        return { error: true, message: err.message };
    }
}

export async function chatWithLLM(prompt, params = {}) {
    try {
        const res = await fetch(`${API_BASE}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt, params })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error("Chat error:", err);
        return { error: true, message: err.message };
    }
}