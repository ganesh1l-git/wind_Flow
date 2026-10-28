import React, { useState } from "react";
import type { AnalysisResponse } from "../types";
import { Sliders } from "lucide-react";

interface ProcurementSimulatorProps {
  data: AnalysisResponse;
}

export const ProcurementSimulator: React.FC<ProcurementSimulatorProps> = ({ data }) => {
  const [selectedIntervalIndex, setSelectedIntervalIndex] = useState<number>(0);
  const [portfolioScalePct, setPortfolioScalePct] = useState<number>(100);

  const matchedIntervals = data.series.filter((s) => s.match_status === "MATCHED");
  const currentInterval = matchedIntervals[selectedIntervalIndex] || matchedIntervals[0];

  const scale = portfolioScalePct / 100;
  const rawDemand = currentInterval?.demand_mw || 32000;
  const demandMw = Math.round(rawDemand * scale);
  const rawForecast = currentInterval?.forecast_generation_mw || 0;
  const forecastWind = Math.round(rawForecast * scale);
  const rawActual = currentInterval?.actual_generation_mw || 0;
  const actualWind = Math.round(rawActual * scale);
  const cashoutPrice = currentInterval?.system_buy_price_gbp || 85;

  const dayAheadBuy = Math.max(0, demandMw - forecastWind);
  const windShortfall = Math.max(0, forecastWind - actualWind);
  const shortfallMwh = Math.round(windShortfall * 0.5);
  const cashoutCostGbp = Math.round(shortfallMwh * cashoutPrice);

  return (
    <div className="simulator-card" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            background: "var(--color-forecast-soft)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Sliders size={20} color="var(--color-forecast)" />
          </div>
          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-white)", margin: 0 }}>
              Procurement & Cashout Simulator
            </h2>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: 0 }}>
              Powered by genuine Elexon INDO Demand outturn and BSC System Buy Prices
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Portfolio Scale:</span>
          {[100, 10, 2].map((pct) => (
            <button
              key={pct}
              className={`btn-secondary ${portfolioScalePct === pct ? "active" : ""}`}
              style={{
                padding: "3px 8px",
                fontSize: "0.72rem",
                background: portfolioScalePct === pct ? "var(--bg-surface-hover)" : "transparent",
                borderColor: portfolioScalePct === pct ? "var(--color-forecast)" : "var(--border-subtle)"
              }}
              onClick={() => setPortfolioScalePct(pct)}
            >
              {pct === 100 ? "100% GB" : `${pct}% Utility`}
            </button>
          ))}
        </div>
      </div>

      {/* Target Interval Selector */}
      <div style={{ marginBottom: "16px" }}>
        <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
          Select Delivery Interval:
        </label>
        <select
          className="select-input"
          style={{ width: "100%", fontSize: "0.82rem", background: "var(--bg-canvas)", border: "1px solid var(--border-subtle)", padding: "8px 12px", borderRadius: "var(--radius-sm)", color: "var(--text-white)" }}
          value={selectedIntervalIndex}
          onChange={(e) => setSelectedIntervalIndex(Number(e.target.value))}
        >
          {matchedIntervals.slice(0, 100).map((int, i) => (
            <option key={int.delivery_start} value={i}>
              {int.delivery_start_uk} (Demand: {Math.round((int.demand_mw || 32000) * scale).toLocaleString()} MW, Forecast: {Math.round((int.forecast_generation_mw || 0) * scale).toLocaleString()} MW, SBP: £{int.system_buy_price_gbp || 85}/MWh)
            </option>
          ))}
        </select>
      </div>

      {/* Simple 3-Box Flow */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "16px" }}>
        <div style={{ background: "var(--bg-canvas)", padding: "14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
          <span style={{ fontSize: "0.7rem", color: "var(--color-forecast)", textTransform: "uppercase", fontWeight: 700 }}>1. Day-Ahead Buy</span>
          <div className="font-mono" style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--color-forecast)", margin: "4px 0" }}>
            {dayAheadBuy.toLocaleString()} MW
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Demand ({demandMw.toLocaleString()} MW) − Forecast ({forecastWind.toLocaleString()} MW)</span>
        </div>

        <div style={{ background: "var(--bg-canvas)", padding: "14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
          <span style={{ fontSize: "0.7rem", color: "var(--color-deficit)", textTransform: "uppercase", fontWeight: 700 }}>2. Delivery Shortfall</span>
          <div className="font-mono" style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--color-deficit)", margin: "4px 0" }}>
            {windShortfall.toLocaleString()} MW
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{shortfallMwh.toLocaleString()} MWh uncontracted deficit</span>
        </div>

        <div style={{ background: "var(--bg-canvas)", padding: "14px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
          <span style={{ fontSize: "0.7rem", color: "var(--color-alert)", textTransform: "uppercase", fontWeight: 700 }}>3. Cashout Penalty</span>
          <div className="font-mono" style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--color-alert)", margin: "4px 0" }}>
            £{cashoutCostGbp.toLocaleString()}
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Settled at £{cashoutPrice}/MWh System Buy Price</span>
        </div>
      </div>
    </div>
  );
};
