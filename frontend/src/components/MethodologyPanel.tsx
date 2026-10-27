import React from "react";
import { BookOpen, ShieldCheck, Database, Clock, Calculator, ExternalLink } from "lucide-react";

export const MethodologyPanel: React.FC = () => {
  return (
    <div style={{ padding: "0 24px 24px 24px" }}>
      <div className="chart-card" style={{ margin: "0 0 24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            background: "rgba(59, 130, 246, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <BookOpen size={20} color="#60a5fa" />
          </div>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
              Analytical Methodology & Architectural Specification
            </h2>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
              Formal mathematical definitions, Elexon data integration specs, and look-ahead bias audit procedures
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px" }}>
          {/* Section 1: Data Sources */}
          <div style={{ background: "rgba(15, 23, 42, 0.5)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", color: "var(--accent-cyan)" }}>
              <Database size={18} />
              <h3 style={{ fontSize: "0.9375rem", fontWeight: 600 }}>1. Official Elexon Data Sources</h3>
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "12px" }}>
              Per requirements, analysis is strictly confined to national-level wind generation data from Elexon:
            </p>
            <ul style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.6, paddingLeft: "18px", marginBottom: "12px" }}>
              <li style={{ marginBottom: "6px" }}>
                <strong>Actual Generation:</strong> Elexon <code>FUELHH/stream</code> endpoint.
                Filtered strictly for <code>fuelType == "WIND"</code>.
                Fields: <code>startTime</code> (half-hourly delivery target), <code>generation</code> (MW).
              </li>
              <li>
                <strong>Forecast Generation:</strong> Elexon <code>WINDFOR/stream</code> endpoint.
                National wind generation forecast published by National Grid ESO / NESO.
                Fields: <code>startTime</code> (delivery target), <code>publishTime</code> (issue timestamp), <code>generation</code> (MW).
              </li>
            </ul>
            <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
              <a
                href="https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: "0.75rem", color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: "4px", textDecoration: "none" }}
              >
                FUELHH Docs <ExternalLink size={12} />
              </a>
              <a
                href="https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: "0.75rem", color: "var(--accent-cyan)", display: "flex", alignItems: "center", gap: "4px", textDecoration: "none" }}
              >
                WINDFOR Docs <ExternalLink size={12} />
              </a>
            </div>
          </div>

          {/* Section 2: Look-Ahead Bias Prevention */}
          <div style={{ background: "rgba(15, 23, 42, 0.5)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", color: "var(--accent-emerald)" }}>
              <Clock size={18} />
              <h3 style={{ fontSize: "0.9375rem", fontWeight: 600 }}>2. Day-Ahead Decision Cutoff & Look-Ahead Bias</h3>
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "10px" }}>
              In real electricity trading, market purchase decisions for delivery day <em>D</em> must be executed on day <em>D-1</em> (e.g. at 12:00 UK local time before gate closure).
            </p>
            <div style={{ background: "rgba(0, 0, 0, 0.3)", padding: "10px 14px", borderRadius: "6px", fontFamily: "JetBrains Mono, monospace", fontSize: "0.75rem", color: "#38bdf8", marginBottom: "10px" }}>
              Decision Cutoff Instant = Local(D - 1, cutoff_time).astimezone(UTC)
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              <strong>Audit Policy:</strong> Any forecast published after this decision instant is marked ineligible and strictly excluded from primary paired metrics. The latest vintage published at or prior to the cutoff is selected.
            </p>
          </div>

          {/* Section 3: Mathematical Formulations */}
          <div style={{ background: "rgba(15, 23, 42, 0.5)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", color: "var(--accent-amber)" }}>
              <Calculator size={18} />
              <h3 style={{ fontSize: "0.9375rem", fontWeight: 600 }}>3. Mathematical Accuracy Formulations</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
              <div>
                <strong>Mean Absolute Error (MAE):</strong>
                <div className="font-mono" style={{ background: "rgba(0,0,0,0.3)", padding: "6px 10px", borderRadius: "4px", color: "#f8fafc", margin: "4px 0" }}>
                  MAE = (1 / N) * &sum; |F_i - A_i|
                </div>
              </div>
              <div>
                <strong>Root Mean Squared Error (RMSE):</strong>
                <div className="font-mono" style={{ background: "rgba(0,0,0,0.3)", padding: "6px 10px", borderRadius: "4px", color: "#f8fafc", margin: "4px 0" }}>
                  RMSE = &radic;((1 / N) * &sum; (F_i - A_i)&sup2;)
                </div>
              </div>
              <div>
                <strong>Forecast Bias:</strong>
                <div className="font-mono" style={{ background: "rgba(0,0,0,0.3)", padding: "6px 10px", borderRadius: "4px", color: "#f8fafc", margin: "4px 0" }}>
                  Bias = (1 / N) * &sum; (F_i - A_i)
                </div>
              </div>
              <div>
                <strong>Weighted Absolute Percentage Error (WAPE):</strong>
                <div className="font-mono" style={{ background: "rgba(0,0,0,0.3)", padding: "6px 10px", borderRadius: "4px", color: "#f8fafc", margin: "4px 0" }}>
                  WAPE = (&sum; |F_i - A_i| / &sum; A_i) * 100%
                </div>
                <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)" }}>
                  If &sum; A_i == 0, returns null rather than dividing by zero.
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Resolution & Completeness Transparency */}
          <div style={{ background: "rgba(15, 23, 42, 0.5)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", color: "#a78bfa" }}>
              <ShieldCheck size={18} />
              <h3 style={{ fontSize: "0.9375rem", fontWeight: 600 }}>4. Resolution & Empirical Findings</h3>
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "10px" }}>
              During ingestion of the genuine January 2026 Elexon datasets, an empirical characteristic of the data was identified:
            </p>
            <ul style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.6, paddingLeft: "18px" }}>
              <li style={{ marginBottom: "6px" }}>
                <strong>FUELHH</strong> provides 1,488 half-hour actual outturn records (31 days &times; 48 settlement periods).
              </li>
              <li style={{ marginBottom: "6px" }}>
                <strong>WINDFOR</strong> is published by National Grid ESO at 1-hour resolution (744 distinct delivery start hours in January).
              </li>
              <li>
                In strict accordance with project requirements ("Use exact timestamps for matching. Do not round timestamps in ways that can merge different delivery intervals. Do not interpolate missing values in primary accuracy metrics"), primary metrics evaluate the 744 matched intervals (100% of hourly intervals). The half-hour intervals are transparently reported as missing forecast data rather than fabricated.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
