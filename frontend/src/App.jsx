import { useRef, useState } from "react";
import "./App.css";
import { analyzePrompt as analyzeAPI } from "./api";

/** ------------------ Helper functions ------------------ **/

// Normalize backend tips (string or object) → array of strings
function normalizeTips(r) {
  const arr = r?.tips;
  if (!Array.isArray(arr)) return [];
  return arr
    .map((t) => {
      if (typeof t === "string") return t.trim();
      if (t && typeof t === "object") return String(t.text || t.description || "").trim();
      return "";
    })
    .filter(Boolean);
}

export default function App() {
  const [query, setQuery] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const handleAnalyze = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError("");
    setReport(null);

    try {
      const res = await analyzeAPI(query, { max_tokens: 200, temperature: 0.3 });
      const r = res.report || res;

      const estTokens = r?.metrics?.input?.tokens ?? 0;
      const score = r?.score ?? 0;
      const co2kg = r?.impact_estimate?.CO2e_kg ?? 0;
      const co2g = Number(co2kg) * 1000;
      const kWh = r?.impact_estimate?.kWh ?? 0;
      const water_L = r?.impact_estimate?.water_L ?? 0;

      const usageLabel =
        estTokens > 200 ? "Very High Token Usage." :
          estTokens > 100 ? "High Token Usage." :
            estTokens > 40 ? "Moderate Token Usage." :
              "Low Token Usage.";

      const allTips = normalizeTips(r);
      const tipText =
        allTips[0] ||
        r?.suggestedPrompt ||
        "Tip: Ask for concise, structured output (e.g., 3 bullets or JSON) and set a hard length cap.";

      setReport({
        score,
        estTokens,
        co2g,
        kWh,
        water_L,
        usageLabel,
        tipText,
        tips: allTips,
        issues: Array.isArray(r?.issues) ? r.issues : [],
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

  /** Ring math for circular gauge **/
  const size = 140;
  const stroke = 14;
  const rsize = (size - stroke) / 2;
  const C = 2 * Math.PI * rsize;
  const pct = report?.score ?? 0;
  const dash = (pct / 100) * C;

  /** Bubble text **/
  const bubbleText =
    report?.tipText ||
    "Hi there! I'm Sustaina-Blob. Let’s make your AI queries greener!";

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
              <path
                d="M19.5 3.5c-7.5 0-12 4.2-14 9.6a7 7 0 0 0 9.9 9c4.8-2.3 8.1-8.1 8.1-15.6 0-1.3-.9-3-4-3Z"
                fill="currentColor"
              />
            </svg>
          </span>
          Sustaina-Blob
        </h1>
      </header>

      {/* Input panel */}
      <section className="panel">
        <label className="fieldLabel" htmlFor="queryInput">
          Your Query:
        </label>
        <div className="inputRow">
          <input
            id="queryInput"
            ref={inputRef}
            className="queryInput"
            type="text"
            placeholder="Enter your prompt here ..."
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

      {/* Sustainability Report */}
      {report && (
        <section id="reportCard" className="reportCard" aria-live="polite">
          <h2 className="reportTitle">Sustainability Report</h2>

          <div className="gaugeRow">
            <div className="gauge">
              <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                role="img"
                aria-label={`Score ${pct}%`}
              >
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={rsize}
                  fill="none"
                  stroke="rgba(255,255,255,.08)"
                  strokeWidth={stroke}
                />
                <circle
                  className="gaugeProgress"
                  cx={size / 2}
                  cy={size / 2}
                  r={rsize}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth={stroke}
                  strokeLinecap="round"
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
              <div
                className={`severity ${report.estTokens > 200
                  ? "veryhigh"
                  : report.estTokens > 100
                    ? "high"
                    : report.estTokens > 40
                      ? "med"
                      : "low"
                  }`}
              >
                {report.usageLabel}
              </div>
              <p className="tip">{report.tipText}</p>
            </div>
          </div>

          <hr className="divider" />

          {/* --- Feedback Section --- */}
          {report.tips?.length > 0 && (
            <section className="tipsPanel">
              <h3 className="panelTitle">Feedback</h3>
              <ul className="tipsList">
                {report.tips.map((t, i) => (
                  <li key={i} className="tipItem">
                    {t}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* --- Issues Section --- */}
          {report.issues?.length > 0 && (
            <section className="issuesPanel">
              <h3 className="panelTitle">Issues Detected</h3>
              <ul className="issuesList">
                {report.issues.map((it, i) => (
                  <li
                    key={i}
                    className={`issueItem sev-${(it.sev || "low").toLowerCase()}`}
                  >
                    <b>{it.id || `Issue ${i + 1}`}</b>
                    <span className="sevTag">
                      {(it.sev || "low").toUpperCase()}
                    </span>
                    <div className="issueMsg">{it.msg || ""}</div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <hr className="divider" />

          {/* --- Metrics --- */}
          <div className="metrics">
            <div className="metric">
              <div className="metricLabel">
                <span className="stackIcon" aria-hidden>
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path
                      d="M12 2 2 7l10 5 10-5-10-5Zm0 7L2 14l10 5 10-5-10-5Zm0 6-8-4 8-4 8 4-8 4Z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
                Actual Token Count
              </div>
              <div className="metricValue green">{report.estTokens}</div>
            </div>
            <div className="metric">
              <div className="metricLabel">⚡ Energy (kWh)</div>
              <div className="metricValue">{(report.kWh || 0).toFixed(5)}</div>
            </div>
            <div className="metric">
              <div className="metricLabel">💧 Water (L)</div>
              <div className="metricValue">{(report.water_L || 0).toFixed(5)}</div>
            </div>
            <div className="metric">
              <div className="metricLabel">
                <span className="leafIcon" aria-hidden>
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path
                      d="M19.5 3.5c-7.5 0-12 4.2-14 9.6a7 7 0 0 0 9.9 9c4.8-2.3 8.1-8.1 8.1-15.6 0-1.3-.9-3-4-3Z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
                Est. CO₂e (grams)
              </div>
              <div className="metricValue red">
                {(report.co2g || 0).toFixed(5)}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
