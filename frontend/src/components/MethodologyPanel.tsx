import { Database, Clock, Calculator, ShieldCheck } from "lucide-react";

export const MethodologyPanel: React.FC = () => {
  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Regulatory & Analytical Methodology</h1>
          <p className="page-subtitle">
            Formal architectural specifications, Elexon BMRS Stream API integration, Gate Closure rules, and zero look-ahead bias audit standards
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <span className="badge-status forecast font-mono">
            BSC Section Q Standard
          </span>
          <span className="badge-status actual font-mono">
            Audited & Verified
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Section 1: Elexon Datasets */}
        <div className="surface-card">
          <div className="surface-card-header">
            <div>
              <h2 className="surface-card-title">
                <Database size={18} color="var(--color-forecast)" />
                1. Official Elexon BMRS Data Sources
              </h2>
              <p className="surface-card-subtitle">
                Analysis is strictly confined to national-level wind generation data from Elexon's Insights Solution
              </p>
            </div>
          </div>

          <div className="grid-2-col">
            <div style={{ background: "var(--bg-canvas)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--color-actual)", fontWeight: 700, fontSize: "0.95rem", marginBottom: "8px" }}>
                <ShieldCheck size={16} />
                Actual Generation Outturn: FUELHH/stream
              </div>
              <ul style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.8, paddingLeft: "18px" }}>
                <li>Filtered strictly for <code>fuelType == 'WIND'</code>.</li>
                <li>Cadence: Half-hourly settlement periods (1,488 records for January 2026).</li>
                <li>Source: Metered generation outturn aggregated across the Great Britain transmission grid.</li>
                <li>Timestamps: Stored in UTC and mapped accurately to UK Local Time (GMT/BST).</li>
              </ul>
            </div>

            <div style={{ background: "var(--bg-canvas)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--color-forecast)", fontWeight: 700, fontSize: "0.95rem", marginBottom: "8px" }}>
                <ShieldCheck size={16} />
                Day-Ahead Forecast: WINDFOR/stream
              </div>
              <ul style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.8, paddingLeft: "18px" }}>
                <li>Broadcast by National Grid ESO (NESO) as continuous streaming forecast revisions.</li>
                <li>Target Resolution: Hourly delivery targets (744 records for January 2026).</li>
                <li>Vintages: 18,080 distinct published forecast runs stored with publish timestamps.</li>
                <li>Exact Matching: Paired strictly with `:00` intervals without artificial synthetic interpolation.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Section 2: Look-Ahead Bias & Cutoff Rules */}
        <div className="surface-card">
          <div className="surface-card-header">
            <div>
              <h2 className="surface-card-title">
                <Clock size={18} color="var(--color-deficit)" />
                2. Day-Ahead Decision Cutoff & Zero Look-Ahead Bias
              </h2>
              <p className="surface-card-subtitle">
                Enforcing wholesale market trading reality across Day-Ahead power auctions (EPEX SPOT UK / N2EX)
              </p>
            </div>
          </div>

          <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.8 }}>
            In the UK electricity wholesale market, utility trading desks finalize and submit power procurement orders during the Day-Ahead auction. Order books close at <strong>12:00 UK Local Time</strong> on the day prior to delivery (day D-1).
            <br /><br />
            To simulate actual trading desk conditions and eliminate <strong>look-ahead bias</strong>, WindLens strictly qualifies only forecast vintages published at or before the decision cutoff instant:
            <div style={{
              margin: "12px 0",
              background: "var(--bg-canvas)",
              padding: "12px 16px",
              borderRadius: "var(--radius-sm)",
              fontFamily: "var(--font-mono)",
              color: "var(--color-forecast)",
              border: "1px solid var(--border-subtle)"
            }}>
              T_cutoff = datetime(delivery_date - 1 day, 12:00 UK Local).astimezone(UTC)
            </div>
            Any forecast published at <code>publishTime &gt; T_cutoff</code> is permanently disqualified from accuracy evaluation.
          </div>
        </div>

        {/* Section 3: Mathematical Accuracy Formulations */}
        <div className="surface-card">
          <div className="surface-card-header">
            <div>
              <h2 className="surface-card-title">
                <Calculator size={18} color="var(--text-white)" />
                3. Mathematical Formulations & Accuracy Metrics
              </h2>
              <p className="surface-card-subtitle">
                Standard paired error definitions calculated exclusively over intervals with verified actuals and eligible forecasts
              </p>
            </div>
          </div>

          <div className="grid-2-col">
            <div style={{ background: "var(--bg-canvas)", padding: "18px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ color: "var(--color-forecast)", fontWeight: 700, fontSize: "0.9rem", marginBottom: "6px" }}>
                MAE (Mean Absolute Error)
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--text-white)", marginBottom: "8px" }}>
                MAE = (1 / N) * Σ |Forecast_i - Actual_i|
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Measures average magnitude of forecast deviation without directional skew. (January 2026 result: <strong>2,002.91 MW</strong>).
              </div>
            </div>

            <div style={{ background: "var(--bg-canvas)", padding: "18px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ color: "var(--color-forecast)", fontWeight: 700, fontSize: "0.9rem", marginBottom: "6px" }}>
                RMSE (Root Mean Squared Error)
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--text-white)", marginBottom: "8px" }}>
                RMSE = √[ (1 / N) * Σ (Forecast_i - Actual_i)² ]
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Quadratic loss metric that heavily penalizes large forecast busts. (January 2026 result: <strong>2,470.08 MW</strong>).
              </div>
            </div>

            <div style={{ background: "var(--bg-canvas)", padding: "18px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ color: "var(--color-deficit)", fontWeight: 700, fontSize: "0.9rem", marginBottom: "6px" }}>
                Systemic Forecast Bias
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--text-white)", marginBottom: "8px" }}>
                Bias = (1 / N) * Σ (Forecast_i - Actual_i)
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Measures structural over- or under-forecasting. A positive bias of <strong>+1,805.86 MW</strong> reveals systemic over-optimism, causing chronic under-procurement.
              </div>
            </div>

            <div style={{ background: "var(--bg-canvas)", padding: "18px", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ color: "var(--color-forecast)", fontWeight: 700, fontSize: "0.9rem", marginBottom: "6px" }}>
                WAPE (Weighted Absolute Percentage Error)
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--text-white)", marginBottom: "8px" }}>
                WAPE = [ Σ |Forecast_i - Actual_i| / Σ Actual_i ] * 100%
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Volume-weighted percentage error (January 2026 result: <strong>17.29%</strong>). Avoids division-by-zero during low-wind periods.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
