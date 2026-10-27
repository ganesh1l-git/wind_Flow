import React, { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import type { IntervalRecord } from "../types";
import { Calendar, Filter } from "lucide-react";

interface ForecastChartProps {
  series: IntervalRecord[];
  onSelectInterval?: (intervalStart: string) => void;
}

export const ForecastChart: React.FC<ForecastChartProps> = ({
  series,
  onSelectInterval
}) => {
  const [filterMode, setFilterMode] = useState<"all" | "matched_only">("all");
  const [selectedDay, setSelectedDay] = useState<string>("all");

  // Extract unique days
  const uniqueDays = Array.from(new Set(series.map((s) => s.delivery_date))).sort();

  const filteredSeries = series.filter((item) => {
    if (selectedDay !== "all" && item.delivery_date !== selectedDay) {
      return false;
    }
    if (filterMode === "matched_only" && item.match_status !== "MATCHED") {
      return false;
    }
    return true;
  });

  const chartData = filteredSeries.map((item) => ({
    time: item.delivery_start.slice(5, 16).replace("T", " "),
    fullUtc: item.delivery_start,
    ukLocal: item.delivery_start_uk,
    actual: item.actual_generation_mw,
    forecast: item.forecast_generation_mw,
    error: item.error_mw,
    status: item.match_status,
    publishTime: item.selected_publish_time,
    cutoffUtc: item.decision_cutoff_utc
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-chart-tooltip">
          <div style={{ fontWeight: 600, color: "var(--accent-cyan)", marginBottom: "6px" }}>
            {data.ukLocal}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "8px" }}>
            UTC: {data.fullUtc}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
              <span style={{ color: "var(--accent-emerald)" }}>● Actual Generation:</span>
              <strong className="font-mono">
                {data.actual !== null && data.actual !== undefined ? `${data.actual.toLocaleString()} MW` : "Missing"}
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
              <span style={{ color: "var(--accent-cyan)" }}>▲ Selected Day-Ahead Forecast:</span>
              <strong className="font-mono">
                {data.forecast !== null && data.forecast !== undefined ? `${data.forecast.toLocaleString()} MW` : "No Eligible Forecast"}
              </strong>
            </div>
            {data.error !== null && data.error !== undefined && (
              <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", borderTop: "1px solid var(--border-color)", paddingTop: "4px", marginTop: "2px" }}>
                <span style={{ color: data.error > 0 ? "var(--accent-amber)" : "var(--accent-rose)" }}>
                  Error (Forecast - Actual):
                </span>
                <strong className="font-mono" style={{ color: data.error > 0 ? "var(--accent-amber)" : "var(--accent-rose)" }}>
                  {data.error > 0 ? `+${data.error.toLocaleString()}` : data.error.toLocaleString()} MW
                </strong>
              </div>
            )}
            {data.publishTime && (
              <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginTop: "4px" }}>
                Forecast Published: {data.publishTime.replace("T", " ").replace("Z", " UTC")}
              </div>
            )}
            <div style={{ marginTop: "6px" }}>
              <span className={`badge ${data.status === "MATCHED" ? "badge-matched" : "badge-missing"}`}>
                Status: {data.status}
              </span>
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
            National Wind Generation: Actuals vs Day-Ahead Forecast
          </h2>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            Comparison of Elexon FUELHH actual wind outturn against selected WINDFOR forecast at assumed decision cutoff
          </p>
        </div>

        {/* Filter controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Calendar size={14} color="var(--text-muted)" />
            <select
              className="select-input"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              style={{ fontSize: "0.75rem", padding: "4px 8px" }}
            >
              <option value="all">All Days (Jan 2026)</option>
              {uniqueDays.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Filter size={14} color="var(--text-muted)" />
            <select
              className="select-input"
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as any)}
              style={{ fontSize: "0.75rem", padding: "4px 8px" }}
            >
              <option value="all">Show All Intervals (1,488)</option>
              <option value="matched_only">Matched Pairs Only (744)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Recharts chart */}
      <div style={{ width: "100%", height: "460px" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 20, bottom: 20, left: 10 }}
            onClick={(state: any) => {
              const clickedFullUtc = state?.activePayload?.[0]?.payload?.fullUtc;
              if (onSelectInterval && clickedFullUtc) {
                onSelectInterval(clickedFullUtc);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
            <XAxis
              dataKey="time"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              interval={selectedDay === "all" ? 48 : 4}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              domain={[0, "auto"]}
              unit=" MW"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="top"
              height={36}
              formatter={(value) => (
                <span style={{ color: "var(--text-secondary)", fontSize: "0.8125rem", marginRight: "12px" }}>
                  {value}
                </span>
              )}
            />
            {/* Actual Wind Generation: Solid Emerald Line */}
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual Wind Outturn (FUELHH)"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 6, fill: "#10b981" }}
              connectNulls={false}
            />
            {/* Selected Forecast: Dashed Cyan Line */}
            <Line
              type="monotone"
              dataKey="forecast"
              name="Selected Day-Ahead Forecast (WINDFOR)"
              stroke="#06b6d4"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 6, fill: "#06b6d4" }}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Explanatory footer note */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: "12px", marginTop: "12px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
        <span>
          💡 <strong>Tip:</strong> Click any interval on the chart to inspect its full historical forecast vintages in the Vintage Auditor.
        </span>
        <span>
          Displaying {chartData.length} intervals • Solid line: Actuals (FUELHH) • Dashed line: Forecast (WINDFOR)
        </span>
      </div>
    </div>
  );
};
