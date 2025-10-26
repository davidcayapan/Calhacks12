import { useRef, useState } from "react";
import "./App.css";
import { analyzePrompt as analyzeAPI, chatWithLLM } from "./api";

// Robust tip extractor: handles strings or objects; fallbacks if needed.
function pickTip(report) {
    const arr = report?.tips;
    if (Array.isArray(arr) && arr.length > 0) {
        const first = arr[0];
        if (typeof first === "string") return first.trim();
        if (first && typeof first === "object") {
            const t = (first.text || first.description || "").trim();
            if (t) return t;
        }
    }
    if (typeof report?.suggestedPrompt === "string" && report.suggestedPrompt.trim()) {
        return `Try this: ${report.suggestedPrompt.trim()}`;
    }
    const af = report?.autofixes?.[0];
    const afText = (af?.prompt || af?.text || af?.value || "").trim();
    if (afText) return `Suggested rewrite: ${afText}`;
    return "Tip: Ask for concise, structured output (e.g., 3 bullets or JSON) and set a hard length cap.";
}

export default function App() {
    const [query, setQuery] = useState("");
    const [report, setReport] = useState(null);   // flattened for UI
    const [messages, setMessages] = useState([]); // {role:'user'|'assistant', content:string}[]
    const [loadingAnalyze, setLoadingAnalyze] = useState(false);
    const [loadingSend, setLoadingSend] = useState(false);
    const [error, setError] = useState("");
    const inputRef = useRef(null);
    const chatRef = useRef(null);

    const handleAnalyze = async () => {
        const text = query.trim();
        if (!text || loadingAnalyze || loadingSend) return;

        setLoadingAnalyze(true);
        setError("");
        setReport(null);

        try {
            const res = await analyzeAPI(text, { language: "en" });
            const r = res?.report || res;

            const estTokens = r?.metrics?.input?.tokens ?? 0;
            const score = r?.score ?? 0;

            // backend gives kg; UI shows grams
            const co2kg = r?.impact_estimate?.CO2e_kg ?? 0;
            const co2g = Number(co2kg) * 1000;

            const kWh = r?.impact_estimate?.kWh ?? 0;
            const water_L = r?.impact_estimate?.water_L ?? 0;

            const usageLabel =
                estTokens > 200 ? "Very High Token Usage." :
                    estTokens > 100 ? "High Token Usage." :
                        estTokens > 40 ? "Moderate Token Usage." :
                            "Low Token Usage.";

            const tipText = pickTip(r);

            setReport({
                score,
                estTokens,
                co2g,
                kWh,
                water_L,
                usageLabel,
                tipText,
                _raw: r
            });

            // Scroll the report into view (above the input)
            setTimeout(() => {
                document.getElementById("reportCard")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 0);
        } catch (e) {
            console.error(e);
            setError(e.message || "Analyze failed.");
        } finally {
            setLoadingAnalyze(false);
            inputRef.current?.focus();
        }
    };

    const handleSend = async () => {
        const text = query.trim();
        if (!text || loadingSend || loadingAnalyze) return;

        setLoadingSend(true);
        setError("");
        setReport(prev => prev); // keep last report visible

        // Push user message
        setMessages(prev => [...prev, { role: "user", content: text }]);
        setQuery("");

        try {
            const res = await chatWithLLM(text, { temperature: 0.3 });
            const reply = (res?.response ?? "").toString();
            setMessages(prev => [...prev, { role: "assistant", content: reply || "(no response)" }]);

            // Scroll chat window to bottom
            setTimeout(() => {
                chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
            }, 0);
        } catch (e) {
            console.error(e);
            setError(e.message || "Send failed.");
        } finally {
            setLoadingSend(false);
            inputRef.current?.focus();
        }
    };

    // Gauge math (unchanged)
    const size = 140;
    const stroke = 14;
    const rsize = (size - stroke) / 2;
    const C = 2 * Math.PI * rsize;
    const pct = report?.score ?? 0;
    const dash = (pct / 100) * C;

    // Green bubble text: live tip if we have a report, else greeting
    const bubbleText =
        report?.tipText ||
        "Hi there! I'm Sustaina-Bot. Let’s make your AI queries greener!";

    return (
        <div className="shell">
            {/* Mascot & tip bubble */}
            <div className="mascotWrap" aria-hidden>
                <div className="bubble">{bubbleText}</div>
                <div className="mascot"><div className="eyes"><span /><span /></div></div>
            </div>

            {/* Hero */}
            <header className="hero">
                <h1 className="brand">
                    <span className="leaf" aria-hidden>
                        <svg viewBox="0 0 24 24" width="32" height="32">
                            <path d="M19.5 3.5c-7.5 0-12 4.2-14 9.6a7 7 0 0 0 9.9 9c4.8-2.3 8.1-8.1 8.1-15.6 0-1.3-.9-3-4-3Z" fill="currentColor" />
                        </svg>
                    </span>
                    Sustaina-Bot
                </h1>
                <p className="sub"></p>
            </header>

            {/* Chat window (appears above input; input is at the very bottom) */}
            <section className="chatSection">
                <h2 className="reportTitle">Chat</h2>
                <div className="chatWindow" ref={chatRef} aria-live="polite">
                    {messages.length === 0 ? (
                        <div className="chatEmpty">Start a conversation or run an analysis.</div>
                    ) : (
                        messages.map((m, i) => (
                            <div key={i} className={`chatMsg ${m.role}`}>
                                <div className="chatRole">{m.role === "user" ? "You" : "Sustaina-Bot"}</div>
                                <div className="chatBubble">{m.content}</div>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* Report (kept above the input panel) */}
            {report && (
                <section id="reportCard" className="reportCard" aria-live="polite">
                    <h2 className="reportTitle">Sustainability Report</h2>

                    <div className="gaugeRow">
                        <div className="gauge">
                            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Score ${pct}%`}>
                                <circle cx={size / 2} cy={size / 2} r={rsize} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={stroke} />
                                <circle
                                    className="gaugeProgress"
                                    cx={size / 2} cy={size / 2} r={rsize}
                                    fill="none" stroke="#10b981" strokeWidth={stroke} strokeLinecap="round"
                                    strokeDasharray={`${dash} ${C - dash}`}
                                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                                />
                            </svg>
                            <div className="gaugeCenter">
                                <div className="gaugeValue">{pct}%</div>
                                <div className="gaugeLabel">Score</div>
                            </div>
                        </div>

                        <div className="callout">
                            <div className={`severity ${(report.estTokens ?? 0) > 200 ? "veryhigh" :
                                    (report.estTokens ?? 0) > 100 ? "high" :
                                        (report.estTokens ?? 0) > 40 ? "med" : "low"
                                }`}>
                                {report.usageLabel}
                            </div>
                            <p className="tip">{report.tipText}</p>
                        </div>
                    </div>

                    <hr className="divider" />

                    <div className="metrics">
                        <div className="metric">
                            <div className="metricLabel">
                                <span className="stackIcon" aria-hidden>
                                    <svg viewBox="0 0 24 24" width="18" height="18">
                                        <path d="M12 2 2 7l10 5 10-5-10-5Zm0 7L2 14l10 5 10-5-10-5Zm0 6-8-4 8-4 8 4-8 4Z" fill="currentColor" />
                                    </svg>
                                </span>
                                Actual Token Count
                            </div>
                            <div className="metricValue green">{report.estTokens}</div>
                        </div>

                        <div className="metric">
                            <div className="metricLabel"><span className="stackIcon" aria-hidden>⚡</span>Energy (kWh)</div>
                            <div className="metricValue">{(report.kWh || 0).toFixed(5)}</div>
                        </div>

                        <div className="metric">
                            <div className="metricLabel"><span className="stackIcon" aria-hidden>💧</span>Water (L)</div>
                            <div className="metricValue">{(report.water_L || 0).toFixed(5)}</div>
                        </div>

                        <div className="metric">
                            <div className="metricLabel">
                                <span className="leafIcon" aria-hidden>
                                    <svg viewBox="0 0 24 24" width="18" height="18">
                                        <path d="M19.5 3.5c-7.5 0-12 4.2-14 9.6a7 7 0 0 0 9.9 9c4.8-2.3 8.1-8.1 8.1-15.6 0-1.3-.9-3-4-3Z" fill="currentColor" />
                                    </svg>
                                </span>
                                Est. CO₂e (grams)
                            </div>
                            <div className="metricValue red">{(report.co2g || 0).toFixed(5)}</div>
                        </div>
                    </div>
                </section>
            )}

            {/* Input panel NOW AT THE BOTTOM with Analyze + Send */}
            <section className="panel" style={{ marginTop: 20 }}>
                <label className="fieldLabel" htmlFor="queryInput">Your Message / Query:</label>
                <div className="inputRow">
                    <input
                        id="queryInput"
                        ref={inputRef}
                        className="queryInput"
                        type="text"
                        placeholder="Type a message for chat, or a prompt to analyze…"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            if (error) setError("");
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                // Enter sends to chat by default
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                    />
                    <div className="btnGroup">
                        <button
                            className="analyzeBtn"
                            onClick={handleAnalyze}
                            disabled={!query.trim() || loadingAnalyze || loadingSend}
                            title="Analyze"
                        >
                            {loadingAnalyze ? "Analyzing…" : "Analyze"}
                        </button>
                        <button
                            className="sendBtn"
                            onClick={handleSend}
                            disabled={!query.trim() || loadingSend || loadingAnalyze}
                            title="Send"
                        >
                            {loadingSend ? "Sending…" : "Send"}
                        </button>
                    </div>
                </div>
                {error && <div style={{ color: "#f87171", marginTop: 8 }}>{error}</div>}
            </section>
        </div>
    );
}
