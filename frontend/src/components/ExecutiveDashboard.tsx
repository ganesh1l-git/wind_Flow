import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
  Area
} from "recharts";
import {
  Sliders,
  AlertTriangle,
  Clock,
  Layers,
  Search,
  CheckCircle2,
  TrendingUp,
  Zap
} from "lucide-react";
import type { AnalysisResponse, IntervalRecord } from "../types";

interface ExecutiveDashboardProps {
  data: AnalysisResponse;
  onInspectInterval: (timestamp: string) => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  data,
  onInspectInterval
}) => {
  const { series, metrics, hourly_profiles = [] } = data;

  // Viewport time filter
  const [selectedRange, setSelectedRange] = useState<string>("all");
  const [showUncertaintyBand, setShowUncertaintyBand] = useState<boolean>(false);
  const [applyBiasHaircut, setApplyBiasHaircut] = useState<boolean>(false);

  // Active hovered interval or pinned interval
  const matchedSeries = useMemo(() => {
    return series.filter((s) => s.match_status === "MATCHED");
  }, [series]);

  // Find peak error interval as default
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

  // Filter series according to range selection
  const filteredSeries = useMemo(() => {
    if (selectedRange === "all") return series;
    return series.filter((s) => {
      const d = s.delivery_date;
      if (selectedRange === "w1") return d >= "2026-01-01" && d <= "2026-01-07";
      if (selectedRange === "w2") return d >= "2026-01-08" && d <= "2026-01-14";
      if (selectedRange === "w3") return d >= "2026-01-15" && d <= "2026-01-21";
      if (selectedRange === "w4") return d >= "2026-01-22" && d <= "2026-01-28";
      if (selectedRange === "w5") return d >= "2026-01-29" && d <= "2026-01-31";
      return true;
    });
  }, [series, selectedRange]);

  // Format data for Recharts
  const chartData = useMemo(() => {
    const mae = metrics.mae_mw || 2000;
    const bias = metrics.bias_mw || 1800;

    return filteredSeries
      .filter((s) => s.match_status === "MATCHED")
      .map((s) => {
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

  // Interactive Procurement Simulator State
  const [customDemandMw, setCustomDemandMw] = useState<number | null>(null);
  const realDemand = activeInterval?.demand_mw || 32000;
  const demandMw = customDemandMw !== null ? customDemandMw : realDemand;
  const realSbp = activeInterval?.system_buy_price_gbp || 85;
  const cashoutPriceGbp = realSbp;

  // Calculations for currently inspected interval
  const inspectedForecast = activeInterval?.forecast_generation_mw ?? (metrics.avg_forecast_mw || 12000);
  const inspectedActual = activeInterval?.actual_generation_mw ?? (metrics.avg_actual_mw || 10400);
  const inspectedError = activeInterval?.error_mw ?? Math.round(inspectedForecast - inspectedActual);

  // Procurement math
  const dayAheadOrder = Math.max(0, Math.round(demandMw - inspectedForecast));
  const actualNetRequirement = Math.max(0, Math.round(demandMw - inspectedActual));
  const imbalanceMwh = Math.round(Math.abs(inspectedError) * 0.5);
  const estCashoutExposure = Math.round(imbalanceMwh * cashoutPriceGbp);
  const isShortfall = inspectedError > 0;

  // Sync cursor scrubbing across charts
  const handleChartMouseMove = (e: any) => {
    if (e && e.activePayload && e.activePayload.length) {
      const rec = e.activePayload[0].payload.record;
      if (rec) {
        setActiveInterval(rec);
      }
    }
  };

  return (
    <div className="cockpit-viewport">
      {/* LEFT PANE: Dual Synchronized Charts (68%) */}
      <section className="cockpit-chart-pane">
        {/* Chart Header Bar */}
        <div className="chart-pane-header">
          <div className="chart-pane-title">
            <span>National Wind Generation</span>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 400 }}>
              (Elexon FUELHH Outturn vs Day-Ahead WINDFOR)
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Range Presets */}
            <div className="segmented-control">
              <button
                className={`segmented-pill ${selectedRange === "all" ? "active" : ""}`}
                onClick={() => setSelectedRange("all")}
                style={{ padding: "3px 8px", fontSize: "0.7rem" }}
              >
                All Jan
              </button>
              <button
                className={`segmented-pill ${selectedRange === "w1" ? "active" : ""}`}
                onClick={() => setSelectedRange("w1")}
                style={{ padding: "3px 8px", fontSize: "0.7rem" }}
              >
                W1
              </button>
              <button
                className={`segmented-pill ${selectedRange === "w2" ? "active" : ""}`}
                onClick={() => setSelectedRange("w2")}
                style={{ padding: "3px 8px", fontSize: "0.7rem" }}
              >
                W2
              </button>
              <button
                className={`segmented-pill ${selectedRange === "w3" ? "active" : ""}`}
                onClick={() => setSelectedRange("w3")}
                style={{ padding: "3px 8px", fontSize: "0.7rem" }}
              >
                W3
              </button>
              <button
                className={`segmented-pill ${selectedRange === "w4" ? "active" : ""}`}
                onClick={() => setSelectedRange("w4")}
                style={{ padding: "3px 8px", fontSize: "0.7rem" }}
              >
                W4
              </button>
              <button
                className={`segmented-pill ${selectedRange === "w5" ? "active" : ""}`}
                onClick={() => setSelectedRange("w5")}
                style={{ padding: "3px 8px", fontSize: "0.7rem" }}
              >
                W5
              </button>
            </div>

            {/* Uncertainty Band Toggle */}
            <button
              className={`action-btn-sm ${showUncertaintyBand ? "active" : ""}`}
              onClick={() => setShowUncertaintyBand(!showUncertaintyBand)}
              title="Toggle ±MAE uncertainty confidence ribbon"
              style={{
                borderColor: showUncertaintyBand ? "var(--color-forecast)" : undefined,
                color: showUncertaintyBand ? "var(--color-forecast)" : undefined
              }}
            >
              <Layers size={11} />
              ±MAE Band
            </button>

            {/* Bias Haircut Simulation Toggle */}
            <button
              className={`action-btn-sm ${applyBiasHaircut ? "active" : ""}`}
              onClick={() => setApplyBiasHaircut(!applyBiasHaircut)}
              title="Toggle illustrative -1,806 MW bias correction haircut"
              style={{
                borderColor: applyBiasHaircut ? "var(--color-deficit)" : undefined,
                color: applyBiasHaircut ? "var(--color-deficit)" : undefined
              }}
            >
              <Zap size={11} />
              Bias Haircut
            </button>

            {/* Compact Legend */}
            <div className="chart-legend-row">
              <div className="legend-chip">
                <div className="legend-bullet" style={{ background: "var(--color-actual)" }} />
                <span>Actual</span>
              </div>
              <div className="legend-chip">
                <div className="legend-bullet" style={{ background: "var(--color-forecast)" }} />
                <span>Forecast</span>
              </div>
              <div className="legend-chip">
                <div className="legend-bullet" style={{ background: "var(--color-deficit)" }} />
                <span>Deficit Risk</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dual Stacked Charts */}
        <div className="chart-dual-container">
          {/* UPPER TRACK: Generation (Actual vs Forecast) */}
          <div className="chart-upper-section">
            <span className="chart-section-badge">
              Track 1: Generation Outturn vs Selected Forecast (MW)
            </span>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                syncId="windLensSync"
                margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
                onMouseMove={handleChartMouseMove}
              >
                <defs>
                  <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.16} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" vertical={false} />

                <XAxis
                  dataKey="time"
                  stroke="#475569"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: "#cbd5e1" }}
                  interval="preserveStartEnd"
                  minTickGap={45}
                />

                <YAxis
                  stroke="#475569"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: "#cbd5e1" }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  width={38}
                  domain={[0, 'auto']}
                />

                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="apple-tooltip">
                          <div className="apple-tooltip-title">{d.ukLocal}</div>
                          <div className="apple-tooltip-row">
                            <span style={{ color: "var(--color-actual)" }}>● Outturn Actual:</span>
                            <span className="font-mono">{d.actual?.toLocaleString()} MW</span>
                          </div>
                          <div className="apple-tooltip-row">
                            <span style={{ color: "var(--color-forecast)" }}>▲ Selected Forecast:</span>
                            <span className="font-mono">{d.forecast?.toLocaleString()} MW</span>
                          </div>
                          {applyBiasHaircut && (
                            <div className="apple-tooltip-row">
                              <span style={{ color: "#94a3b8" }}>— Haircut (Bias-Adjusted):</span>
                              <span className="font-mono">{d.hairCutForecast?.toLocaleString()} MW</span>
                            </div>
                          )}
                          <div className="apple-tooltip-row" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "4px" }}>
                            <span style={{ color: d.error > 0 ? "var(--color-deficit)" : "var(--color-surplus)" }}>
                              Delta (F - A):
                            </span>
                            <span className="font-mono" style={{ color: d.error > 0 ? "var(--color-deficit)" : "var(--color-surplus)", fontWeight: 600 }}>
                              {d.error > 0 ? `+${d.error.toLocaleString()}` : d.error.toLocaleString()} MW
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                {/* Optional Uncertainty Tunnel */}
                {showUncertaintyBand && (
                  <Area
                    type="monotone"
                    dataKey="upperBand"
                    stroke="none"
                    fill="url(#bandGrad)"
                    isAnimationActive={false}
                  />
                )}

                {/* Actual Wind Generation Line */}
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual Wind Outturn"
                  stroke="#10b981"
                  strokeWidth={1.8}
                  dot={false}
                  activeDot={{ r: 4, stroke: "#10b981", strokeWidth: 2, fill: "#ffffff" }}
                  isAnimationActive={false}
                />

                {/* Selected Day-Ahead Forecast Line */}
                <Line
                  type="monotone"
                  dataKey="forecast"
                  name="Selected Day-Ahead Forecast"
                  stroke="#38bdf8"
                  strokeWidth={1.8}
                  dot={false}
                  activeDot={{ r: 4, stroke: "#38bdf8", strokeWidth: 2, fill: "#ffffff" }}
                  isAnimationActive={false}
                />

                {/* Optional Bias-Haircut Desk Forecast */}
                {applyBiasHaircut && (
                  <Line
                    type="monotone"
                    dataKey="hairCutForecast"
                    name="Bias-Adjusted Forecast"
                    stroke="#94a3b8"
                    strokeDasharray="4 3"
                    strokeWidth={1.4}
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* LOWER TRACK: Synchronized Forecast Error Delta */}
          <div className="chart-lower-section">
            <span className="chart-section-badge">
              Track 2: Residual Error Track e = Forecast - Actual (MW)
            </span>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                syncId="windLensSync"
                margin={{ top: 10, right: 12, left: 0, bottom: 2 }}
                onMouseMove={handleChartMouseMove}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" vertical={false} />

                <XAxis
                  dataKey="time"
                  stroke="#475569"
                  fontSize={9}
                  tickLine={false}
                  axisLine={{ stroke: "#cbd5e1" }}
                  interval="preserveStartEnd"
                  minTickGap={45}
                />

                <YAxis
                  stroke="#475569"
                  fontSize={9}
                  tickLine={false}
                  axisLine={{ stroke: "#cbd5e1" }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  width={38}
                />

                <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />

                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      const isOver = d.error > 0;
                      return (
                        <div className="apple-tooltip">
                          <div className="apple-tooltip-title">{d.ukLocal}</div>
                          <div className="apple-tooltip-row">
                            <span style={{ color: isOver ? "var(--color-deficit)" : "var(--color-surplus)" }}>
                              {isOver ? "Overforecast (Shortfall Deficit):" : "Underforecast (Surplus):"}
                            </span>
                            <span className="font-mono" style={{ fontWeight: 600 }}>
                              {isOver ? `+${d.error.toLocaleString()}` : d.error.toLocaleString()} MW
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                <Bar dataKey="error" maxBarSize={6} isAnimationActive={false}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`bar-${index}`}
                      fill={entry.error > 0 ? "var(--color-deficit)" : "var(--color-surplus)"}
                      opacity={0.8}
                    />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* RIGHT PANE: Tactical Decision & Procurement Cockpit (32%) */}
      <aside className="cockpit-sidebar-pane">
        {/* CARD 1: Live Crosshair & Vintage Inspector */}
        <div className="tactical-card" style={{ flex: "0 0 auto" }}>
          <div className="tactical-card-header">
            <div className="tactical-card-title">
              <Clock size={13} color="var(--color-forecast)" />
              <span>Interval Crosshair Inspector</span>
            </div>
            <button
              className="action-btn-sm"
              onClick={() => activeInterval && onInspectInterval(activeInterval.delivery_start)}
              title="Inspect all 24h forecast vintages leading up to cutoff"
              style={{ fontSize: "0.68rem", padding: "2px 7px" }}
            >
              <Search size={11} />
              Inspect Vintages
            </button>
          </div>

          {/* Delivery & Settlement Details */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-white)" }}>
              {activeInterval?.delivery_start_uk || "Hover or click chart"}
            </span>
            <span className="brand-badge" style={{ fontSize: "0.65rem" }}>
              SP {activeInterval?.settlement_period || "—"}
            </span>
          </div>

          {/* 4-Item Telemetry Matrix */}
          <div className="inspector-row">
            <div className="inspector-field">
              <div className="inspector-field-label">Actual Outturn</div>
              <div className="inspector-field-value" style={{ color: "var(--color-actual)" }}>
                {inspectedActual ? `${inspectedActual.toLocaleString()} MW` : "Missing"}
              </div>
            </div>

            <div className="inspector-field">
              <div className="inspector-field-label">Selected Forecast</div>
              <div className="inspector-field-value" style={{ color: "var(--color-forecast)" }}>
                {inspectedForecast ? `${inspectedForecast.toLocaleString()} MW` : "Missing"}
              </div>
            </div>

            <div className="inspector-field">
              <div className="inspector-field-label">Forecast Error (F - A)</div>
              <div
                className="inspector-field-value"
                style={{ color: isShortfall ? "var(--color-deficit)" : "var(--color-surplus)" }}
              >
                {inspectedError > 0 ? `+${inspectedError.toLocaleString()}` : inspectedError.toLocaleString()} MW
              </div>
            </div>

            <div className="inspector-field">
              <div className="inspector-field-label">Imbalance State</div>
              <div
                className="inspector-field-value"
                style={{
                  fontSize: "0.78rem",
                  color: isShortfall ? "var(--color-deficit)" : "var(--color-surplus)"
                }}
              >
                {isShortfall ? "DEFICIT (SHORT)" : "SURPLUS (LONG)"}
              </div>
            </div>
          </div>

          {/* Actionable Market Implication */}
          <div className={`decision-action-box ${isShortfall ? "" : "surplus"}`}>
            {isShortfall ? (
              <AlertTriangle size={15} color="var(--color-deficit)" style={{ flexShrink: 0, marginTop: "1px" }} />
            ) : (
              <CheckCircle2 size={15} color="var(--color-surplus)" style={{ flexShrink: 0, marginTop: "1px" }} />
            )}
            <div>
              {isShortfall ? (
                <>
                  <strong>CRITICAL UNDER-PROCUREMENT:</strong> Wind outturn was {Math.abs(inspectedError).toLocaleString()} MW below forecast.
                  Utility day-ahead order fell short; uncontracted volume is cashouted at the System Buy Price.
                </>
              ) : (
                <>
                  <strong>WIND SURPLUS:</strong> Wind generation exceeded forecast by {Math.abs(inspectedError).toLocaleString()} MW.
                  Utility long in imbalance settlement.
                </>
              )}
            </div>
          </div>
        </div>

        {/* CARD 2: Day-Ahead Procurement & Cashout Exposure Simulator */}
        <div className="tactical-card" style={{ flex: "0 0 auto" }}>
          <div className="tactical-card-header">
            <div className="tactical-card-title">
              <Sliders size={13} color="var(--color-deficit)" />
              <span>Day-Ahead Procurement & Cashout Risk</span>
            </div>
            <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
              Scenario Engine
            </span>
          </div>

          {/* Interactive Slider */}
          <div style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
              <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                {customDemandMw !== null ? "Custom Demand:" : "Elexon INDO Demand:"}
              </span>
              <span className="font-mono" style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-white)" }}>
                {demandMw.toLocaleString()} MW
              </span>
            </div>
            <input
              type="range"
              className="compact-slider"
              min={15000}
              max={45000}
              step={500}
              value={demandMw}
              onChange={(e) => setCustomDemandMw(Number(e.target.value))}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.62rem", color: "var(--text-muted)", marginTop: "2px" }}>
              <span>15k MW (Low)</span>
              <span>{realDemand.toLocaleString()} MW (Elexon Actual)</span>
              <span>45k MW (Peak)</span>
            </div>
          </div>

          {/* Financial Imbalance Exposure Grid */}
          <div className="inspector-row" style={{ marginBottom: "6px" }}>
            <div className="inspector-field">
              <div className="inspector-field-label">Day-Ahead Buy Order</div>
              <div className="inspector-field-value font-mono" style={{ fontSize: "0.85rem" }}>
                {dayAheadOrder.toLocaleString()} MW
              </div>
              <div style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>Demand - Forecast</div>
            </div>

            <div className="inspector-field">
              <div className="inspector-field-label">Actual Residual Need</div>
              <div className="inspector-field-value font-mono" style={{ fontSize: "0.85rem" }}>
                {actualNetRequirement.toLocaleString()} MW
              </div>
              <div style={{ fontSize: "0.62rem", color: "var(--text-muted)" }}>Demand - Actual Outturn</div>
            </div>
          </div>

          {/* Financial Risk Capsule */}
          <div style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            padding: "8px 10px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                <span>Real Elexon SBP:</span>
                <span className="font-mono" style={{ color: "var(--color-forecast)", fontWeight: 700 }}>
                  £{cashoutPriceGbp}/MWh
                </span>
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                {imbalanceMwh.toLocaleString()} MWh deficit volume (30-min)
              </div>
            </div>
            <div className="font-mono" style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-deficit)" }}>
              £{estCashoutExposure.toLocaleString()}
            </div>
          </div>
        </div>

        {/* CARD 3: 24-Hour Diurnal Error Profile */}
        <div className="tactical-card" style={{ flex: 1, minHeight: 0 }}>
          <div className="tactical-card-header">
            <div className="tactical-card-title">
              <TrendingUp size={13} color="var(--color-actual)" />
              <span>Diurnal 24-Hour Risk Profile</span>
            </div>
            <span style={{ fontSize: "0.65rem", color: "var(--color-deficit)", fontWeight: 600 }}>
              Peak Evening Bias
            </span>
          </div>

          <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
            Average forecast bias (MW) by hour of day (00:00 - 23:00):
          </div>

          {/* 24-hour diurnal mini bar chart */}
          <div className="diurnal-bar-container">
            {hourly_profiles.map((hp) => {
              const maxBias = 2500;
              const heightPct = Math.min(100, Math.max(15, (hp.bias_mw / maxBias) * 100));
              const isPeakHour = hp.hour >= 17 && hp.hour <= 19;

              return (
                <div
                  key={`hour-${hp.hour}`}
                  className="diurnal-bar-col"
                  title={`Hour ${hp.label}: Bias +${Math.round(hp.bias_mw)} MW | MAE ${Math.round(hp.mae_mw)} MW`}
                >
                  <div
                    className="diurnal-bar-fill"
                    style={{
                      height: `${heightPct}%`,
                      background: isPeakHour ? "var(--color-alert)" : "var(--color-deficit)",
                      opacity: isPeakHour ? 1 : 0.75
                    }}
                  />
                  {hp.hour % 4 === 0 && (
                    <span className="diurnal-bar-label">{hp.hour}h</span>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.65rem",
            color: "var(--text-muted)",
            marginTop: "6px",
            borderTop: "1px solid var(--border-subtle)",
            paddingTop: "4px"
          }}>
            <span>00:00 (Night Base)</span>
            <span style={{ color: "var(--color-alert)", fontWeight: 600 }}>17:00-19:00 (Peak Demand Exposure)</span>
            <span>23:00</span>
          </div>
        </div>
      </aside>
    </div>
  );
};
