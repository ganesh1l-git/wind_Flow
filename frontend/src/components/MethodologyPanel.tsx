import { BookOpen, Database, Clock, Calculator } from "lucide-react";

export const MethodologyPanel: React.FC = () => {
  return (
    <div className="tab-scroll-container">
      <div className="ledger-card" style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* Header */}
        <div className="ledger-toolbar">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <BookOpen size={16} color="var(--color-forecast)" />
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-white)" }}>
              Regulatory & Analytical Methodology Specification
            </span>
          </div>
          <span className="brand-badge">BSC Section Q Standard</span>
        </div>

        {/* Content Body */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Card 1: Elexon Datasets */}
          <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", color: "var(--color-forecast)" }}>
              <Database size={15} />
              <strong style={{ fontSize: "0.8rem", textTransform: "uppercase" }}>1. Primary Data Ingestion (Elexon BMRS Stream API)</strong>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              <div style={{ background: "var(--bg-surface)", padding: "10px", borderRadius: "var(--radius-xs)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ color: "var(--color-actual)", fontWeight: 600, marginBottom: "4px" }}>
                  Actual Wind Outturn: FUELHH/stream
                </div>
                <div>Filter: <code>fuelType == 'WIND'</code></div>
                <div>Cadence: Half-hourly settlement intervals (1,488 records in Jan 2026)</div>
                <div>Source: National Grid ESO outturn generation metering across GB transmission system</div>
              </div>

              <div style={{ background: "var(--bg-surface)", padding: "10px", borderRadius: "var(--radius-xs)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ color: "var(--color-forecast)", fontWeight: 600, marginBottom: "4px" }}>
                  Day-Ahead Forecast: WINDFOR/stream
                </div>
                <div>Stream: Continuous forecast revisions broadcast by National Grid ESO</div>
                <div>Cadence: Hourly resolution targets (744 records in Jan 2026)</div>
                <div>Vintages: 18,080 distinct published forecast runs stored with publish timestamps</div>
              </div>
            </div>
          </div>

          {/* Card 2: Look-Ahead Bias & Cutoff Rules */}
          <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", color: "var(--color-deficit)" }}>
              <Clock size={15} />
              <strong style={{ fontSize: "0.8rem", textTransform: "uppercase" }}>2. Day-Ahead Decision Cutoff & Zero Look-Ahead Bias</strong>
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              In wholesale electricity trading (N2EX / EPEX SPOT UK auctions), Day-Ahead market order submission closes at <strong>12:00 UK Local Time</strong> on day D-1.
              For each target delivery interval on day D, WindLens strictly selects the latest available forecast vintage published at or prior to:
              <div style={{ margin: "6px 0", background: "var(--bg-surface)", padding: "8px 12px", borderRadius: "var(--radius-xs)", fontFamily: "var(--font-mono)", color: "var(--color-forecast)" }}>
                T_cutoff = datetime(D - 1, 12:00 UK Local).astimezone(UTC)
              </div>
              Any forecast published at <code>publishTime &gt; T_cutoff</code> is permanently disqualified. This mathematical boundary ensures 100% reproducible backtests with zero look-ahead bias.
            </div>
          </div>

          {/* Card 3: Mathematical Formulations */}
          <div style={{ background: "var(--bg-panel)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", color: "var(--text-white)" }}>
              <Calculator size={15} />
              <strong style={{ fontSize: "0.8rem", textTransform: "uppercase" }}>3. Accuracy & Imbalance Metrics</strong>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", fontSize: "0.74rem" }}>
              <div style={{ background: "var(--bg-surface)", padding: "10px", borderRadius: "var(--radius-xs)", border: "1px solid var(--border-subtle)" }}>
                <strong style={{ color: "var(--color-forecast)" }}>MAE (Mean Absolute Error):</strong>
                <div style={{ fontFamily: "var(--font-mono)", margin: "4px 0", color: "var(--text-muted)" }}>
                  MAE = (1/N) * Σ |Forecast_i - Actual_i|
                </div>
                <div style={{ color: "var(--text-secondary)" }}>Measures average magnitude of forecast divergence (2,002.91 MW in Jan 2026).</div>
              </div>

              <div style={{ background: "var(--bg-surface)", padding: "10px", borderRadius: "var(--radius-xs)", border: "1px solid var(--border-subtle)" }}>
                <strong style={{ color: "var(--color-forecast)" }}>RMSE (Root Mean Squared Error):</strong>
                <div style={{ fontFamily: "var(--font-mono)", margin: "4px 0", color: "var(--text-muted)" }}>
                  RMSE = √[ (1/N) * Σ (Forecast_i - Actual_i)² ]
                </div>
                <div style={{ color: "var(--text-secondary)" }}>Applies a quadratic penalty to severe forecast misses (2,470.08 MW in Jan 2026).</div>
              </div>

              <div style={{ background: "var(--bg-surface)", padding: "10px", borderRadius: "var(--radius-xs)", border: "1px solid var(--border-subtle)" }}>
                <strong style={{ color: "var(--color-deficit)" }}>Systemic Bias:</strong>
                <div style={{ fontFamily: "var(--font-mono)", margin: "4px 0", color: "var(--text-muted)" }}>
                  Bias = (1/N) * Σ (Forecast_i - Actual_i)
                </div>
                <div style={{ color: "var(--text-secondary)" }}>Positive bias (+1,805.86 MW) indicates severe structural overforecasting, forcing utilities to buy deficit power at cashout.</div>
              </div>

              <div style={{ background: "var(--bg-surface)", padding: "10px", borderRadius: "var(--radius-xs)", border: "1px solid var(--border-subtle)" }}>
                <strong style={{ color: "var(--color-forecast)" }}>WAPE (Volume Weighted Absolute % Error):</strong>
                <div style={{ fontFamily: "var(--font-mono)", margin: "4px 0", color: "var(--text-muted)" }}>
                  WAPE = [ Σ |Forecast_i - Actual_i| / Σ Actual_i ] * 100%
                </div>
                <div style={{ color: "var(--text-secondary)" }}>Volume-weighted percentage error (17.29% for Jan 2026).</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
