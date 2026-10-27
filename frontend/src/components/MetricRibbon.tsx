import React from "react";
import type { AccuracyMetrics } from "../types";

interface MetricRibbonProps {
  metrics: AccuracyMetrics;
}

export const MetricRibbon: React.FC<MetricRibbonProps> = ({ metrics }) => {
  const isOverforecast = (metrics.bias_mw || 0) > 0;
  const overforecastPct = Math.round(
    (metrics.overforecast_count / (metrics.matched_intervals_count || 1)) * 100
  );

  return (
    <div className="metric-ribbon">
      <div className="ribbon-item">
        <span className="ribbon-label">EVALUATION:</span>
        <span className="ribbon-val">JAN 2026 (744h EXACT MATCH)</span>
      </div>

      <div className="ribbon-sep" />

      <div className="ribbon-item" title="Mean Absolute Error: Average magnitude of forecast divergence">
        <span className="ribbon-label">MAE:</span>
        <span className="ribbon-val" style={{ color: "var(--color-forecast)" }}>
          {metrics.mae_mw?.toLocaleString() || "—"} MW
        </span>
      </div>

      <div className="ribbon-sep" />

      <div className="ribbon-item" title="Root Mean Squared Error: Quadratic penalty for severe forecast busts">
        <span className="ribbon-label">RMSE:</span>
        <span className="ribbon-val">
          {metrics.rmse_mw?.toLocaleString() || "—"} MW
        </span>
      </div>

      <div className="ribbon-sep" />

      <div className="ribbon-item" title="Forecast Bias: Positive means forecast exceeds actual on average">
        <span className="ribbon-label">SYSTEMIC BIAS:</span>
        <span
          className="ribbon-val"
          style={{ color: isOverforecast ? "var(--color-deficit)" : "var(--color-surplus)" }}
        >
          {(metrics.bias_mw || 0) > 0 ? `+${metrics.bias_mw?.toLocaleString()}` : metrics.bias_mw?.toLocaleString()} MW
        </span>
      </div>

      <div className="ribbon-sep" />

      <div className="ribbon-item" title="Weighted Absolute Percentage Error">
        <span className="ribbon-label">WAPE:</span>
        <span className="ribbon-val">
          {metrics.wape_pct || "—"}%
        </span>
      </div>

      <div className="ribbon-sep" />

      <div className="ribbon-item" title="Mean National Wind Generation Outturn (Elexon FUELHH)">
        <span className="ribbon-label">AVG OUTTURN:</span>
        <span className="ribbon-val" style={{ color: "var(--color-actual)" }}>
          {metrics.avg_actual_mw?.toLocaleString() || "—"} MW
        </span>
      </div>

      <div className="ribbon-sep" />

      <div className="ribbon-item" title="Mean Selected Day-Ahead Forecast at Cutoff">
        <span className="ribbon-label">AVG FORECAST:</span>
        <span className="ribbon-val">
          {metrics.avg_forecast_mw?.toLocaleString() || "—"} MW
        </span>
      </div>

      <div className="ribbon-sep" />

      <div className="ribbon-item" title="Percentage of intervals where forecast exceeded actual generation">
        <span className="ribbon-label">SHORTFALL RISK:</span>
        <span
          className="ribbon-val"
          style={{ color: "var(--color-deficit)" }}
        >
          {overforecastPct}% OF HOURS
        </span>
      </div>

      <div className="ribbon-sep" />

      <div className="ribbon-item" title={`Peak error interval: ${metrics.max_abs_error_interval || ""}`}>
        <span className="ribbon-label">PEAK BUST:</span>
        <span className="ribbon-val" style={{ color: "var(--color-alert)" }}>
          {metrics.max_abs_error_mw?.toLocaleString() || "—"} MW
        </span>
      </div>
    </div>
  );
};
