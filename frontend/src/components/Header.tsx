import {
  Wind,
  Clock,
  Calendar,
  Download,
  Activity,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import type { HealthResponse } from "../types";
import { getCsvExportUrl } from "../services/api";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;
  cutoffTime: string;
  setCutoffTime: (t: string) => void;
  health: HealthResponse | null;
  onRefresh: () => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  cutoffTime,
  setCutoffTime,
  health,
  onRefresh,
  isLoading
}) => {
  const tabs = [
    { id: "dashboard", label: "Executive Dashboard" },
    { id: "chart", label: "Forecast vs Actual" },
    { id: "analytics", label: "Error & Accuracy Analytics" },
    { id: "table", label: "Interval Explorer" },
    { id: "simulator", label: "Procurement Simulator" },
    { id: "methodology", label: "Methodology & Audit" }
  ];

  const handleDatePreset = (preset: string) => {
    switch (preset) {
      case "full":
        setStartDate("2026-01-01");
        setEndDate("2026-01-31");
        break;
      case "w1":
        setStartDate("2026-01-01");
        setEndDate("2026-01-07");
        break;
      case "w2":
        setStartDate("2026-01-08");
        setEndDate("2026-01-14");
        break;
      case "w3":
        setStartDate("2026-01-15");
        setEndDate("2026-01-21");
        break;
      case "w4":
        setStartDate("2026-01-22");
        setEndDate("2026-01-31");
        break;
    }
  };

  const handleCsvExport = () => {
    const url = getCsvExportUrl(startDate, endDate, cutoffTime);
    window.open(url, "_blank");
  };

  return (
    <header className="header-container">
      {/* Top bar with branding and system health */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{
            width: "42px",
            height: "42px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #0284c7, #06b6d4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 15px rgba(6, 182, 212, 0.4)"
          }}>
            <Wind size={24} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.02em" }}>WindLens</h1>
              <span className="badge badge-pilot">Pilot Platform</span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>v1.0.0</span>
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
              UK Day-Ahead Wind Forecast Analytics • Elexon FUELHH & WINDFOR
            </p>
          </div>
        </div>

        {/* System & API status badges */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 12px",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            fontSize: "0.75rem"
          }}>
            {health?.status === "healthy" ? (
              <CheckCircle2 size={14} color="#10b981" />
            ) : (
              <AlertCircle size={14} color="#f59e0b" />
            )}
            <span style={{ color: "var(--text-secondary)" }}>Backend:</span>
            <span style={{ fontWeight: 600, color: health?.status === "healthy" ? "#34d399" : "#fbbf24" }}>
              {health?.status === "healthy" ? "Online" : "Connecting..."}
            </span>
            <span style={{ color: "var(--border-color)", margin: "0 4px" }}>|</span>
            <span style={{ color: "var(--text-muted)" }}>
              {health ? `${health.cached_actuals_count} actuals / ${health.cached_forecast_vintages_count} vintages` : "Loading cache"}
            </span>
          </div>

          <button
            onClick={handleCsvExport}
            className="btn-secondary"
            title="Download processed analysis as CSV"
          >
            <Download size={15} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Interactive Controls Bar: Cutoff & Dates */}
      <div className="control-bar">
        {/* Day-Ahead Decision Cutoff control */}
        <div className="control-group">
          <Clock size={16} color="var(--accent-cyan)" />
          <span className="control-label">Assumed Decision Cutoff (UK Local D-1):</span>
          <select
            className="select-input"
            value={cutoffTime}
            onChange={(e) => setCutoffTime(e.target.value)}
            disabled={isLoading}
          >
            <option value="09:00">09:00 UK Local (Early Morning)</option>
            <option value="11:00">11:00 UK Local (Pre-Auction)</option>
            <option value="12:00">12:00 UK Local (Default Pilot Assumption)</option>
            <option value="14:00">14:00 UK Local (Post-Auction)</option>
            <option value="17:00">17:00 UK Local (Late Day-Ahead)</option>
          </select>
          <span className="badge badge-pilot" title="Pilot assumption for backtesting">
            Pilot Assumption
          </span>
        </div>

        {/* Date Filter & Presets */}
        <div className="control-group">
          <Calendar size={16} color="var(--accent-cyan)" />
          <span className="control-label">Delivery Period:</span>
          <input
            type="date"
            className="date-input"
            value={startDate}
            min="2026-01-01"
            max="2026-01-31"
            onChange={(e) => setStartDate(e.target.value)}
            disabled={isLoading}
          />
          <span style={{ color: "var(--text-muted)" }}>to</span>
          <input
            type="date"
            className="date-input"
            value={endDate}
            min="2026-01-01"
            max="2026-01-31"
            onChange={(e) => setEndDate(e.target.value)}
            disabled={isLoading}
          />

          <div style={{ display: "flex", gap: "4px", marginLeft: "6px" }}>
            <button
              className="btn-secondary"
              style={{ padding: "4px 8px", fontSize: "0.75rem" }}
              onClick={() => handleDatePreset("full")}
            >
              Full Month
            </button>
            <button
              className="btn-secondary"
              style={{ padding: "4px 8px", fontSize: "0.75rem" }}
              onClick={() => handleDatePreset("w1")}
            >
              W1
            </button>
            <button
              className="btn-secondary"
              style={{ padding: "4px 8px", fontSize: "0.75rem" }}
              onClick={() => handleDatePreset("w2")}
            >
              W2
            </button>
            <button
              className="btn-secondary"
              style={{ padding: "4px 8px", fontSize: "0.75rem" }}
              onClick={() => handleDatePreset("w3")}
            >
              W3
            </button>
            <button
              className="btn-secondary"
              style={{ padding: "4px 8px", fontSize: "0.75rem" }}
              onClick={() => handleDatePreset("w4")}
            >
              W4
            </button>
          </div>
        </div>

        {/* Refresh / Recalculate */}
        <button
          className="btn-primary"
          onClick={onRefresh}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="spinner" style={{ width: "14px", height: "14px", borderWidth: "2px" }} />
              Recalculating...
            </>
          ) : (
            <>
              <Activity size={15} />
              Recalculate
            </>
          )}
        </button>
      </div>

      {/* Navigation Tabs */}
      <nav className="nav-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-tab-btn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  );
};
