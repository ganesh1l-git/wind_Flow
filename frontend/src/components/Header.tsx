import React from "react";
import {
  Wind,
  Download,
  Clock,
  Layers,
  Table,
  BarChart3,
  BookOpen
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
  endDate,
  cutoffTime,
  setCutoffTime,
  health
}) => {
  const handleCsvExport = () => {
    const url = getCsvExportUrl(startDate, endDate, cutoffTime);
    window.open(url, "_blank");
  };

  return (
    <header className="apple-header">
      {/* Brand & Subtitle */}
      <div className="brand-section">
        <div className="brand-logo-mark">
          <Wind size={16} color="#ffffff" />
        </div>
        <div>
          <div className="brand-title">
            WINDLENS <span className="brand-badge">PRO</span>
          </div>
        </div>
        <span className="brand-sub">| UK Day-Ahead Power Trading Desk</span>
      </div>

      {/* Segmented Mode Switcher */}
      <nav className="segmented-control">
        <button
          className={`segmented-pill ${activeTab === "cockpit" ? "active" : ""}`}
          onClick={() => setActiveTab("cockpit")}
        >
          <Layers size={13} />
          Executive Cockpit
        </button>
        <button
          className={`segmented-pill ${activeTab === "ledger" ? "active" : ""}`}
          onClick={() => setActiveTab("ledger")}
        >
          <Table size={13} />
          Settlement Ledger
        </button>
        <button
          className={`segmented-pill ${activeTab === "diurnal" ? "active" : ""}`}
          onClick={() => setActiveTab("diurnal")}
        >
          <BarChart3 size={13} />
          Diurnal & Distribution
        </button>
        <button
          className={`segmented-pill ${activeTab === "audit" ? "active" : ""}`}
          onClick={() => setActiveTab("audit")}
        >
          <BookOpen size={13} />
          Methodology & Audit
        </button>
      </nav>

      {/* Action & Cutoff Controls */}
      <div className="header-actions">
        {/* Decision Cutoff Selector */}
        <div className="control-pill" title="Decision cutoff: only forecasts published before this time on D-1 are eligible">
          <Clock size={12} color="var(--color-forecast)" />
          <span>Cutoff:</span>
          <select
            className="control-select"
            value={cutoffTime}
            onChange={(e) => setCutoffTime(e.target.value)}
          >
            <option value="12:00">12:00 D-1 (EPEX / N2EX Gate)</option>
            <option value="11:00">11:00 D-1 (Early Pre-Auction)</option>
            <option value="14:00">14:00 D-1 (Post-Auction)</option>
            <option value="17:00">17:00 D-1 (Late Evening)</option>
          </select>
        </div>

        {/* CSV Export Button */}
        <button className="action-btn-sm" onClick={handleCsvExport} title="Export verified interval data to CSV">
          <Download size={12} />
          Export CSV
        </button>

        {/* Elexon Stream API Live Status */}
        <div className="status-indicator" title={health ? `Uptime: ${Math.round(health.uptime_seconds)}s | Vintages: ${health.cached_forecast_vintages_count.toLocaleString()}` : "Connecting..."}>
          <div className="status-dot" />
          <span>Elexon Live</span>
        </div>
      </div>
    </header>
  );
};
