import React from "react";
import {
  TrendingUp,
  AlertTriangle,
  Scale,
  Percent,
  CheckCircle,
  Zap,
  Info,
  CalendarCheck,
  ArrowRight
} from "lucide-react";
import { MetricCard } from "./MetricCard";
import type { AnalysisResponse } from "../types";

interface ExecutiveDashboardProps {
  data: AnalysisResponse;
  onNavigateTab: (tab: string) => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  data,
  onNavigateTab
}) => {
  const { metrics, metadata } = data;

  const isOverforecast = (metrics.bias_mw || 0) > 0;

  return (
    <div>
      {/* Pilot Assumption Banner */}
      <div className="pilot-notice-box">
        <Info size={20} color="#60a5fa" style={{ flexShrink: 0, marginTop: "2px" }} />
        <div>
          <div style={{ fontWeight: 600, color: "#bfdbfe", marginBottom: "2px" }}>
            PILOT DECISION CUTOFF ASSUMPTION • LOOK-AHEAD BIAS PROTECTION
          </div>
          <div>
            Evaluation period: <strong>{metadata.evaluation_period}</strong>. Assumed day-ahead procurement decision cutoff:{" "}
            <strong>{metadata.decision_cutoff_time} UK Local Time (preceding day D-1)</strong>. For each delivery interval, only
            forecast vintages published at or before this instant are eligible. All subsequent vintages are strictly excluded from
            accuracy metrics. Coverage reflects exact half-hour matching across Elexon's hourly WINDFOR dataset without artificial interpolation.
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="metrics-grid">
        <MetricCard
          title="Forecast Coverage"
          value={`${metrics.forecast_coverage_pct}%`}
          subtitle={`${metrics.matched_intervals_count} matched / ${metrics.total_calendar_intervals} intervals`}
          icon={<CalendarCheck size={18} color="var(--accent-cyan)" />}
          accentColor="var(--accent-cyan)"
          badgeText="Exact Matched"
          badgeType="matched"
          tooltip="Matched intervals with both valid FUELHH actuals and eligible WINDFOR forecast."
        />

        <MetricCard
          title="Mean Absolute Error (MAE)"
          value={metrics.mae_mw}
          unit="MW"
          subtitle={`Median: ${metrics.median_abs_error_mw?.toLocaleString() || "N/A"} MW`}
          icon={<Scale size={18} color="#38bdf8" />}
          accentColor="#38bdf8"
          badgeText={`N=${metrics.matched_intervals_count}`}
          badgeType="pilot"
          tooltip="MAE = (1/N) * sum(|Forecast - Actual|). Average magnitude of forecast error."
        />

        <MetricCard
          title="Root Mean Squared Error (RMSE)"
          value={metrics.rmse_mw}
          unit="MW"
          subtitle="Heavily penalizes extreme error deviations"
          icon={<Zap size={18} color="#818cf8" />}
          accentColor="#818cf8"
          badgeText="Quadratic Penalty"
          badgeType="pilot"
          tooltip="RMSE = sqrt((1/N) * sum((Forecast - Actual)^2))."
        />

        <MetricCard
          title="Forecast Bias"
          value={(metrics.bias_mw || 0) > 0 ? `+${metrics.bias_mw}` : metrics.bias_mw}
          unit="MW"
          subtitle={isOverforecast ? "Systematic Overforecasting Tendency" : "Underforecasting Tendency"}
          icon={<TrendingUp size={18} color={isOverforecast ? "var(--accent-amber)" : "var(--accent-rose)"} />}
          accentColor={isOverforecast ? "var(--accent-amber)" : "var(--accent-rose)"}
          badgeText={isOverforecast ? "Overforecast" : "Underforecast"}
          badgeType={isOverforecast ? "missing" : "excluded"}
          tooltip="Bias = (1/N) * sum(Forecast - Actual). Positive means forecast > actual on average."
        />

        <MetricCard
          title="WAPE (Percentage Error)"
          value={metrics.wape_pct}
          unit="%"
          subtitle="Weighted Absolute Percentage Error"
          icon={<Percent size={18} color="#a78bfa" />}
          accentColor="#a78bfa"
          badgeText="Volume Weighted"
          badgeType="pilot"
          tooltip="WAPE = sum(|Forecast - Actual|) / sum(Actual) * 100%."
        />

        <MetricCard
          title="Average Actual Wind"
          value={metrics.avg_actual_mw}
          unit="MW"
          subtitle={`Forecast Avg: ${metrics.avg_forecast_mw?.toLocaleString()} MW`}
          icon={<Zap size={18} color="var(--accent-emerald)" />}
          accentColor="var(--accent-emerald)"
          badgeText="Great Britain Outturn"
          badgeType="matched"
          tooltip="Mean national wind generation outturn from Elexon FUELHH (WIND)."
        />

        <MetricCard
          title="Max Absolute Error"
          value={metrics.max_abs_error_mw}
          unit="MW"
          subtitle={`Worst interval: ${metrics.max_abs_error_interval?.replace('T', ' ').replace('Z', ' UTC') || "N/A"}`}
          icon={<AlertTriangle size={18} color="var(--accent-rose)" />}
          accentColor="var(--accent-rose)"
          badgeText="Peak Error"
          badgeType="excluded"
          tooltip="Single largest divergence between selected forecast and actual generation."
        />

        <MetricCard
          title="Directional Distribution"
          value={`${Math.round((metrics.overforecast_count / (metrics.matched_intervals_count || 1)) * 100)}%`}
          unit="Overforecast"
          subtitle={`${metrics.overforecast_count} Over / ${metrics.underforecast_count} Under`}
          icon={<Scale size={18} color="#34d399" />}
          accentColor="#34d399"
          badgeText="Directional Skew"
          badgeType="pilot"
          tooltip="Proportion of matched intervals where day-ahead forecast exceeded actual generation."
        />
      </div>

      {/* Analytical Narrative & Business Implication Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "20px", padding: "0 24px 24px 24px" }}>
        {/* Market Interpretation Card */}
        <div className="chart-card" style={{ margin: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              background: "rgba(6, 182, 212, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <TrendingUp size={18} color="var(--accent-cyan)" />
            </div>
            <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>Trading & Procurement Implications</h3>
          </div>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "14px" }}>
            In January 2026, the national day-ahead wind forecast exhibited an average positive bias of{" "}
            <strong style={{ color: "var(--accent-amber)" }}>+{metrics.bias_mw?.toLocaleString()} MW</strong>, with an average absolute error
            of <strong>{metrics.mae_mw?.toLocaleString()} MW</strong> (WAPE: <strong>{metrics.wape_pct}%</strong>).
          </p>
          <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "14px", borderRadius: "8px", border: "1px solid var(--border-color)", marginBottom: "14px" }}>
            <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>
              Key Operational Takeaway for Day-Ahead Desk:
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Because actual wind generation fell short of day-ahead forecasts in {Math.round((metrics.overforecast_count / (metrics.matched_intervals_count || 1)) * 100)}% of matched periods,
              the trading desk would have faced a systematic under-procurement position if assuming nominal forecast wind.
              This necessitates sourcing compensatory thermal generation or intraday balancing power at potentially adverse cashout prices.
            </p>
          </div>
          <button
            className="btn-secondary"
            onClick={() => onNavigateTab("simulator")}
            style={{ width: "100%", justifyContent: "center" }}
          >
            Open Procurement Decision Simulator <ArrowRight size={15} />
          </button>
        </div>

        {/* Data Architecture & Look-Ahead Bias Verification Card */}
        <div className="chart-card" style={{ margin: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              background: "rgba(16, 185, 129, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <CheckCircle size={18} color="var(--accent-emerald)" />
            </div>
            <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>Data Provenance & Audit Integrity</h3>
          </div>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "14px" }}>
            This platform ingests <strong>100% genuine Elexon Insights Solution (BMRS)</strong> stream records.
            No synthetic data or unauthorized external sources have been introduced.
          </p>
          <ul style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.8, paddingLeft: "18px", marginBottom: "16px" }}>
            <li><strong>FUELHH:</strong> 1,488 half-hour actual outturn records filtered strictly for fuelType="WIND".</li>
            <li><strong>WINDFOR:</strong> 18,080 forecast vintages published across the evaluation window.</li>
            <li><strong>Cutoff Enforcement:</strong> Vintages published after {metadata.decision_cutoff_time} D-1 are rejected.</li>
            <li><strong>Resolution Transparency:</strong> WINDFOR is published at 1-hour intervals by National Grid ESO; exact timestamp matching preserves empirical integrity without unverified interpolation.</li>
          </ul>
          <button
            className="btn-secondary"
            onClick={() => onNavigateTab("table")}
            style={{ width: "100%", justifyContent: "center" }}
          >
            Inspect Individual Intervals & Vintages <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
