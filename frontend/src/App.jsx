import { useRef, useState } from "react";
import "./App.css";
import { analyzePrompt as analyzeAPI } from "./api";

// Robust tip extractor: handles strings or objects; falls back to suggestedPrompt/autofix/default.
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const handleAnalyze = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError("");
    setReport(null);

    try {
      const res = await analyzeAPI(query, { language: "en" });
      const r = res?.report || res;

      // --- Map backend → UI fields (minimal + safe) ---
      const estTokens = r?.metrics?.input?.tokens ?? 0;
      const score = r?.score ?? 0;

      // backend provides kg; UI shows grams
      const co2kg = r?.impact_estimate?.CO2e_kg ?? 0;
      const co2g = Number(co2kg) * 1000;

      // surface energy + water too
      const kWh = r?.impact_estimate?.kWh ?? 0;
      const water_L = r?.impact_estimate?.water_L ?? 0;

      const usageLabel =
        estTokens > 200 ? "Very High Token Usage." :
          estTokens > 100 ? "High Token Usage." :
            estTokens > 40 ? "Moderate Token Usage." :
              "Low Token Usage.";

      // ✅ Correct: handle tips as strings or objects (and fallbacks)
      const tipText = pickTip(r);

      console.log("r", r);

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

      inputRef.current?.focus();
      setTimeout(() => {
        document.getElementById("reportCard")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    } catch (e) {
      console.error(e);
      setError(e.message || "Analyze failed.");
    } finally {
      setLoading(false);
    }
  };

  // ring math for circular gauge (unchanged)
  const size = 140;
  const stroke = 14;
  const rsize = (size - stroke) / 2;
  const C = 2 * Math.PI * rsize;
  const pct = report?.score ?? 0;
  const dash = (pct / 100) * C;

  // Bubble text: use live tip if present; else original greeting
  const bubbleText =
    report?.tipText ||
    "Hi there! I'm Sustaina-Bot. Let’s make your AI queries greener!";

  return (
    <div className="shell">
      {/* Mascot */}
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

      {/* Input panel */}
      <section className="panel">
        <label className="fieldLabel" htmlFor="queryInput">Your Query:</label>
        <div className="inputRow">
          <input
            id="queryInput"
            ref={inputRef}
            className="queryInput"
            type="text"
            placeholder="E.g., What are the long-term effects of deep-sea mining?"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (report) setReport(null);
              if (error) setError("");
            }}
          />
          <button
            className="analyzeBtn"
            onClick={handleAnalyze}
            disabled={!query.trim() || loading}
            aria-label="Analyze"
            title="Analyze"
          >
            <span className="bolt" aria-hidden>
              <svg viewBox="0 0 24 24" width="22" height="22">
                <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" fill="currentColor" />
              </svg>
            </span>
            {loading ? "Analyzing…" : "Analyze"}
          </button>
        </div>
        {error && <div style={{ color: "#f87171", marginTop: 8 }}>{error}</div>}
      </section>

      {/* Report */}
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
              <div className={`severity ${report.estTokens > 200 ? "veryhigh" :
                report.estTokens > 100 ? "high" :
                  report.estTokens > 40 ? "med" : "low"
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
              <div className="metricLabel">
                <span className="stackIcon" aria-hidden>⚡</span>
                Energy (kWh)
              </div>
              <div className="metricValue">{(report.kWh || 0).toFixed(5)}</div>
            </div>

            <div className="metric">
              <div className="metricLabel">
                <span className="stackIcon" aria-hidden>💧</span>
                Water (L)
              </div>
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
    </div>
  );
}
