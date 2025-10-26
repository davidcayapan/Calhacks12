import { useMemo, useRef, useState } from "react";
import "./App.css";

export default function App() {
  const [query, setQuery] = useState("");
  const [report, setReport] = useState(null);
  const inputRef = useRef(null);

  // Simple mock model to estimate tokens, score, and CO2e
  const draft = useMemo(() => {
    const text = query.trim();
    if (!text) return null;

    const words = text.split(/\s+/).filter(Boolean).length;

    // --- Mock estimates (not real tokenization or carbon) ---
    const estTokens = Math.max(1, Math.round(words * 1.1));     // ~1.1 tokens/word
    const co2g = estTokens * 0.0003;                             // grams CO2e (mock)
    // Score: shorter prompts = greener. Cap between 5 and 98.
    const score = Math.max(5, Math.min(98, Math.round(100 - (estTokens - 12) * 4)));
    // ---------------------------------------------------------

    let usageLabel = "Low Token Usage.";
    if (estTokens > 40) usageLabel = "High Token Usage.";
    else if (estTokens > 20) usageLabel = "Moderate Token Usage.";

    return {
      words,
      estTokens,
      co2g,
      score,
      usageLabel,
      tip:
        estTokens > 40
          ? "TIP: Try asking a more concise or focused question to significantly reduce token usage."
          : estTokens > 20
          ? "TIP: Consider trimming prefaces and asking for a specific format."
          : "Nice! Focused prompts usually compute and emit less carbon."
    };
  }, [query]);

  const handleAnalyze = () => {
    if (!draft) return;
    setReport(draft);
    // Keep focus in the input for fast iterations
    inputRef.current?.focus();
    // Scroll report into view for small screens
    setTimeout(() => {
      document.getElementById("reportCard")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  // ring math for circular gauge
  const size = 140;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const pct = report?.score ?? 0;
  const dash = (pct / 100) * C;

  return (
    <div className="shell">
      {/* ---- Mascot + speech bubble ---- */}
      <div className="mascotWrap" aria-hidden>
        <div className="bubble">Hi there! I'm Sustaina-Bot. Let’s make your AI queries greener!</div>
        <div className="mascot">
          <div className="eyes">
            <span />
            <span />
          </div>
        </div>
      </div>

      {/* ---- Hero ---- */}
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
          Sustaina-Bot
        </h1>
        <p className="sub">Calculate the token-efficiency and sustainability score of your query.</p>
      </header>

      {/* ---- Input panel ---- */}
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
            }}
          />
          <button
            className="analyzeBtn"
            onClick={handleAnalyze}
            disabled={!query.trim()}
            aria-label="Analyze"
            title="Analyze"
          >
            <span className="bolt" aria-hidden>
              <svg viewBox="0 0 24 24" width="22" height="22">
                <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" fill="currentColor" />
              </svg>
            </span>
            Analyze
          </button>
        </div>
      </section>

      {/* ---- Report ---- */}
      {report && (
        <section id="reportCard" className="reportCard" aria-live="polite">
          <h2 className="reportTitle">Sustainability Report</h2>

          <div className="gaugeRow">
            <div className="gauge">
              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Score ${pct}%`}>
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke="rgba(255,255,255,.08)"
                  strokeWidth={stroke}
                />
                <circle
                  className="gaugeProgress"
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
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
              <div className={`severity ${report.estTokens > 40 ? "high" : report.estTokens > 20 ? "med" : "low"}`}>
                {report.usageLabel}
              </div>
              <p className="tip">{report.tip}</p>
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
                <span className="leafIcon" aria-hidden>
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path d="M19.5 3.5c-7.5 0-12 4.2-14 9.6a7 7 0 0 0 9.9 9c4.8-2.3 8.1-8.1 8.1-15.6 0-1.3-.9-3-4-3Z" fill="currentColor" />
                  </svg>
                </span>
                Est. CO2e (grams)
              </div>
              <div className="metricValue red">{report.co2g.toFixed(5)}</div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
