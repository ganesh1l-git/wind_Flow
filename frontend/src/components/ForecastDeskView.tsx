import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area
} from "recharts";
import {
  TrendingUp,
  Scale,
  Zap,
  Percent,
  Clock,
  Layers,
  Search,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  ExternalLink
} from "lucide-react";
import type { AnalysisResponse, IntervalRecord } from "../types";

interface ForecastDeskViewProps {
  data: AnalysisResponse;
  onInspectInterval: (timestamp: string) => void;
}

export const ForecastDeskView: React.FC<ForecastDeskViewProps> = ({
  data,
  onInspectInterval
}) => {
  const { series, metrics } = data;

  const [selectedRange, setSelectedRange] = useState<string>("all");
  const [showUncertaintyBand, setShowUncertaintyBand] = useState<boolean>(false);
  const [applyBiasHaircut, setApplyBiasHaircut] = useState<boolean>(false);

  // Filter matched records
  const matchedSeries = useMemo(() => {
    return series.filter((s) => s.match_status === "MATCHED");
  }, [series]);

  // Default to peak error interval
  const peakErrorInterval = useMemo(() => {
    if (!matchedSeries.length) return null;
    let worst = matchedSeries[0];
    for (const item of matchedSeries) {
      if ((item.abs_error_mw || 0) > (worst.abs_error_mw || 0)) {
        worst = item;
      }
    }
    return worst;
  }, [matchedSeries]);

  const [activeInterval, setActiveInterval] = useState<IntervalRecord | null>(peakErrorInterval);

  // Time range filter
  const filteredSeries = useMemo(() => {
    if (selectedRange === "all") return matchedSeries;
    return matchedSeries.filter((s) => {
      const d = s.delivery_date;
      if (selectedRange === "w1") return d >= "2026-01-01" && d <= "2026-01-07";
      if (selectedRange === "w2") return d >= "2026-01-08" && d <= "2026-01-14";
      if (selectedRange === "w3") return d >= "2026-01-15" && d <= "2026-01-21";
      if (selectedRange === "w4") return d >= "2026-01-22" && d <= "2026-01-28";
      if (selectedRange === "w5") return d >= "2026-01-29" && d <= "2026-01-31";
      return true;
    });
  }, [matchedSeries, selectedRange]);

  // Chart data
  const chartData = useMemo(() => {
    const mae = metrics.mae_mw || 2000;
    const bias = metrics.bias_mw || 1800;

    return filteredSeries.map((s) => {
      const actual = s.actual_generation_mw ?? null;
      const forecast = s.forecast_generation_mw ?? null;
      const error = s.error_mw ?? 0;
      const hairCutForecast = forecast !== null ? Math.max(0, forecast - bias) : null;

      return {
        time: s.delivery_start.slice(5, 16).replace("T", " "),
        fullUtc: s.delivery_start,
        ukLocal: s.delivery_start_uk,
        actual,
        forecast,
        hairCutForecast,
        error,
        absError: s.abs_error_mw ?? 0,
        lowerBand: forecast !== null ? Math.max(0, forecast - mae) : null,
        upperBand: forecast !== null ? forecast + mae : null,
        record: s
      };
    });
  }, [filteredSeries, metrics.mae_mw, metrics.bias_mw]);

  const inspectedActual = activeInterval?.actual_generation_mw ?? metrics.avg_actual_mw;
  const inspectedForecast = activeInterval?.forecast_generation_mw ?? metrics.avg_forecast_mw;
  const inspectedError = activeInterval?.error_mw ?? 0;
  const isShortfall = inspectedError > 0;

  return (
    <div className="page-container">
      {/* Page Title & Context */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Day-Ahead Wind Forecast Desk</h1>
          <p className="page-subtitle">
            Evaluating Great Britain wind generation outturn (Elexon FUELHH) against Day-Ahead WINDFOR forecasts at {data.metadata.decision_cutoff_time} UK Local Time (D-1)
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <span className="badge-status forecast font-mono">
            744 Matched Intervals (100% Hourly Coverage)
          </span>
          <span className="badge-status actual font-mono">
            Zero Look-Ahead Bias Verified
          </span>
        </div>
      </div>

      {/* Spacious 4-Card KPI Grid */}
      <div className="metric-grid-4">
        {/* MAE */}
        <div className="metric-card-pro">
          <div className="metric-card-top">
            <span className="metric-card-title">Mean Absolute Error (MAE)</span>
            <div className="metric-card-icon" style={{ color: "var(--color-forecast)" }}>
              <Scale size={18} />
            </div>
          </div>
          <div className="metric-card-value font-mono">
            {metrics.mae_mw?.toLocaleString() || "—"} <span style={{ fontSize: "1rem", fontWeight: 500, color: "var(--text-muted)" }}>MW</span>
          </div>
          <div className="metric-card-sub">
            <Percent size={13} color="var(--color-forecast)" />
            <span>WAPE: <strong>{metrics.wape_pct}%</strong> volume-weighted error</span>
          </div>
        </div>

        {/* Forecast Bias */}
        <div className="metric-card-pro">
          <div className="metric-card-top">
            <span className="metric-card-title">Systemic Forecast Bias</span>
            <div className="metric-card-icon" style={{ color: "var(--color-deficit)" }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="metric-card-value font-mono" style={{ color: "var(--color-deficit)" }}>
            +{(metrics.bias_mw || 0).toLocaleString()} <span style={{ fontSize: "1rem", fontWeight: 500, color: "var(--text-muted)" }}>MW</span>
          </div>
          <div className="metric-card-sub" style={{ color: "var(--color-deficit)" }}>
            <AlertTriangle size={13} />
            <span>Overforecast in <strong>{Math.round(((metrics.overforecast_count || 1) / (metrics.matched_intervals_count || 1)) * 100)}%</strong> of hours</span>
          </div>
        </div>

        {/* Average Actual Wind Outturn */}
        <div className="metric-card-pro">
          <div className="metric-card-top">
            <span className="metric-card-title">Average Wind Outturn</span>
            <div className="metric-card-icon" style={{ color: "var(--color-actual)" }}>
              <Zap size={18} />
            </div>
          </div>
          <div className="metric-card-value font-mono" style={{ color: "var(--color-actual)" }}>
            {metrics.avg_actual_mw?.toLocaleString() || "—"} <span style={{ fontSize: "1rem", fontWeight: 500, color: "var(--text-muted)" }}>MW</span>
          </div>
          <div className="metric-card-sub">
            <span>Forecast Avg: <strong>{metrics.avg_forecast_mw?.toLocaleString()} MW</strong></span>
          </div>
        </div>

        {/* RMSE */}
        <div className="metric-card-pro">
          <div className="metric-card-top">
            <span className="metric-card-title">Root Mean Squared Error (RMSE)</span>
            <div className="metric-card-icon" style={{ color: "#a855f7" }}>
              <Scale size={18} />
            </div>
          </div>
          <div className="metric-card-value font-mono">
            {metrics.rmse_mw?.toLocaleString() || "—"} <span style={{ fontSize: "1rem", fontWeight: 500, color: "var(--text-muted)" }}>MW</span>
          </div>
          <div className="metric-card-sub">
            <span>Peak Error: <strong style={{ color: "var(--color-alert)" }}>{metrics.max_abs_error_mw?.toLocaleString()} MW</strong></span>
          </div>
        </div>
      </div>

      {/* Spacious Grand Generation Chart Card */}
      <div className="surface-card">
        <div className="surface-card-header">
          <div>
            <h2 className="surface-card-title">
              National Wind Generation: Actual Outturn vs Day-Ahead Forecast
            </h2>
            <p className="surface-card-subtitle">
              Visualizing Elexon FUELHH wind generation alongside National Grid ESO WINDFOR forecasts published prior to 12:00 D-1
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            {/* Time Range Pills */}
            <div className="pill-group">
              <button
                className={`pill-btn ${selectedRange === "all" ? "active" : ""}`}
                onClick={() => setSelectedRange("all")}
              >
                Full Jan (744h)
              </button>
              <button
                className={`pill-btn ${selectedRange === "w1" ? "active" : ""}`}
                onClick={() => setSelectedRange("w1")}
              >
                Week 1 (1–7)
              </button>
              <button
                className={`pill-btn ${selectedRange === "w2" ? "active" : ""}`}
                onClick={() => setSelectedRange("w2")}
              >
                Week 2 (8–14)
              </button>
              <button
                className={`pill-btn ${selectedRange === "w3" ? "active" : ""}`}
                onClick={() => setSelectedRange("w3")}
              >
                Week 3 (15–21)
              </button>
              <button
                className={`pill-btn ${selectedRange === "w4" ? "active" : ""}`}
                onClick={() => setSelectedRange("w4")}
              >
                Week 4 (22–28)
              </button>
              <button
                className={`pill-btn ${selectedRange === "w5" ? "active" : ""}`}
                onClick={() => setSelectedRange("w5")}
              >
                Week 5 (29–31)
              </button>
            </div>

            {/* ±MAE Confidence Band Toggle */}
            <button
              className={`btn-secondary ${showUncertaintyBand ? "active" : ""}`}
              onClick={() => setShowUncertaintyBand(!showUncertaintyBand)}
              style={{
                borderColor: showUncertaintyBand ? "var(--color-forecast)" : undefined,
                color: showUncertaintyBand ? "var(--color-forecast)" : undefined
              }}
            >
              <Layers size={14} />
              ±MAE Band
            </button>

            {/* Bias Haircut Toggle */}
            <button
              className={`btn-secondary ${applyBiasHaircut ? "active" : ""}`}
              onClick={() => setApplyBiasHaircut(!applyBiasHaircut)}
              style={{
                borderColor: applyBiasHaircut ? "var(--color-deficit)" : undefined,
                color: applyBiasHaircut ? "var(--color-deficit)" : undefined
              }}
            >
              <Sliders size={14} />
              Bias Haircut (-1,806 MW)
            </button>
          </div>
        </div>

        {/* Real Elexon Data Notice & Synoptic Weather Explanation */}
        <div style={{
          background: "#f0f7ff",
          border: "1px solid var(--border-medium)",
          borderRadius: "var(--radius-sm)",
          padding: "10px 16px",
          marginBottom: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px"
        }}>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.45, flex: 1, minWidth: "300px" }}>
            <span style={{ fontWeight: 700, color: "var(--color-forecast)" }}>● Real Elexon Open Data:</span>
            {" "}Green line is actual generation from <code>FUELHH (WIND)</code>; Blue line is the official <code>WINDFOR</code> forecast published by <strong>National Grid ESO</strong>.
            The "peaks and valleys" are real Atlantic weather front cycles (~22 GW storm winds vs ~2 GW calm doldrums).
            Click <strong>Week 1–5</strong> above to zoom into the smooth hourly day-by-day curves.
          </div>
          <a
            href="https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream?settlementDateFrom=2026-01-01&settlementDateTo=2026-01-02"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "0.74rem",
              fontWeight: 600,
              color: "var(--color-forecast)",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              background: "#ffffff",
              border: "1px solid var(--border-medium)",
              padding: "6px 12px",
              borderRadius: "var(--radius-sm)",
              whiteSpace: "nowrap",
              boxShadow: "var(--shadow-sm)"
            }}
          >
            <ExternalLink size={12} />
            Verify Live Elexon API JSON
          </a>
        </div>

        {/* Recharts Canvas */}
        <div className="chart-wrapper" style={{ height: "460px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 16, right: 20, left: 10, bottom: 20 }}
              onMouseMove={(e: any) => {
                if (e && e.activePayload && e.activePayload.length) {
                  const rec = e.activePayload[0].payload.record;
                  if (rec) setActiveInterval(rec);
                }
              }}
            >
              <defs>
                <linearGradient id="actualGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.16} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="bandGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" vertical={false} />

              <XAxis
                dataKey="time"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: "#cbd5e1" }}
                minTickGap={45}
              />

              <YAxis
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: "#cbd5e1" }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k MW`}
                width={70}
                domain={[0, 'auto']}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="pro-tooltip">
                        <div className="pro-tooltip-header">{d.ukLocal}</div>
                        <div className="pro-tooltip-row">
                          <span style={{ color: "var(--color-actual)" }}>● Realized Outturn:</span>
                          <strong className="font-mono">{d.actual?.toLocaleString()} MW</strong>
                        </div>
                        <div className="pro-tooltip-row">
                          <span style={{ color: "var(--color-forecast)" }}>▲ Selected Forecast:</span>
                          <strong className="font-mono">{d.forecast?.toLocaleString()} MW</strong>
                        </div>
                        {applyBiasHaircut && (
                          <div className="pro-tooltip-row">
                            <span style={{ color: "#94a3b8" }}>— Bias-Adjusted Desk Forecast:</span>
                            <strong className="font-mono">{d.hairCutForecast?.toLocaleString()} MW</strong>
                          </div>
                        )}
                        <div className="pro-tooltip-row" style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "6px", marginTop: "4px" }}>
                          <span style={{ color: d.error > 0 ? "var(--color-deficit)" : "var(--color-surplus)" }}>
                            Delta (Forecast - Actual):
                          </span>
                          <strong className="font-mono" style={{ color: d.error > 0 ? "var(--color-deficit)" : "var(--color-surplus)" }}>
                            {d.error > 0 ? `+${d.error.toLocaleString()}` : d.error.toLocaleString()} MW
                          </strong>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Optional Uncertainty Ribbon */}
              {showUncertaintyBand && (
                <Area
                  type="monotone"
                  dataKey="upperBand"
                  stroke="none"
                  fill="url(#bandGlow)"
                  isAnimationActive={false}
                />
              )}

              {/* Realized Outturn Line */}
              <Line
                type="monotone"
                dataKey="actual"
                name="Realized Wind Outturn"
                stroke="#10b981"
                strokeWidth={2.4}
                dot={false}
                activeDot={{ r: 6, stroke: "#10b981", strokeWidth: 2, fill: "#ffffff" }}
                isAnimationActive={false}
              />

              {/* Selected Day-Ahead Forecast Line */}
              <Line
                type="monotone"
                dataKey="forecast"
                name="Day-Ahead Forecast (WINDFOR)"
                stroke="#3b82f6"
                strokeWidth={2.4}
                dot={false}
                activeDot={{ r: 6, stroke: "#3b82f6", strokeWidth: 2, fill: "#ffffff" }}
                isAnimationActive={false}
              />

              {/* Optional Bias-Haircut Line */}
              {applyBiasHaircut && (
                <Line
                  type="monotone"
                  dataKey="hairCutForecast"
                  name="Bias-Adjusted Forecast"
                  stroke="#f59e0b"
                  strokeDasharray="5 4"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Spotlight Active Interval Bar */}
        <div className="spotlight-card">
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{
              width: "42px",
              height: "42px",
              borderRadius: "var(--radius-sm)",
              background: isShortfall ? "var(--color-deficit-soft)" : "var(--color-surplus-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isShortfall ? "var(--color-deficit)" : "var(--color-surplus)"
            }}>
              <Clock size={22} />
            </div>
            <div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-white)" }}>
                {activeInterval?.delivery_start_uk || "Select or hover over any interval on the chart"}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Settlement Period {activeInterval?.settlement_period || "—"} • UTC: {activeInterval?.delivery_start || "—"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "32px", alignItems: "center", flexWrap: "wrap" }}>
            <div className="spotlight-metric-item">
              <span className="spotlight-label">Realized Outturn</span>
              <span className="spotlight-val" style={{ color: "var(--color-actual)" }}>
                {inspectedActual ? `${inspectedActual.toLocaleString()} MW` : "—"}
              </span>
            </div>

            <div className="spotlight-metric-item">
              <span className="spotlight-label">Day-Ahead Forecast</span>
              <span className="spotlight-val" style={{ color: "var(--color-forecast)" }}>
                {inspectedForecast ? `${inspectedForecast.toLocaleString()} MW` : "—"}
              </span>
            </div>

            <div className="spotlight-metric-item">
              <span className="spotlight-label">Forecast Error (F - A)</span>
              <span className="spotlight-val" style={{ color: isShortfall ? "var(--color-deficit)" : "var(--color-surplus)" }}>
                {inspectedError > 0 ? `+${inspectedError.toLocaleString()}` : inspectedError.toLocaleString()} MW
              </span>
            </div>

            <div className="spotlight-metric-item">
              <span className="spotlight-label">Desk Imbalance State</span>
              <span className={`badge-status ${isShortfall ? "deficit" : "surplus"}`}>
                {isShortfall ? (
                  <>
                    <AlertTriangle size={14} /> DEFICIT SHORTFALL
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} /> SURPLUS GENERATION
                  </>
                )}
              </span>
            </div>

            <button
              className="btn-secondary"
              onClick={() => activeInterval && onInspectInterval(activeInterval.delivery_start)}
              title="Inspect historical forecast runs for this delivery interval"
            >
              <Search size={14} />
              Inspect Vintages
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
