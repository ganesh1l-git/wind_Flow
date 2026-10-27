import React, { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { ForecastDeskView } from "./components/ForecastDeskView";
import { VarianceAnalyticsView } from "./components/VarianceAnalyticsView";
import { ProcurementSimulatorView } from "./components/ProcurementSimulatorView";
import { DataTable } from "./components/DataTable";
import { MethodologyPanel } from "./components/MethodologyPanel";
import { VintageInspectorModal } from "./components/VintageInspectorModal";
import type {
  AnalysisResponse,
  HealthResponse,
  IntervalVintagesResponse
} from "./types";
import {
  fetchHealth,
  fetchAnalysis,
  fetchIntervalVintages,
  getCsvExportUrl
} from "./services/api";
import { AlertCircle, RefreshCw } from "lucide-react";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const startDate = "2026-01-01";
  const endDate = "2026-01-31";
  const [cutoffTime, setCutoffTime] = useState<string>("12:00");

  const [analysisData, setAnalysisData] = useState<AnalysisResponse | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Vintage inspection state
  const [inspectedInterval, setInspectedInterval] = useState<string | null>(null);
  const [vintagesData, setVintagesData] = useState<IntervalVintagesResponse | null>(null);
  const [isVintagesLoading, setIsVintagesLoading] = useState<boolean>(false);

  // Load health status
  const loadHealth = useCallback(async () => {
    try {
      const h = await fetchHealth();
      setHealth(h);
    } catch (e) {
      console.warn("Health check error:", e);
    }
  }, []);

  // Load analysis
  const loadAnalysis = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAnalysis(startDate, endDate, cutoffTime);
      setAnalysisData(data);
    } catch (err: any) {
      console.error("Failed to load analysis:", err);
      setError(err.message || "Failed to communicate with WindLens backend service");
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, cutoffTime]);

  // Initial load
  useEffect(() => {
    loadHealth();
    loadAnalysis();
  }, [loadHealth, loadAnalysis]);

  // Handle vintage inspection
  const handleInspectInterval = async (deliveryTimestamp: string) => {
    setInspectedInterval(deliveryTimestamp);
    setIsVintagesLoading(true);
    try {
      const vData = await fetchIntervalVintages(deliveryTimestamp, cutoffTime);
      setVintagesData(vData);
    } catch (err) {
      console.error("Failed to fetch vintages:", err);
    } finally {
      setIsVintagesLoading(false);
    }
  };

  const handleCloseVintageModal = () => {
    setInspectedInterval(null);
    setVintagesData(null);
  };

  const handleExportCsv = () => {
    const url = getCsvExportUrl(startDate, endDate, cutoffTime);
    window.open(url, "_blank");
  };

  return (
    <div className="app-shell">
      {/* 1. Spacious App Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        startDate={startDate}
        endDate={endDate}
        cutoffTime={cutoffTime}
        setCutoffTime={setCutoffTime}
        health={health}
      />

      {/* 2. Main Page Content */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {error ? (
          <div style={{
            margin: "60px auto",
            maxWidth: "560px",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: "var(--radius-lg)",
            padding: "32px",
            textAlign: "center"
          }}>
            <AlertCircle size={40} color="var(--color-alert)" style={{ margin: "0 auto 16px auto" }} />
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fca5a5", marginBottom: "8px" }}>
              Unable to Retrieve Market Analysis Data
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "20px" }}>
              {error}
            </p>
            <button className="btn-secondary" onClick={loadAnalysis} style={{ margin: "0 auto" }}>
              <RefreshCw size={14} /> Retry Request
            </button>
          </div>
        ) : isLoading && !analysisData ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "120px 20px" }}>
            <div style={{
              width: "36px",
              height: "36px",
              border: "3px solid rgba(255,255,255,0.08)",
              borderTopColor: "var(--color-forecast)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite"
            }} />
            <div style={{ marginTop: "18px", fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
              Running Day-Ahead Wind Forecast Analytics...
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
              Applying {cutoffTime} UK Local Cutoff on Preceding Days • Eliminating Look-Ahead Bias
            </div>
          </div>
        ) : analysisData ? (
          <>
            {activeTab === "overview" && (
              <ForecastDeskView
                data={analysisData}
                onInspectInterval={handleInspectInterval}
              />
            )}

            {activeTab === "variance" && (
              <VarianceAnalyticsView data={analysisData} />
            )}

            {activeTab === "procurement" && (
              <ProcurementSimulatorView data={analysisData} />
            )}

            {activeTab === "ledger" && (
              <DataTable
                series={analysisData.series}
                onInspectInterval={handleInspectInterval}
                onExportCsv={handleExportCsv}
              />
            )}

            {activeTab === "methodology" && (
              <MethodologyPanel />
            )}
          </>
        ) : null}
      </main>

      {/* 3. Forecast Vintage Audit Modal */}
      <VintageInspectorModal
        isOpen={inspectedInterval !== null}
        onClose={handleCloseVintageModal}
        data={vintagesData}
        isLoading={isVintagesLoading}
      />

      {/* 4. Elegant Footer */}
      <footer className="app-footer">
        <div>
          <strong style={{ color: "var(--text-primary)" }}>WindLens</strong> • UK Day-Ahead Wind Forecast Analytics Platform • Developed for Energy Utilities
        </div>
        <div>
          Official Datasets: Elexon BMRS <code>FUELHH</code> (WIND) & <code>WINDFOR</code> Stream APIs • Evaluation Period: January 2026
        </div>
      </footer>
    </div>
  );
};

export default App;
