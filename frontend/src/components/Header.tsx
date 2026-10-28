import React from "react";
import {
  Wind,
  Download,
  Clock,
  TrendingUp,
  BarChart2,
  Sliders,
  Table
} from "lucide-react";
import type { HealthResponse } from "../types";
import { getCsvExportUrl } from "../services/api";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  startDate: string;
  endDate: string;
  cutoffTime: string;
  setCutoffTime: (t: string) => void;
  health: HealthResponse | null;
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
    <header className="main-navbar">
      {/* Brand & Subtitle */}
      <div className="nav-brand">
        <div className="brand-icon-box">
          <Wind size={18} color="#ffffff" />
        </div>
        <div>
          <div className="brand-name">
            WindLens <span className="badge-tag">PRO DESK</span>
          </div>
          <div className="brand-desc">UK Day-Ahead Wind Forecast Analytics Platform</div>
        </div>
      </div>

      {/* Spacious Navigation Tabs */}
      <nav className="nav-links">
        <button
          className={`nav-link-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <TrendingUp size={15} />
          Forecast Desk
        </button>
        <button
          className={`nav-link-btn ${activeTab === "variance" ? "active" : ""}`}
          onClick={() => setActiveTab("variance")}
        >
          <BarChart2 size={15} />
          Variance Analytics
        </button>
        <button
          className={`nav-link-btn ${activeTab === "procurement" ? "active" : ""}`}
          onClick={() => setActiveTab("procurement")}
        >
          <Sliders size={15} />
          Procurement Engine
        </button>
        <button
          className={`nav-link-btn ${activeTab === "ledger" ? "active" : ""}`}
          onClick={() => setActiveTab("ledger")}
        >
          <Table size={15} />
          Settlement Ledger
        </button>
      </nav>

      {/* Right Controls */}
      <div className="nav-actions">
        {/* Decision Cutoff Selector */}
        <div className="cutoff-badge-box" title="Elexon WINDFOR decision cutoff at D-1">
          <Clock size={14} color="var(--color-forecast)" />
          <span>Cutoff:</span>
          <select
            className="cutoff-select"
            value={cutoffTime}
            onChange={(e) => setCutoffTime(e.target.value)}
          >
            <option value="12:00">12:00 D-1 (EPEX / N2EX Gate)</option>
            <option value="11:00">11:00 D-1 (Early Pre-Auction)</option>
            <option value="14:00">14:00 D-1 (Post-Auction)</option>
            <option value="17:00">17:00 D-1 (Late Evening)</option>
          </select>
        </div>

        {/* Export Button */}
        <button className="btn-secondary" onClick={handleCsvExport} title="Download verified January 2026 dataset">
          <Download size={14} />
          Export CSV
        </button>

        {/* Live Elexon Status */}
        <div className="elexon-pill" title={health ? `Uptime: ${Math.round(health.uptime_seconds)}s | 18,080 forecast vintages` : "Connected"}>
          <div className="dot-live" />
          <span>Elexon Live Stream</span>
        </div>
      </div>
    </header>
  );
};
