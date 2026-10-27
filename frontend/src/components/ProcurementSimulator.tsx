import React, { useState } from "react";
import type { AnalysisResponse } from "../types";
import {
  Sliders,
  AlertTriangle,
  Flame,
  Wind,
  ShieldAlert
} from "lucide-react";

interface ProcurementSimulatorProps {
  data: AnalysisResponse;
}

export const ProcurementSimulator: React.FC<ProcurementSimulatorProps> = ({ data }) => {
  const { metrics } = data;
  const [demandMw, setDemandMw] = useState<number>(30000);
  const [selectedIntervalIndex, setSelectedIntervalIndex] = useState<number>(0);

  const matchedIntervals = data.series.filter((s) => s.match_status === "MATCHED");
  const currentInterval = matchedIntervals[selectedIntervalIndex] || matchedIntervals[0];

  const forecastWind = currentInterval?.forecast_generation_mw || 0;
  const actualWind = currentInterval?.actual_generation_mw || 0;
  const mae = metrics.mae_mw || 2000;

  // Residual Requirement = Demand - Forecast Wind
  const residualProcurement = Math.max(0, demandMw - forecastWind);
  const actualResidual = Math.max(0, demandMw - actualWind);

  // Uncertainty bounds based on empirical MAE
  const highProcurementRisk = Math.max(0, demandMw - Math.max(0, forecastWind - mae));

  return (
    <div className="simulator-card">
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
        <div style={{
          width: "36px",
          height: "36px",
          borderRadius: "8px",
          background: "linear-gradient(135deg, #f59e0b, #ef4444)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <Sliders size={20} color="#ffffff" />
        </div>
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
            Day-Ahead Residual Procurement Decision Simulator
          </h2>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
            Educational scenario model: Evaluating required thermal/market procurement under wind forecast uncertainty
          </p>
        </div>
      </div>

      {/* Prominent Educational Disclaimer */}
      <div style={{
        background: "rgba(245, 158, 11, 0.08)",
        border: "1px solid rgba(245, 158, 11, 0.25)",
        borderRadius: "8px",
        padding: "12px 16px",
        display: "flex",
        alignItems: "flex-start",
        gap: "10px",
        marginBottom: "20px"
      }}>
        <ShieldAlert size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: "2px" }} />
        <div style={{ fontSize: "0.8125rem", color: "#fef3c7", lineHeight: 1.5 }}>
          <strong>MANDATORY EDUCATIONAL NOTICE:</strong> Electricity demand is a user-entered illustrative parameter.
          Actual utility consumer electricity demand data is strictly outside the scope of the Elexon dataset challenge.
          This tool illustrates how forecast wind uncertainty translates directly into residual procurement variance.
        </div>
      </div>

      {/* Controls row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px", marginBottom: "24px" }}>
        {/* Slider */}
        <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "16px 20px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: 600 }}>
              Illustrative Consumer Demand:
            </label>
            <span className="font-mono" style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--accent-cyan)" }}>
              {demandMw.toLocaleString()} MW
            </span>
          </div>
          <input
            type="range"
            className="range-slider"
            min={15000}
            max={45000}
            step={500}
            value={demandMw}
            onChange={(e) => setDemandMw(Number(e.target.value))}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6875rem", color: "var(--text-muted)", marginTop: "4px" }}>
            <span>15,000 MW (Off-Peak)</span>
            <span>30,000 MW (Normal)</span>
            <span>45,000 MW (Winter Peak)</span>
          </div>
        </div>

        {/* Delivery Interval Selector */}
        <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "16px 20px", borderRadius: "10px", border: "1px solid var(--border-color)" }}>
          <label style={{ fontSize: "0.875rem", fontWeight: 600, display: "block", marginBottom: "8px" }}>
            Select Target Delivery Interval to Simulate:
          </label>
          <select
            className="select-input"
            style={{ width: "100%", fontSize: "0.8125rem" }}
            value={selectedIntervalIndex}
            onChange={(e) => setSelectedIntervalIndex(Number(e.target.value))}
          >
            {matchedIntervals.slice(0, 100).map((int, i) => (
              <option key={int.delivery_start} value={i}>
                {int.delivery_start_uk} (Forecast: {int.forecast_generation_mw?.toLocaleString()} MW, Outturn: {int.actual_generation_mw?.toLocaleString()} MW)
              </option>
            ))}
          </select>
          <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginTop: "6px" }}>
            Showing sample from {matchedIntervals.length} matched January 2026 intervals.
          </div>
        </div>
      </div>

      {/* Calculation Formula Banner */}
      <div style={{
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid var(--border-color)",
        borderRadius: "8px",
        padding: "14px 20px",
        marginBottom: "24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        flexWrap: "wrap",
        gap: "16px",
        fontFamily: "JetBrains Mono, monospace",
        fontSize: "0.9375rem"
      }}>
        <div>
          <span style={{ color: "var(--text-muted)" }}>Demand: </span>
          <strong style={{ color: "var(--accent-cyan)" }}>{demandMw.toLocaleString()} MW</strong>
        </div>
        <span style={{ color: "var(--text-muted)" }}>&minus;</span>
        <div>
          <span style={{ color: "var(--text-muted)" }}>Forecast Wind: </span>
          <strong style={{ color: "var(--accent-emerald)" }}>{forecastWind.toLocaleString()} MW</strong>
        </div>
        <span style={{ color: "var(--text-muted)" }}>=</span>
        <div>
          <span style={{ color: "var(--text-muted)" }}>Day-Ahead Residual Procurement: </span>
          <strong style={{ color: "#f59e0b", fontSize: "1.125rem" }}>{residualProcurement.toLocaleString()} MW</strong>
        </div>
      </div>

      {/* Decision Risk Breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
        {/* Nominal Plan */}
        <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid var(--border-color)", borderRadius: "10px", padding: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <Flame size={18} color="#f59e0b" />
            <span style={{ fontSize: "0.8125rem", fontWeight: 600, textTransform: "uppercase", color: "var(--text-secondary)" }}>
              Planned Day-Ahead Procurement
            </span>
          </div>
          <div className="font-mono" style={{ fontSize: "1.75rem", fontWeight: 700, color: "#f59e0b", marginBottom: "4px" }}>
            {residualProcurement.toLocaleString()} MW
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Nominal volume to purchase from day-ahead auction assuming forecast wind is exactly realized.
          </p>
        </div>

        {/* Wind Underperformance Risk */}
        <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(244, 63, 94, 0.3)", borderRadius: "10px", padding: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <AlertTriangle size={18} color="var(--accent-rose)" />
            <span style={{ fontSize: "0.8125rem", fontWeight: 600, textTransform: "uppercase", color: "#fca5a5" }}>
              Underperformance Risk (+1 MAE)
            </span>
          </div>
          <div className="font-mono" style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--accent-rose)", marginBottom: "4px" }}>
            {highProcurementRisk.toLocaleString()} MW
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            If wind underperforms by {mae.toLocaleString()} MW (MAE), additional thermal power required increases to this level.
          </p>
        </div>

        {/* Realized Outturn Comparison */}
        <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "10px", padding: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <Wind size={18} color="var(--accent-emerald)" />
            <span style={{ fontSize: "0.8125rem", fontWeight: 600, textTransform: "uppercase", color: "#6ee7b7" }}>
              Actual Outturn Residual Requirement
            </span>
          </div>
          <div className="font-mono" style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--accent-emerald)", marginBottom: "4px" }}>
            {actualResidual.toLocaleString()} MW
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Actual residual required based on genuine FUELHH wind outturn of {actualWind.toLocaleString()} MW.
          </p>
        </div>
      </div>
    </div>
  );
};
