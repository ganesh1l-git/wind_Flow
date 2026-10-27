import React, { useState } from "react";
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
  Cell
} from "recharts";
import type { DailySummary, ErrorDistributionBin, HourlyProfile } from "../types";
import { BarChart3, TrendingUp, Calendar } from "lucide-react";

interface ErrorAnalysisChartProps {
  dailySummaries: DailySummary[];
  errorDistribution: ErrorDistributionBin[];
  hourlyProfiles?: HourlyProfile[];
}

export const ErrorAnalysisChart: React.FC<ErrorAnalysisChartProps> = ({
  dailySummaries,
  errorDistribution,
  hourlyProfiles = []
}) => {
  const [subView, setSubView] = useState<"diurnal" | "distribution" | "daily">("diurnal");

  return (
    <div className="tab-scroll-container">
      <div className="ledger-card">
        {/* Header toolbar */}
        <div className="ledger-toolbar">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-white)" }}>
              Statistical Error & Diurnal Analysis
            </span>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              (Empirical Residuals: e = Forecast - Actual)
            </span>
          </div>

          {/* Subview pills */}
          <div className="segmented-control">
            <button
              className={`segmented-pill ${subView === "diurnal" ? "active" : ""}`}
              onClick={() => setSubView("diurnal")}
            >
              <TrendingUp size={12} />
              24-Hour Diurnal Profile
            </button>
            <button
              className={`segmented-pill ${subView === "distribution" ? "active" : ""}`}
              onClick={() => setSubView("distribution")}
            >
              <BarChart3 size={12} />
              Error Histogram
            </button>
            <button
              className={`segmented-pill ${subView === "daily" ? "active" : ""}`}
              onClick={() => setSubView("daily")}
            >
              <Calendar size={12} />
              Daily Summary Ledger
            </button>
          </div>
        </div>

        {/* View 1: 24-Hour Diurnal Curve */}
        {subView === "diurnal" && (
          <div style={{ padding: "16px" }}>
            <div style={{ marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                Mean Forecast Bias & MAE by Hour of Day (UK Local Time, 00:00 - 23:00)
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--color-deficit)" }}>
                Note: Evening Peak (17:00-19:00) coincides with maximum system tightness
              </span>
            </div>

            <div style={{ height: "380px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={hourlyProfiles}
                  margin={{ top: 10, right: 16, left: 10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#475569"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(255, 255, 255, 0.08)" }}
                  />
                  <YAxis
                    stroke="#475569"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(255, 255, 255, 0.08)" }}
                    tickFormatter={(v) => `${v} MW`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="apple-tooltip">
                            <div className="apple-tooltip-title">Hour {d.label} UK</div>
                            <div className="apple-tooltip-row">
                              <span style={{ color: "var(--color-deficit)" }}>Mean Bias:</span>
                              <span className="font-mono">+{Math.round(d.bias_mw).toLocaleString()} MW</span>
                            </div>
                            <div className="apple-tooltip-row">
                              <span style={{ color: "var(--color-forecast)" }}>MAE:</span>
                              <span className="font-mono">{Math.round(d.mae_mw).toLocaleString()} MW</span>
                            </div>
                            <div className="apple-tooltip-row">
                              <span style={{ color: "var(--color-actual)" }}>Avg Outturn:</span>
                              <span className="font-mono">{Math.round(d.avg_actual_mw).toLocaleString()} MW</span>
                            </div>
                            <div className="apple-tooltip-row">
                              <span style={{ color: "#94a3b8" }}>Avg Forecast:</span>
                              <span className="font-mono">{Math.round(d.avg_forecast_mw).toLocaleString()} MW</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />

                  {/* Overforecast bias bar */}
                  <Bar
                    dataKey="bias_mw"
                    name="Mean Bias (MW)"
                    fill="var(--color-deficit)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />

                  {/* MAE line */}
                  <Line
                    type="monotone"
                    dataKey="mae_mw"
                    name="Mean Absolute Error (MW)"
                    stroke="var(--color-forecast)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "var(--color-forecast)" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* View 2: Error Histogram */}
        {subView === "distribution" && (
          <div style={{ padding: "16px" }}>
            <div style={{ marginBottom: "12px", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
              Distribution of Forecast Residuals (e = Forecast - Actual) across 744 matched hourly intervals
            </div>

            <div style={{ height: "380px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={errorDistribution}
                  margin={{ top: 10, right: 16, left: 10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#475569"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(255, 255, 255, 0.08)" }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke="#475569"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(255, 255, 255, 0.08)" }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="apple-tooltip">
                            <div className="apple-tooltip-title">Bin: {d.label}</div>
                            <div className="apple-tooltip-row">
                              <span>Interval Count:</span>
                              <span className="font-mono" style={{ fontWeight: 600 }}>{d.count} hours</span>
                            </div>
                            <div className="apple-tooltip-row">
                              <span>Share of Month:</span>
                              <span className="font-mono">{((d.count / 744) * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={32}>
                    {errorDistribution.map((entry, index) => {
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
        )}

        {/* View 3: Daily Aggregations Table */}
        {subView === "daily" && (
          <div style={{ overflowX: "auto" }}>
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Matched Hours</th>
                  <th style={{ textAlign: "right" }}>Daily MAE (MW)</th>
                  <th style={{ textAlign: "right" }}>Daily Bias (MW)</th>
                  <th style={{ textAlign: "right" }}>Daily WAPE</th>
                  <th style={{ textAlign: "right" }}>Actual Wind Energy (MWh)</th>
                  <th style={{ textAlign: "right" }}>Forecast Wind Energy (MWh)</th>
                </tr>
              </thead>
              <tbody>
                {dailySummaries.map((day) => {
                  const isOver = (day.bias_mw || 0) > 0;
                  return (
                    <tr key={day.date}>
                      <td style={{ fontWeight: 600, color: "var(--text-white)" }}>{day.date}</td>
                      <td>{day.matched_intervals} / {day.total_intervals}</td>
                      <td style={{ textAlign: "right" }} className="font-mono">
                        {day.mae_mw?.toLocaleString() || "—"} MW
                      </td>
                      <td style={{ textAlign: "right" }} className="font-mono">
                        <span style={{ color: isOver ? "var(--color-deficit)" : "var(--color-surplus)", fontWeight: 600 }}>
                          {(day.bias_mw || 0) > 0 ? `+${day.bias_mw?.toLocaleString()}` : day.bias_mw?.toLocaleString()} MW
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }} className="font-mono">
                        {day.wape_pct || "—"}%
                      </td>
                      <td className="font-mono" style={{ textAlign: "right", color: "var(--color-actual)" }}>
                        {Math.round(day.actual_energy_mwh).toLocaleString()} MWh
                      </td>
                      <td className="font-mono" style={{ textAlign: "right", color: "var(--color-forecast)" }}>
                        {Math.round(day.forecast_energy_mwh).toLocaleString()} MWh
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
