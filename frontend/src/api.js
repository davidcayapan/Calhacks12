// api.js
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function httpJSON(url, body, opts = {}) {
    const res = await fetch(url, {
        method: opts.method || "POST",
        headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} – ${text || url}`);
    }
    return res.json();
}

export async function analyzePrompt(prompt, params = {}) {
    if (!prompt || typeof prompt !== "string") throw new Error("prompt is required");
    const data = await httpJSON(`${API_BASE}/api/analyze`, { prompt, params });
    // Expected shape: { prompt, report }
    if (!data?.report) throw new Error("Backend did not return report");
    return data;
}

export async function analyzeDemo() {
    const res = await fetch(`${API_BASE}/api/analyze/demo`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function chatWithLLM(prompt, params = {}) {
    const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, params })
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} – ${text}`);
    }
    return res.json();
}
