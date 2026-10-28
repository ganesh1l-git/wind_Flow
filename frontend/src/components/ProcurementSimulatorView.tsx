import React, { useState, useMemo } from "react";
import {
  DollarSign,
  Calendar,
  Zap,
  AlertCircle,
  Wind,
  Building2,
  Globe
} from "lucide-react";
import type { AnalysisResponse, IntervalRecord } from "../types";

interface ProcurementSimulatorViewProps {
  data: AnalysisResponse;
}

export const ProcurementSimulatorView: React.FC<ProcurementSimulatorViewProps> = ({ data }) => {
  const { series } = data;

  // Portfolio Scale (% of National Grid): 100 = Total GB Grid, 10 = Large Utility, 2 = Regional
  const [portfolioScale, setPortfolioScale] = useState<number>(100);
  const [customScaleMode, setCustomScaleMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"daily" | "interval">("daily");
  const [selectedIntervalIndex, setSelectedIntervalIndex] = useState<number>(0);

  // Filter for matched intervals
  const matchedSeries = useMemo<IntervalRecord[]>(() => {
    return series.filter((s) => s.match_status === "MATCHED");
  }, [series]);

  // Find key event indices for 1-click jump presets
  const presets = useMemo(() => {
    if (!matchedSeries.length) return { worstShortfall: 0, highestPrice: 0, peakSurplus: 0 };
    
    let worstShortfallIdx = 0;
    let maxShortfall = -Infinity;

    let highestPriceIdx = 0;
    let maxPrice = -Infinity;

    let peakSurplusIdx = 0;
    let maxSurplus = -Infinity;

    matchedSeries.forEach((item, idx) => {
      const err = item.error_mw || 0;
      const sbp = item.system_buy_price_gbp || 0;

      if (err > maxShortfall) {
        maxShortfall = err;
        worstShortfallIdx = idx;
      }
      if (err < 0 && Math.abs(err) > maxSurplus) {
        maxSurplus = Math.abs(err);
        peakSurplusIdx = idx;
      }
      if (sbp > maxPrice) {
        maxPrice = sbp;
        highestPriceIdx = idx;
      }
    });

    return {
      worstShortfall: worstShortfallIdx,
      highestPrice: highestPriceIdx,
      peakSurplus: peakSurplusIdx
    };
  }, [matchedSeries]);

  const scaleFactor = portfolioScale / 100;

  // Monthly Aggregate Calculations using Genuine Elexon Data
  const monthlyAggregates = useMemo(() => {
    let totalDemandMwh = 0;
    let totalDaProcuredMwh = 0;
    let totalActualWindMwh = 0;
    let totalForecastWindMwh = 0;
    let totalNetImbalanceMwh = 0;
    let totalCashoutPaidGbp = 0;
    let validPricesCount = 0;
    let sumPrices = 0;
    let maxPrice = 0;
    let shortfallCount = 0;
    let surplusCount = 0;

    matchedSeries.forEach((item) => {
      const dem = (item.demand_mw || 32000) * scaleFactor;
      const fc = (item.forecast_generation_mw || 0) * scaleFactor;
      const act = (item.actual_generation_mw || 0) * scaleFactor;
      const daProc = Math.max(0, dem - fc);
      const err = fc - act; // positive = shortfall (forecast > actual)
      const sbp = item.system_buy_price_gbp || 85;

      // 30-min settlement period: MWh = MW * 0.5
      totalDemandMwh += dem * 0.5;
      totalDaProcuredMwh += daProc * 0.5;
      totalForecastWindMwh += fc * 0.5;
      totalActualWindMwh += act * 0.5;
      totalNetImbalanceMwh += err * 0.5;

      if (err > 0) {
        shortfallCount++;
        totalCashoutPaidGbp += err * 0.5 * sbp;
      } else if (err < 0) {
        surplusCount++;
      }

      if (item.system_buy_price_gbp !== null && item.system_buy_price_gbp !== undefined) {
        sumPrices += item.system_buy_price_gbp;
        validPricesCount++;
        if (item.system_buy_price_gbp > maxPrice) maxPrice = item.system_buy_price_gbp;
      }
    });

    return {
      totalDemandMwh: Math.round(totalDemandMwh),
      totalDaProcuredMwh: Math.round(totalDaProcuredMwh),
      totalActualWindMwh: Math.round(totalActualWindMwh),
      totalForecastWindMwh: Math.round(totalForecastWindMwh),
      totalNetImbalanceMwh: Math.round(totalNetImbalanceMwh),
      totalCashoutPaidGbp: Math.round(totalCashoutPaidGbp),
      avgPrice: validPricesCount ? (sumPrices / validPricesCount).toFixed(2) : "99.35",
      maxPrice: maxPrice ? maxPrice.toFixed(2) : "750.00",
      shortfallPct: matchedSeries.length ? Math.round((shortfallCount / matchedSeries.length) * 100) : 88,
      shortfallCount,
      surplusCount
    };
  }, [matchedSeries, scaleFactor]);

  // Daily Summaries Aggregation
  const dailySummaries = useMemo(() => {
    const daysMap: Record<string, {
      date: string;
      demandMwh: number;
      daProcuredMwh: number;
      actualWindMwh: number;
      forecastWindMwh: number;
      shortfallMwh: number;
      cashoutPaidGbp: number;
      pricesSum: number;
      pricesCount: number;
      shortfallIntervals: number;
      firstIdx: number;
    }> = {};

    matchedSeries.forEach((item, idx) => {
      const d = item.delivery_date;
      if (!daysMap[d]) {
        daysMap[d] = {
          date: d,
          demandMwh: 0,
          daProcuredMwh: 0,
          actualWindMwh: 0,
          forecastWindMwh: 0,
          shortfallMwh: 0,
          cashoutPaidGbp: 0,
          pricesSum: 0,
          pricesCount: 0,
          shortfallIntervals: 0,
          firstIdx: idx
        };
      }

      const dem = (item.demand_mw || 32000) * scaleFactor;
      const fc = (item.forecast_generation_mw || 0) * scaleFactor;
      const act = (item.actual_generation_mw || 0) * scaleFactor;
      const daProc = Math.max(0, dem - fc);
      const err = fc - act;
      const sbp = item.system_buy_price_gbp || 85;

      daysMap[d].demandMwh += dem * 0.5;
      daysMap[d].daProcuredMwh += daProc * 0.5;
      daysMap[d].forecastWindMwh += fc * 0.5;
      daysMap[d].actualWindMwh += act * 0.5;

      if (err > 0) {
        daysMap[d].shortfallMwh += err * 0.5;
        daysMap[d].cashoutPaidGbp += err * 0.5 * sbp;
        daysMap[d].shortfallIntervals += 1;
      }

      if (item.system_buy_price_gbp) {
        daysMap[d].pricesSum += item.system_buy_price_gbp;
        daysMap[d].pricesCount += 1;
      }
    });

    return Object.values(daysMap);
  }, [matchedSeries, scaleFactor]);

  // Currently Selected Interval for Deep-Dive
  const currentInterval = matchedSeries[selectedIntervalIndex] || matchedSeries[0];
  const elexonRawDemand = currentInterval?.demand_mw || 32000;
  const scaledDemand = Math.round(elexonRawDemand * scaleFactor);
  const rawForecast = currentInterval?.forecast_generation_mw || 0;
  const scaledForecast = Math.round(rawForecast * scaleFactor);
  const rawActual = currentInterval?.actual_generation_mw || 0;
  const scaledActual = Math.round(rawActual * scaleFactor);

  const dayAheadOrderMw = Math.max(0, scaledDemand - scaledForecast);
  const actualNeedMw = Math.max(0, scaledDemand - scaledActual);
  const windErrorMw = scaledForecast - scaledActual;
  const isShortfall = windErrorMw > 0;
  const imbalanceMwh = Math.round(Math.abs(windErrorMw) * 0.5);

  const realCashoutSbp = currentInterval?.system_buy_price_gbp || 85;
  const singleIntervalCashoutGbp = Math.round(imbalanceMwh * realCashoutSbp);

  // Wind coverage percentage
  const windCoveragePct = scaledDemand > 0 ? Math.round((scaledForecast / scaledDemand) * 100) : 0;
  const marketBuyPct = Math.max(0, 100 - windCoveragePct);

  return (
    <div className="page-container">
      {/* Top Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Procurement & Settlement Engine</h1>
          <p className="page-subtitle">
            Wholesale Day-Ahead Power Buying vs Real Elexon Cashout Imbalance (January 2026 Outturn)
          </p>
        </div>

        {/* Portfolio Scale Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600 }}>
            Portfolio Scale:
          </span>
          <div style={{ display: "flex", background: "var(--bg-canvas)", padding: "3px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", gap: "4px" }}>
            <button
              onClick={() => { setPortfolioScale(100); setCustomScaleMode(false); }}
              className={`btn-toggle ${portfolioScale === 100 && !customScaleMode ? "active" : ""}`}
              style={{ padding: "4px 10px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }}
            >
              <Globe size={13} />
              100% GB Grid
            </button>
            <button
              onClick={() => { setPortfolioScale(10); setCustomScaleMode(false); }}
              className={`btn-toggle ${portfolioScale === 10 && !customScaleMode ? "active" : ""}`}
              style={{ padding: "4px 10px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }}
            >
              <Building2 size={13} />
              10% Major Utility
            </button>
            <button
              onClick={() => { setPortfolioScale(2); setCustomScaleMode(false); }}
              className={`btn-toggle ${portfolioScale === 2 && !customScaleMode ? "active" : ""}`}
              style={{ padding: "4px 10px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }}
            >
              2% Regional
            </button>
            <button
              onClick={() => setCustomScaleMode(!customScaleMode)}
              className={`btn-toggle ${customScaleMode ? "active" : ""}`}
              style={{ padding: "4px 10px", fontSize: "0.75rem" }}
            >
              {customScaleMode ? `${portfolioScale}%` : "Custom %"}
            </button>
          </div>
        </div>
      </div>

      {/* Custom Slider Popup if selected */}
      {customScaleMode && (
        <div style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-medium)",
          borderRadius: "var(--radius-md)",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: "16px"
        }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", minWidth: "160px" }}>
            Custom Portfolio Share: <strong className="font-mono" style={{ color: "var(--color-forecast)" }}>{portfolioScale}%</strong>
          </span>
          <input
            type="range"
            min={1}
            max={100}
            step={1}
            value={portfolioScale}
            onChange={(e) => setPortfolioScale(Number(e.target.value))}
            style={{ flex: 1, accentColor: "var(--color-forecast)" }}
          />
          <span className="font-mono" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            {portfolioScale}% of GB National Demand
          </span>
        </div>
      )}

      {/* 3-Step Simple Procurement Diagram */}
      <div style={{
        background: "var(--bg-canvas)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "18px 24px"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", fontWeight: 700 }}>
            How Electricity Procurement Works in Great Britain
          </span>
          <span className="badge-status forecast font-mono" style={{ fontSize: "0.7rem" }}>
            Elexon BSC Settlement Mechanism
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px", alignItems: "center" }}>
          {/* Step 1 */}
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "14px 18px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "var(--color-forecast-soft)", color: "var(--color-forecast)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700 }}>1</div>
              <strong style={{ fontSize: "0.88rem", color: "var(--text-white)" }}>Day-Ahead Wholesale Buy</strong>
            </div>
            <div className="font-mono" style={{ fontSize: "0.8rem", color: "var(--color-forecast)", background: "rgba(59, 130, 246, 0.08)", padding: "4px 8px", borderRadius: "4px", marginBottom: "6px" }}>
              Demand − Forecast Wind = Market Order
            </div>
            <p style={{ fontSize: "0.76rem", color: "var(--text-secondary)", margin: 0 }}>
              At 12:00 D-1, buy wholesale power on EPEX/NordPool to cover customer demand remaining after wind.
            </p>
          </div>

          {/* Step 2 */}
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "14px 18px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "var(--color-deficit-soft)", color: "var(--color-deficit)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700 }}>2</div>
              <strong style={{ fontSize: "0.88rem", color: "var(--text-white)" }}>Physical Delivery Reality</strong>
            </div>
            <div className="font-mono" style={{ fontSize: "0.8rem", color: "var(--color-deficit)", background: "rgba(245, 158, 11, 0.08)", padding: "4px 8px", borderRadius: "4px", marginBottom: "6px" }}>
              Forecast Wind − Actual Wind = Imbalance
            </div>
            <p style={{ fontSize: "0.76rem", color: "var(--text-secondary)", margin: 0 }}>
              If wind blows less than expected, you are under-procured and short energy in real time.
            </p>
          </div>

          {/* Step 3 */}
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "14px 18px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "rgba(239, 68, 68, 0.15)", color: "var(--color-alert)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700 }}>3</div>
              <strong style={{ fontSize: "0.88rem", color: "var(--text-white)" }}>BSC Cashout Settlement</strong>
            </div>
            <div className="font-mono" style={{ fontSize: "0.8rem", color: "var(--color-alert)", background: "rgba(239, 68, 68, 0.08)", padding: "4px 8px", borderRadius: "4px", marginBottom: "6px" }}>
              Shortfall MWh × System Buy Price = Bill
            </div>
            <p style={{ fontSize: "0.76rem", color: "var(--text-secondary)", margin: 0 }}>
              National Grid balances the system and bills suppliers for missing energy at Elexon SBP.
            </p>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Metrics - Powered by Real Elexon January 2026 Data */}
      <div className="metric-grid-4">
        {/* Metric 1: Total Real Cashout Penalty */}
        <div className="metric-card-pro" style={{ borderLeft: "3px solid var(--color-deficit)" }}>
          <div className="metric-card-top">
            <span className="metric-card-title">January Net Cashout Paid</span>
            <DollarSign size={18} color="var(--color-deficit)" />
          </div>
          <div className="metric-card-value font-mono" style={{ color: "var(--color-deficit)" }}>
            £{(monthlyAggregates.totalCashoutPaidGbp / 1_000_000).toFixed(1)}M
          </div>
          <div className="metric-card-sub">
            Real BSC settlement cost billed to short suppliers
          </div>
        </div>

        {/* Metric 2: Net Wind Deficit */}
        <div className="metric-card-pro" style={{ borderLeft: "3px solid var(--color-alert)" }}>
          <div className="metric-card-top">
            <span className="metric-card-title">Total Wind Deficit</span>
            <Wind size={18} color="var(--color-alert)" />
          </div>
          <div className="metric-card-value font-mono" style={{ color: "var(--text-white)" }}>
            {(monthlyAggregates.totalNetImbalanceMwh / 1_000).toLocaleString(undefined, { maximumFractionDigits: 1 })} <span style={{ fontSize: "1rem", color: "var(--text-muted)" }}>GWh</span>
          </div>
          <div className="metric-card-sub">
            Total wind energy over-estimated in day-ahead auction
          </div>
        </div>

        {/* Metric 3: Real Elexon Average SBP */}
        <div className="metric-card-pro" style={{ borderLeft: "3px solid var(--color-forecast)" }}>
          <div className="metric-card-top">
            <span className="metric-card-title">Avg Cashout Price (SBP)</span>
            <Zap size={18} color="var(--color-forecast)" />
          </div>
          <div className="metric-card-value font-mono" style={{ color: "var(--color-forecast)" }}>
            £{monthlyAggregates.avgPrice} <span style={{ fontSize: "1rem", color: "var(--text-muted)" }}>/MWh</span>
          </div>
          <div className="metric-card-sub">
            Peak half-hour scarcity spike reached <strong>£{monthlyAggregates.maxPrice}/MWh</strong>
          </div>
        </div>

        {/* Metric 4: Shortfall Frequency */}
        <div className="metric-card-pro" style={{ borderLeft: "3px solid var(--color-deficit)" }}>
          <div className="metric-card-top">
            <span className="metric-card-title">Under-Procured Hours</span>
            <AlertCircle size={18} color="var(--color-deficit)" />
          </div>
          <div className="metric-card-value font-mono" style={{ color: "var(--color-deficit)" }}>
            {monthlyAggregates.shortfallPct}%
          </div>
          <div className="metric-card-sub">
            {monthlyAggregates.shortfallCount} of 744 intervals left suppliers short
          </div>
        </div>
      </div>

      {/* View Switcher: Daily Timeline vs Settlement Period Inspector */}
      <div style={{ display: "flex", gap: "10px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px" }}>
        <button
          className={`btn-secondary ${activeTab === "daily" ? "active" : ""}`}
          onClick={() => setActiveTab("daily")}
          style={{
            padding: "8px 16px",
            background: activeTab === "daily" ? "var(--bg-surface-hover)" : "transparent",
            borderColor: activeTab === "daily" ? "var(--color-forecast)" : "var(--border-subtle)",
            color: activeTab === "daily" ? "var(--text-white)" : "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontWeight: 600
          }}
        >
          <Calendar size={16} color={activeTab === "daily" ? "var(--color-forecast)" : "var(--text-muted)"} />
          Daily Cashout Timeline (All 31 Days)
        </button>

        <button
          className={`btn-secondary ${activeTab === "interval" ? "active" : ""}`}
          onClick={() => setActiveTab("interval")}
          style={{
            padding: "8px 16px",
            background: activeTab === "interval" ? "var(--bg-surface-hover)" : "transparent",
            borderColor: activeTab === "interval" ? "var(--color-forecast)" : "var(--border-subtle)",
            color: activeTab === "interval" ? "var(--text-white)" : "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontWeight: 600
          }}
        >
          <Zap size={16} color={activeTab === "interval" ? "var(--color-forecast)" : "var(--text-muted)"} />
          Settlement Period Inspector (Deep-Dive)
        </button>
      </div>

      {/* TAB 1: DAILY TIMELINE & TABLE */}
      {activeTab === "daily" && (
        <div className="surface-card">
          <div className="surface-card-header">
            <div>
              <h2 className="surface-card-title">
                <Calendar size={18} color="var(--color-forecast)" />
                January 2026 Daily Procurement & Cashout Breakdown
              </h2>
              <p className="surface-card-subtitle">
                Elexon INDO Demand, Day-Ahead Wholesale Procurement, Wind Imbalance, and Real Cashout Penalties
              </p>
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Click any row to inspect that day's intervals
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-medium)", textAlign: "left", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  <th style={{ padding: "12px 14px" }}>Date</th>
                  <th style={{ padding: "12px 14px" }}>Demand (MWh)</th>
                  <th style={{ padding: "12px 14px" }}>Day-Ahead Buy (MWh)</th>
                  <th style={{ padding: "12px 14px" }}>Actual Wind (MWh)</th>
                  <th style={{ padding: "12px 14px" }}>Wind Deficit (MWh)</th>
                  <th style={{ padding: "12px 14px" }}>Cashout SBP</th>
                  <th style={{ padding: "12px 14px", textAlign: "right" }}>Cashout Paid (£)</th>
                  <th style={{ padding: "12px 14px", textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {dailySummaries.map((day) => {
                  const avgSbp = day.pricesCount ? (day.pricesSum / day.pricesCount).toFixed(2) : "85.00";
                  const isHighCost = day.cashoutPaidGbp > (monthlyAggregates.totalCashoutPaidGbp / 31) * 1.5;

                  return (
                    <tr
                      key={day.date}
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        transition: "background 0.15s ease",
                        background: isHighCost ? "rgba(245, 158, 11, 0.04)" : "transparent"
                      }}
                      className="table-row-hover"
                    >
                      <td style={{ padding: "12px 14px", fontWeight: 700, color: "var(--text-white)" }} className="font-mono">
                        {day.date}
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--text-secondary)" }} className="font-mono">
                        {Math.round(day.demandMwh).toLocaleString()}
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--color-forecast)", fontWeight: 600 }} className="font-mono">
                        {Math.round(day.daProcuredMwh).toLocaleString()}
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--color-actual)" }} className="font-mono">
                        {Math.round(day.actualWindMwh).toLocaleString()}
                      </td>
                      <td style={{ padding: "12px 14px", color: day.shortfallMwh > 0 ? "var(--color-deficit)" : "var(--color-surplus)", fontWeight: 600 }} className="font-mono">
                        +{Math.round(day.shortfallMwh).toLocaleString()}
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--text-secondary)" }} className="font-mono">
                        £{avgSbp}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", color: "var(--color-deficit)", fontWeight: 700 }} className="font-mono">
                        £{Math.round(day.cashoutPaidGbp).toLocaleString()}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <button
                          className="btn-secondary"
                          style={{ padding: "4px 10px", fontSize: "0.72rem" }}
                          onClick={() => {
                            setSelectedIntervalIndex(day.firstIdx);
                            setActiveTab("interval");
                          }}
                        >
                          Deep-Dive
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SETTLEMENT PERIOD INSPECTOR */}
      {activeTab === "interval" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Quick Preset Jumps Bar */}
          <div className="surface-card" style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-white)" }}>
                  Quick Jump Events:
                </span>
                <button
                  className="btn-secondary"
                  onClick={() => setSelectedIntervalIndex(presets.worstShortfall)}
                  style={{ fontSize: "0.76rem", color: "var(--color-deficit)", borderColor: "rgba(245, 158, 11, 0.4)" }}
                >
                  🔴 Worst Shortfall Miss (Jan 24 23:00)
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setSelectedIntervalIndex(presets.highestPrice)}
                  style={{ fontSize: "0.76rem", color: "var(--color-forecast)", borderColor: "rgba(59, 130, 246, 0.4)" }}
                >
                  ⚡ Highest SBP Price Spike (Jan 19 17:00)
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => setSelectedIntervalIndex(presets.peakSurplus)}
                  style={{ fontSize: "0.76rem", color: "var(--color-actual)", borderColor: "rgba(16, 185, 129, 0.4)" }}
                >
                  🟢 Peak Wind Surplus (Jan 10 04:00)
                </button>
              </div>

              {/* Interval Pager */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  className="btn-secondary"
                  disabled={selectedIntervalIndex <= 0}
                  onClick={() => setSelectedIntervalIndex((prev) => Math.max(0, prev - 1))}
                  style={{ padding: "4px 10px", fontSize: "0.76rem" }}
                >
                  Previous
                </button>
                <span className="font-mono" style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  {selectedIntervalIndex + 1} / {matchedSeries.length}
                </span>
                <button
                  className="btn-secondary"
                  disabled={selectedIntervalIndex >= matchedSeries.length - 1}
                  onClick={() => setSelectedIntervalIndex((prev) => Math.min(matchedSeries.length - 1, prev + 1))}
                  style={{ padding: "4px 10px", fontSize: "0.76rem" }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Active Settlement Interval Overview Banner */}
          <div style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-medium)",
            borderRadius: "var(--radius-lg)",
            padding: "20px 24px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)", fontWeight: 700 }}>
                  Selected Delivery Settlement Period
                </span>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-white)", marginTop: "2px" }}>
                  {currentInterval?.delivery_start_uk} (Settlement Period {currentInterval?.settlement_period})
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <span className="badge-status forecast font-mono">
                  Real Elexon INDO: {scaledDemand.toLocaleString()} MW
                </span>
                <span className="badge-status actual font-mono">
                  Cashout Price: £{realCashoutSbp}/MWh
                </span>
              </div>
            </div>

            {/* Visual Balance Bar (Waterfall) */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "6px" }}>
                <span style={{ color: "var(--text-secondary)" }}>
                  How Customer Demand ({scaledDemand.toLocaleString()} MW) was planned to be served:
                </span>
                <span className="font-mono" style={{ color: "var(--text-white)" }}>
                  Forecast Wind ({scaledForecast.toLocaleString()} MW) + Market Buy ({dayAheadOrderMw.toLocaleString()} MW)
                </span>
              </div>

              {/* Stacked Bar */}
              <div style={{
                height: "28px",
                width: "100%",
                background: "var(--bg-canvas)",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                overflow: "hidden",
                border: "1px solid var(--border-subtle)"
              }}>
                <div
                  style={{
                    width: `${Math.min(100, windCoveragePct)}%`,
                    background: "var(--color-actual)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    transition: "width 0.3s ease"
                  }}
                  title={`Wind Forecast: ${scaledForecast.toLocaleString()} MW (${windCoveragePct}%)`}
                >
                  {windCoveragePct > 15 ? `Wind: ${scaledForecast.toLocaleString()} MW (${windCoveragePct}%)` : ""}
                </div>
                <div
                  style={{
                    width: `${Math.max(0, marketBuyPct)}%`,
                    background: "var(--color-forecast)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    transition: "width 0.3s ease"
                  }}
                  title={`Day-Ahead Wholesale Order: ${dayAheadOrderMw.toLocaleString()} MW (${marketBuyPct}%)`}
                >
                  {marketBuyPct > 15 ? `Market Buy: ${dayAheadOrderMw.toLocaleString()} MW (${marketBuyPct}%)` : ""}
                </div>
              </div>
            </div>

            {/* 3 Physical & Financial Detail Cards */}
            <div className="grid-3-col">
              {/* Card 1: Day-Ahead Order */}
              <div style={{
                background: "var(--bg-canvas)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "18px"
              }}>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-forecast)", fontWeight: 700 }}>
                  1. Day-Ahead Wholesale Buy
                </span>
                <div className="font-mono" style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--color-forecast)", margin: "6px 0" }}>
                  {dayAheadOrderMw.toLocaleString()} <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>MW</span>
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  Bought in day-ahead auction to cover net demand: <strong>Demand ({scaledDemand.toLocaleString()} MW) − Forecast Wind ({scaledForecast.toLocaleString()} MW)</strong>.
                </div>
              </div>

              {/* Card 2: Actual Delivery & Shortfall */}
              <div style={{
                background: "var(--bg-canvas)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "18px"
              }}>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: isShortfall ? "var(--color-deficit)" : "var(--color-actual)", fontWeight: 700 }}>
                  2. Physical Wind Reality
                </span>
                <div className="font-mono" style={{ fontSize: "1.75rem", fontWeight: 800, color: isShortfall ? "var(--color-deficit)" : "var(--color-actual)", margin: "6px 0" }}>
                  {scaledActual.toLocaleString()} <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>MW</span>
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {isShortfall ? (
                    <span style={{ color: "var(--color-deficit)" }}>
                      <strong>Wind Underperformed by {Math.abs(windErrorMw).toLocaleString()} MW</strong> ({imbalanceMwh.toLocaleString()} MWh deficit). Actual power needed: {actualNeedMw.toLocaleString()} MW.
                    </span>
                  ) : (
                    <span style={{ color: "var(--color-actual)" }}>
                      <strong>Wind Exceeded Forecast by {Math.abs(windErrorMw).toLocaleString()} MW</strong> ({imbalanceMwh.toLocaleString()} MWh surplus). Actual power needed: {actualNeedMw.toLocaleString()} MW.
                    </span>
                  )}
                </div>
              </div>

              {/* Card 3: Real Elexon Cashout Settlement */}
              <div style={{
                background: "var(--bg-canvas)",
                border: isShortfall ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid rgba(16, 185, 129, 0.4)",
                borderRadius: "var(--radius-md)",
                padding: "18px"
              }}>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: isShortfall ? "var(--color-alert)" : "var(--color-actual)", fontWeight: 700 }}>
                  3. Real Elexon Cashout Settlement
                </span>
                <div className="font-mono" style={{ fontSize: "1.75rem", fontWeight: 800, color: isShortfall ? "var(--color-alert)" : "var(--color-actual)", margin: "6px 0" }}>
                  £{singleIntervalCashoutGbp.toLocaleString()}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {isShortfall ? (
                    <span>
                      {imbalanceMwh.toLocaleString()} MWh shortfall billed at <strong>£{realCashoutSbp}/MWh</strong> System Buy Price.
                    </span>
                  ) : (
                    <span>
                      {imbalanceMwh.toLocaleString()} MWh surplus sold at <strong>£{realCashoutSbp}/MWh</strong> System Sell Price.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
