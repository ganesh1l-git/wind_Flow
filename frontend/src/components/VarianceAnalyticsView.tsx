import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell
} from "recharts";
import { TrendingUp, BarChart2, Calendar, AlertTriangle } from "lucide-react";
import type { AnalysisResponse } from "../types";

interface VarianceAnalyticsViewProps {
  data: AnalysisResponse;
}

export const VarianceAnalyticsView: React.FC<VarianceAnalyticsViewProps> = ({ data }) => {
  const { series, error_distribution, daily_summaries, hourly_profiles = [] } = data;

  const errorSeriesData = useMemo(() => {
    return series
      .filter((s) => s.match_status === "MATCHED" && s.error_mw !== null)
      .map((s) => ({
        time: s.delivery_start.slice(5, 16).replace("T", " "),
        ukLocal: s.delivery_start_uk,
        error: s.error_mw || 0,
        actual: s.actual_generation_mw,
        forecast: s.forecast_generation_mw
      }));
  }, [series]);

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Forecast Variance & Statistical Distribution</h1>
          <p className="page-subtitle">
            Quantitative analysis of residual errors (e = Forecast - Actual) identifying directional skew and diurnal patterns
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <span className="badge-status deficit font-mono">
            Mean Bias: +{data.metrics.bias_mw?.toLocaleString()} MW
          </span>
          <span className="badge-status forecast font-mono">
            MAE: {data.metrics.mae_mw?.toLocaleString()} MW
          </span>
        </div>
      </div>

      {/* SECTION 1: Full-Width Error Delta Timeline */}
      <div className="surface-card">
        <div className="surface-card-header">
          <div>
            <h2 className="surface-card-title">
              <TrendingUp size={18} color="var(--color-deficit)" />
              Hourly Forecast Residual Delta (e = Forecast - Actual)
            </h2>
            <p className="surface-card-subtitle">
              Positive values indicate wind fell short of day-ahead expectation (utility under-procurement deficit); negative values represent wind surplus
            </p>
          </div>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: "var(--color-deficit)" }} />
              <span>Overforecast Deficit</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: "var(--color-surplus)" }} />
              <span>Underforecast Surplus</span>
            </div>
          </div>
        </div>

        <div className="chart-wrapper" style={{ height: "360px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={errorSeriesData}
              margin={{ top: 12, right: 20, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#cbd5e1" }}
                minTickGap={45}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: "#cbd5e1" }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k MW`}
                width={65}
              />
              <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    const isOver = d.error > 0;
                    return (
                      <div className="pro-tooltip">
                        <div className="pro-tooltip-header">{d.ukLocal}</div>
                        <div className="pro-tooltip-row">
                          <span style={{ color: isOver ? "var(--color-deficit)" : "var(--color-surplus)" }}>
                            {isOver ? "Overforecast Deficit:" : "Underforecast Surplus:"}
                          </span>
                          <strong className="font-mono">
                            {isOver ? `+${d.error.toLocaleString()}` : d.error.toLocaleString()} MW
                          </strong>
                        </div>
                        <div className="pro-tooltip-row" style={{ fontSize: "0.75rem", color: "var(--text-muted)", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "4px" }}>
                          Forecast: {d.forecast?.toLocaleString()} MW | Actual: {d.actual?.toLocaleString()} MW
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="error" maxBarSize={6} isAnimationActive={false}>
                {errorSeriesData.map((entry, index) => (
                  <Cell
                    key={`bar-${index}`}
                    fill={entry.error > 0 ? "var(--color-deficit)" : "var(--color-surplus)"}
                  />
                ))}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECTION 2: 2-Column Deep-Dive (Diurnal Profile + Distribution Histogram) */}
      <div className="grid-2-col">
        {/* Diurnal Profile */}
        <div className="surface-card">
          <div className="surface-card-header">
            <div>
              <h2 className="surface-card-title">
                <TrendingUp size={18} color="var(--color-forecast)" />
                24-Hour Diurnal Hour-of-Day Profile
              </h2>
              <p className="surface-card-subtitle">
                Average bias and MAE across 24 hours (00:00 - 23:00 UK Local Time)
              </p>
            </div>
            <span className="badge-status deficit" style={{ fontSize: "0.72rem" }}>
              <AlertTriangle size={12} /> Peak Evening Exposure (17:00-19:00)
            </span>
          </div>

          <div className="chart-wrapper" style={{ height: "340px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={hourly_profiles}
                margin={{ top: 12, right: 16, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#cbd5e1" }}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#cbd5e1" }}
                  tickFormatter={(v) => `${v} MW`}
                  width={65}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="pro-tooltip">
                          <div className="pro-tooltip-header">Hour {d.label} UK Local</div>
                          <div className="pro-tooltip-row">
                            <span style={{ color: "var(--color-deficit)" }}>Mean Bias:</span>
                            <strong className="font-mono">+{Math.round(d.bias_mw).toLocaleString()} MW</strong>
                          </div>
                          <div className="pro-tooltip-row">
                            <span style={{ color: "var(--color-forecast)" }}>MAE:</span>
                            <strong className="font-mono">{Math.round(d.mae_mw).toLocaleString()} MW</strong>
                          </div>
                          <div className="pro-tooltip-row" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            Outturn: {Math.round(d.avg_actual_mw).toLocaleString()} MW | Forecast: {Math.round(d.avg_forecast_mw).toLocaleString()} MW
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="bias_mw"
                  name="Mean Bias (MW)"
                  fill="var(--color-deficit)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Line
                  type="monotone"
                  dataKey="mae_mw"
                  name="Mean Absolute Error (MW)"
                  stroke="var(--color-forecast)"
                  strokeWidth={2.4}
                  dot={{ r: 4, fill: "var(--color-forecast)" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Error Residuals Histogram */}
        <div className="surface-card">
          <div className="surface-card-header">
            <div>
              <h2 className="surface-card-title">
                <BarChart2 size={18} color="var(--color-surplus)" />
                Error Residual Distribution Histogram
              </h2>
              <p className="surface-card-subtitle">
                Frequency distribution of forecast errors (MW) across 744 intervals
              </p>
            </div>
            <span className="badge-status forecast" style={{ fontSize: "0.72rem" }}>
              N = 744 Hours
            </span>
          </div>

          <div className="chart-wrapper" style={{ height: "340px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={error_distribution}
                margin={{ top: 12, right: 16, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#64748b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: "#cbd5e1" }}
                  angle={-20}
                  textAnchor="end"
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: "#cbd5e1" }}
                  width={50}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="pro-tooltip">
                          <div className="pro-tooltip-header">Error Bin: {d.label}</div>
                          <div className="pro-tooltip-row">
                            <span>Interval Count:</span>
                            <strong className="font-mono">{d.count} hours</strong>
                          </div>
                          <div className="pro-tooltip-row">
                            <span>Share of Total:</span>
                            <strong className="font-mono">{((d.count / 744) * 100).toFixed(1)}%</strong>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={34}>
                  {error_distribution.map((entry, index) => {
                    const isPositive = entry.bin_start >= 0;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={isPositive ? "var(--color-deficit)" : "var(--color-surplus)"}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SECTION 3: Daily Summary Ledger */}
      <div className="surface-card">
        <div className="surface-card-header">
          <div>
            <h2 className="surface-card-title">
              <Calendar size={18} color="var(--text-white)" />
              Daily Aggregation Ledger (January 2026)
            </h2>
            <p className="surface-card-subtitle">
              Daily total MWh energy generation outturn, forecast delivery, and day-by-day paired accuracy metrics
            </p>
          </div>
        </div>

        <div className="data-table-container">
          <table className="pro-table">
            <thead>
              <tr>
                <th>Delivery Date</th>
                <th>Matched Intervals</th>
                <th style={{ textAlign: "right" }}>Daily MAE (MW)</th>
                <th style={{ textAlign: "right" }}>Daily Bias (MW)</th>
                <th style={{ textAlign: "right" }}>Daily WAPE</th>
                <th style={{ textAlign: "right" }}>Realized Wind (MWh)</th>
                <th style={{ textAlign: "right" }}>Day-Ahead Forecast (MWh)</th>
              </tr>
            </thead>
            <tbody>
              {daily_summaries.map((day) => {
                const isOver = (day.bias_mw || 0) > 0;
                return (
                  <tr key={day.date}>
                    <td style={{ fontWeight: 700, color: "var(--text-white)" }}>{day.date}</td>
                    <td>{day.matched_intervals} / {day.total_intervals}</td>
                    <td style={{ textAlign: "right" }} className="font-mono">
                      {day.mae_mw?.toLocaleString() || "—"} MW
                    </td>
                    <td style={{ textAlign: "right" }} className="font-mono">
                      <span style={{ color: isOver ? "var(--color-deficit)" : "var(--color-surplus)", fontWeight: 700 }}>
                        {(day.bias_mw || 0) > 0 ? `+${day.bias_mw?.toLocaleString()}` : day.bias_mw?.toLocaleString()} MW
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }} className="font-mono">
                      {day.wape_pct || "—"}%
                    </td>
                    <td style={{ textAlign: "right", color: "var(--color-actual)" }} className="font-mono">
                      {Math.round(day.actual_energy_mwh).toLocaleString()} MWh
                    </td>
                    <td style={{ textAlign: "right", color: "var(--color-forecast)" }} className="font-mono">
                      {Math.round(day.forecast_energy_mwh).toLocaleString()} MWh
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
