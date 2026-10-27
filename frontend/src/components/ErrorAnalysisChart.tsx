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
  Legend,
  ReferenceLine,
  Cell
} from "recharts";
import type { IntervalRecord, DailySummary, ErrorDistributionBin } from "../types";
import { TrendingUp, BarChart2, Calendar } from "lucide-react";

interface ErrorAnalysisChartProps {
  series: IntervalRecord[];
  dailySummaries: DailySummary[];
  errorDistribution: ErrorDistributionBin[];
}

export const ErrorAnalysisChart: React.FC<ErrorAnalysisChartProps> = ({
  series,
  dailySummaries,
  errorDistribution
}) => {
  const [viewMode, setViewMode] = useState<"time_series" | "distribution" | "daily">("time_series");

  // Filter matched records
  const matchedSeries = series
    .filter((s) => s.match_status === "MATCHED" && s.error_mw !== null && s.error_mw !== undefined)
    .map((s) => ({
      time: s.delivery_start.slice(5, 16).replace("T", " "),
      ukLocal: s.delivery_start_uk,
      error: s.error_mw,
      absError: s.abs_error_mw,
      actual: s.actual_generation_mw,
      forecast: s.forecast_generation_mw
    }));

  const CustomErrorTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isOver = data.error > 0;
      return (
        <div className="custom-chart-tooltip">
          <div style={{ fontWeight: 600, color: "var(--accent-cyan)", marginBottom: "4px" }}>
            {data.ukLocal}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "0.8125rem" }}>
            <div>
              Forecast Error:{" "}
              <strong style={{ color: isOver ? "var(--accent-amber)" : "var(--accent-rose)" }}>
                {isOver ? `+${data.error.toLocaleString()}` : data.error.toLocaleString()} MW
              </strong>
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {isOver ? "Overforecast: Wind fell short by " + Math.abs(data.error) + " MW" : "Underforecast: Wind exceeded by " + Math.abs(data.error) + " MW"}
            </div>
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "4px", marginTop: "2px", fontSize: "0.75rem" }}>
              Forecast: {data.forecast?.toLocaleString()} MW | Actual: {data.actual?.toLocaleString()} MW
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h2 className="chart-title">
            Quantitative Forecast Error Analysis (e = Forecast - Actual)
          </h2>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            Positive error values indicate overforecasting; negative values indicate underforecasting
          </p>
        </div>

        {/* View toggle */}
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            className={`btn-secondary ${viewMode === "time_series" ? "active" : ""}`}
            style={{
              padding: "6px 12px",
              fontSize: "0.75rem",
              background: viewMode === "time_series" ? "rgba(6, 182, 212, 0.15)" : undefined,
              borderColor: viewMode === "time_series" ? "var(--accent-cyan)" : undefined,
              color: viewMode === "time_series" ? "var(--accent-cyan)" : undefined
            }}
            onClick={() => setViewMode("time_series")}
          >
            <TrendingUp size={14} />
            Error Time-Series
          </button>
          <button
            className={`btn-secondary ${viewMode === "distribution" ? "active" : ""}`}
            style={{
              padding: "6px 12px",
              fontSize: "0.75rem",
              background: viewMode === "distribution" ? "rgba(6, 182, 212, 0.15)" : undefined,
              borderColor: viewMode === "distribution" ? "var(--accent-cyan)" : undefined,
              color: viewMode === "distribution" ? "var(--accent-cyan)" : undefined
            }}
            onClick={() => setViewMode("distribution")}
          >
            <BarChart2 size={14} />
            Error Distribution Histogram
          </button>
          <button
            className={`btn-secondary ${viewMode === "daily" ? "active" : ""}`}
            style={{
              padding: "6px 12px",
              fontSize: "0.75rem",
              background: viewMode === "daily" ? "rgba(6, 182, 212, 0.15)" : undefined,
              borderColor: viewMode === "daily" ? "var(--accent-cyan)" : undefined,
              color: viewMode === "daily" ? "var(--accent-cyan)" : undefined
            }}
            onClick={() => setViewMode("daily")}
          >
            <Calendar size={14} />
            Daily MAE & Bias Breakdown
          </button>
        </div>
      </div>

      {/* View 1: Error Time Series */}
      {viewMode === "time_series" && (
        <div style={{ width: "100%", height: "420px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={matchedSeries} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} interval={48} tickLine={false} />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                unit=" MW"
              />
              <Tooltip content={<CustomErrorTooltip />} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} />
              <Bar dataKey="error" name="Forecast Error (MW)">
                {matchedSeries.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={(entry.error || 0) > 0 ? "rgba(245, 158, 11, 0.75)" : "rgba(244, 63, 94, 0.75)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* View 2: Error Distribution Histogram */}
      {viewMode === "distribution" && (
        <div style={{ width: "100%", height: "420px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={errorDistribution} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
              <XAxis dataKey="label" stroke="#64748b" fontSize={10} angle={-20} textAnchor="end" height={60} />
              <YAxis stroke="#64748b" fontSize={11} unit=" intervals" />
              <Tooltip
                formatter={(val: any) => [`${val} intervals`, "Frequency"]}
                contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px" }}
              />
              <Bar dataKey="count" name="Frequency" fill="var(--accent-cyan)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* View 3: Daily MAE & Bias Breakdown */}
      {viewMode === "daily" && (
        <div style={{ width: "100%", height: "420px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dailySummaries} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={10} interval={2} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} unit=" MW" />
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px" }}
              />
              <Legend verticalAlign="top" height={36} />
              <ReferenceLine y={0} stroke="#94a3b8" />
              <Bar dataKey="mae_mw" name="Daily MAE (MW)" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="bias_mw" name="Daily Bias (MW)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legend & Explanation Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: "12px", marginTop: "12px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
        <div style={{ display: "flex", gap: "16px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "10px", height: "10px", background: "var(--accent-amber)", borderRadius: "2px" }} />
            Positive Error (Amber): Overforecasting (Actual &lt; Forecast)
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "10px", height: "10px", background: "var(--accent-rose)", borderRadius: "2px" }} />
            Negative Error (Rose): Underforecasting (Actual &gt; Forecast)
          </span>
        </div>
        <span>
          Reference Line at e = 0 MW (Perfect Accuracy)
        </span>
      </div>
    </div>
  );
};
