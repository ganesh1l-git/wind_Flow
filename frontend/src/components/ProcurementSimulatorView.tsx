import React, { useState, useMemo } from "react";
import { Sliders, ShieldCheck, TrendingDown, DollarSign } from "lucide-react";
import type { AnalysisResponse, IntervalRecord } from "../types";

interface ProcurementSimulatorViewProps {
  data: AnalysisResponse;
}

export const ProcurementSimulatorView: React.FC<ProcurementSimulatorViewProps> = ({ data }) => {
  const { series, metrics } = data;

  const [demandMw, setDemandMw] = useState<number>(30000);
  const [cashoutPriceGbp, setCashoutPriceGbp] = useState<number>(85);
  const [selectedIntervalIndex, setSelectedIntervalIndex] = useState<number>(0);

  const matchedSeries = useMemo<IntervalRecord[]>(() => {
    return series.filter((s) => s.match_status === "MATCHED");
  }, [series]);

  // Find peak shortfall interval index
  const peakShortfallIndex = useMemo<number>(() => {
    if (!matchedSeries.length) return 0;
    let maxErr = -1;
    let bestIdx = 0;
    matchedSeries.forEach((item: IntervalRecord, idx: number) => {
      if ((item.error_mw || 0) > maxErr) {
        maxErr = item.error_mw || 0;
        bestIdx = idx;
      }
    });
    return bestIdx;
  }, [matchedSeries]);

  const currentInterval = matchedSeries[selectedIntervalIndex] || matchedSeries[0];

  const forecastWind = currentInterval?.forecast_generation_mw || metrics.avg_forecast_mw || 12000;
  const actualWind = currentInterval?.actual_generation_mw || metrics.avg_actual_mw || 10400;
  const errorMw = currentInterval?.error_mw || Math.round(forecastWind - actualWind);

  // Day-Ahead buy order = Demand - Forecast Wind
  const daOrderMw = Math.max(0, Math.round(demandMw - forecastWind));
  // Actual residual requirement = Demand - Actual Wind
  const actualResidualMw = Math.max(0, Math.round(demandMw - actualWind));

  const isShortfall = errorMw > 0;
  const imbalanceMwh = Math.abs(errorMw);
  const estCashoutRisk = Math.round(imbalanceMwh * cashoutPriceGbp);

  // Bias-corrected simulation (applying -1,806 MW haircut)
  const biasHaircut = metrics.bias_mw || 1800;
  const correctedForecast = Math.max(0, forecastWind - biasHaircut);
  const correctedOrder = Math.max(0, Math.round(demandMw - correctedForecast));
  const correctedShortfall = Math.max(0, actualResidualMw - correctedOrder);
  const correctedCashoutRisk = Math.round(correctedShortfall * cashoutPriceGbp);
  const savingsGbp = Math.max(0, estCashoutRisk - correctedCashoutRisk);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Day-Ahead Procurement & Cashout Simulator</h1>
          <p className="page-subtitle">
            Scenario planning tool: Assessing how wind forecast variance impacts Day-Ahead procurement volume and balancing cashout exposure
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <span className="badge-status forecast font-mono">
            Elexon BSC Cashout Engine
          </span>
        </div>
      </div>

      {/* Control Deck */}
      <div className="surface-card">
        <div className="surface-card-header">
          <div>
            <h2 className="surface-card-title">
              <Sliders size={18} color="var(--color-forecast)" />
              Desk Simulation Parameters
            </h2>
            <p className="surface-card-subtitle">
              Adjust customer demand assumptions and imbalance cashout price (System Buy Price)
            </p>
          </div>

          {/* Quick Interval Preset Buttons */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Jump to:</span>
            <button
              className="btn-secondary"
              onClick={() => setSelectedIntervalIndex(peakShortfallIndex)}
              style={{ fontSize: "0.78rem" }}
            >
              Worst Under-Procurement Miss (Jan 24 23:00)
            </button>
            <button
              className="btn-secondary"
              onClick={() => setSelectedIntervalIndex(0)}
              style={{ fontSize: "0.78rem" }}
            >
              First Interval (Jan 01 00:00)
            </button>
          </div>
        </div>

        <div className="grid-2-col">
          {/* Slider 1: Demand */}
          <div className="slider-container">
            <div className="slider-header">
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-white)" }}>
                Illustrative Consumer Demand:
              </span>
              <span className="font-mono" style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--color-forecast)" }}>
                {demandMw.toLocaleString()} MW
              </span>
            </div>
            <input
              type="range"
              className="pro-slider"
              min={15000}
              max={45000}
              step={500}
              value={demandMw}
              onChange={(e) => setDemandMw(Number(e.target.value))}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              <span>15,000 MW (Off-Peak Night)</span>
              <span>30,000 MW (Typical Day)</span>
              <span>45,000 MW (Severe Cold Snap Peak)</span>
            </div>
          </div>

          {/* Slider 2: Cashout SBP Price */}
          <div className="slider-container">
            <div className="slider-header">
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-white)" }}>
                Indicative Cashout Price (System Buy Price):
              </span>
              <span className="font-mono" style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--color-deficit)" }}>
                £{cashoutPriceGbp}/MWh
              </span>
            </div>
            <input
              type="range"
              className="pro-slider"
              style={{ accentColor: "var(--color-deficit)" }}
              min={40}
              max={300}
              step={5}
              value={cashoutPriceGbp}
              onChange={(e) => setCashoutPriceGbp(Number(e.target.value))}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)" }}>
              <span>£40/MWh (Normal Surplus)</span>
              <span>£85/MWh (Jan Base)</span>
              <span>£300/MWh (Tight Scarcity Spike)</span>
            </div>
          </div>
        </div>

        {/* Interval Selector Bar */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "20px",
          padding: "16px 20px",
          background: "var(--bg-canvas)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-subtle)"
        }}>
          <div>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>
              Evaluated Delivery Target
            </span>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-white)", marginTop: "2px" }}>
              {currentInterval?.delivery_start_uk || "—"} (Settlement Period {currentInterval?.settlement_period || "—"})
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              className="btn-secondary"
              disabled={selectedIntervalIndex <= 0}
              onClick={() => setSelectedIntervalIndex((prev: number) => Math.max(0, prev - 1))}
            >
              Previous Interval
            </button>
            <span className="font-mono" style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Interval {selectedIntervalIndex + 1} of {matchedSeries.length}
            </span>
            <button
              className="btn-secondary"
              disabled={selectedIntervalIndex >= matchedSeries.length - 1}
              onClick={() => setSelectedIntervalIndex((prev: number) => Math.min(matchedSeries.length - 1, prev + 1))}
            >
              Next Interval
            </button>
          </div>
        </div>
      </div>

      {/* 3 Large Structural Financial Cards */}
      <div className="grid-3-col">
        {/* Card 1: Day-Ahead Order */}
        <div className="metric-card-pro">
          <div className="metric-card-top">
            <span className="metric-card-title">1. Day-Ahead Wholesale Order</span>
            <div className="metric-card-icon" style={{ color: "var(--color-forecast)" }}>
              <Sliders size={18} />
            </div>
          </div>
          <div className="metric-card-value font-mono" style={{ color: "var(--color-forecast)" }}>
            {daOrderMw.toLocaleString()} <span style={{ fontSize: "1rem", color: "var(--text-muted)" }}>MW</span>
          </div>
          <div className="metric-card-sub" style={{ lineHeight: 1.5 }}>
            Purchased in Day-Ahead Auction: <strong>Demand ({demandMw.toLocaleString()} MW) - Forecast Wind ({forecastWind.toLocaleString()} MW)</strong>
          </div>
        </div>

        {/* Card 2: Actual Physical Requirement */}
        <div className="metric-card-pro">
          <div className="metric-card-top">
            <span className="metric-card-title">2. Physical Delivery Reality</span>
            <div className="metric-card-icon" style={{ color: "var(--color-actual)" }}>
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="metric-card-value font-mono" style={{ color: "var(--color-actual)" }}>
            {actualResidualMw.toLocaleString()} <span style={{ fontSize: "1rem", color: "var(--text-muted)" }}>MW</span>
          </div>
          <div className="metric-card-sub" style={{ lineHeight: 1.5 }}>
            Actual power needed to serve demand: <strong>Demand ({demandMw.toLocaleString()} MW) - Actual Wind ({actualWind.toLocaleString()} MW)</strong>
          </div>
        </div>

        {/* Card 3: Imbalance & Financial Cashout */}
        <div className="metric-card-pro" style={{ borderColor: isShortfall ? "rgba(245, 158, 11, 0.4)" : "rgba(13, 148, 136, 0.4)" }}>
          <div className="metric-card-top">
            <span className="metric-card-title">3. Net Cashout Exposure</span>
            <div className="metric-card-icon" style={{ color: isShortfall ? "var(--color-deficit)" : "var(--color-surplus)" }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div className="metric-card-value font-mono" style={{ color: isShortfall ? "var(--color-deficit)" : "var(--color-surplus)" }}>
            £{estCashoutRisk.toLocaleString()}
          </div>
          <div className="metric-card-sub" style={{ lineHeight: 1.5 }}>
            {isShortfall ? (
              <span style={{ color: "var(--color-deficit)" }}>
                <strong>{imbalanceMwh.toLocaleString()} MWh Deficit:</strong> Utility was under-procured; must settle shortfall at £{cashoutPriceGbp}/MWh SBP.
              </span>
            ) : (
              <span style={{ color: "var(--color-surplus)" }}>
                <strong>{imbalanceMwh.toLocaleString()} MWh Surplus:</strong> Wind exceeded forecast; utility sold excess power in imbalance.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Strategic Desk Analysis Card: Value of Bias-Correction */}
      <div className="surface-card" style={{ borderColor: "rgba(59, 130, 246, 0.3)" }}>
        <div className="surface-card-header">
          <div>
            <h2 className="surface-card-title">
              <TrendingDown size={18} color="var(--color-forecast)" />
              Trading Desk Value Analysis: The Power of Bias-Correction
            </h2>
            <p className="surface-card-subtitle">
              Evaluating financial protection when applying a systematic -{biasHaircut.toLocaleString()} MW discount to the raw Elexon WINDFOR forecast
            </p>
          </div>
          <span className="badge-status forecast font-mono">
            Quantitative Margin Shield
          </span>
        </div>

        <div className="grid-2-col" style={{ alignItems: "center" }}>
          <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
            Because national wind forecasts exhibited an average positive bias of <strong>+{biasHaircut.toLocaleString()} MW</strong> across 88% of January 2026 intervals, an energy utility buying power based naively on raw forecast estimates was chronically under-procured.
            <br /><br />
            If your trading desk had applied a disciplined <strong>-{biasHaircut.toLocaleString()} MW haircut</strong> to the day-ahead forecast for this specific delivery interval, your day-ahead buy order would have increased to <strong>{correctedOrder.toLocaleString()} MW</strong>, capturing wholesale power at day-ahead prices rather than paying scarcity cashout penalties.
          </div>

          <div style={{
            background: "var(--bg-canvas)",
            padding: "24px",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            flexDirection: "column",
            gap: "12px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "var(--text-muted)" }}>
              <span>Raw Unadjusted Cashout Exposure:</span>
              <span className="font-mono" style={{ color: "var(--color-deficit)", fontWeight: 700 }}>£{estCashoutRisk.toLocaleString()}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "var(--text-muted)" }}>
              <span>Bias-Adjusted Cashout Exposure:</span>
              <span className="font-mono" style={{ color: "var(--color-actual)", fontWeight: 700 }}>£{correctedCashoutRisk.toLocaleString()}</span>
            </div>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              borderTop: "1px solid var(--border-subtle)",
              paddingTop: "12px",
              marginTop: "4px"
            }}>
              <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-white)" }}>
                Single-Interval Cashout Avoidance:
              </span>
              <span className="font-mono" style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-actual)" }}>
                £{savingsGbp.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
