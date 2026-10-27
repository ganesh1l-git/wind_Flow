import React, { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { ExecutiveDashboard } from "./components/ExecutiveDashboard";
import { ForecastChart } from "./components/ForecastChart";
import { ErrorAnalysisChart } from "./components/ErrorAnalysisChart";
import { DataTable } from "./components/DataTable";
import { ProcurementSimulator } from "./components/ProcurementSimulator";
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
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [startDate, setStartDate] = useState<string>("2026-01-01");
  const [endDate, setEndDate] = useState<string>("2026-01-31");
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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header with Navigation and Cutoff Controls */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        cutoffTime={cutoffTime}
        setCutoffTime={setCutoffTime}
        health={health}
        onRefresh={loadAnalysis}
        isLoading={isLoading}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: "20px 0" }}>
        {error ? (
          <div style={{
            margin: "40px auto",
            maxWidth: "600px",
            background: "rgba(244, 63, 94, 0.08)",
            border: "1px solid rgba(244, 63, 94, 0.3)",
            borderRadius: "12px",
            padding: "24px",
            textAlign: "center"
          }}>
            <AlertCircle size={40} color="var(--accent-rose)" style={{ margin: "0 auto 12px auto" }} />
            <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#fca5a5", marginBottom: "8px" }}>
              Unable to Load Analysis Data
            </h3>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "20px" }}>
              {error}
            </p>
            <button className="btn-primary" onClick={loadAnalysis} style={{ margin: "0 auto" }}>
              <RefreshCw size={15} /> Retry Request
            </button>
          </div>
        ) : isLoading && !analysisData ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "100px 20px" }}>
            <div className="spinner" style={{ width: "42px", height: "42px", borderWidth: "3px" }} />
            <div style={{ marginTop: "18px", fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>
              Running Day-Ahead Wind Forecast Analytics...
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "4px" }}>
              Applying {cutoffTime} UK local cutoff on preceding days & eliminating look-ahead bias
            </div>
          </div>
        ) : analysisData ? (
          <>
            {activeTab === "dashboard" && (
              <ExecutiveDashboard
                data={analysisData}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === "chart" && (
              <ForecastChart
                series={analysisData.series}
                onSelectInterval={handleInspectInterval}
              />
            )}

            {activeTab === "analytics" && (
              <ErrorAnalysisChart
                series={analysisData.series}
                dailySummaries={analysisData.daily_summaries}
                errorDistribution={analysisData.error_distribution}
              />
            )}

            {activeTab === "table" && (
              <DataTable
                series={analysisData.series}
                onInspectInterval={handleInspectInterval}
                onExportCsv={handleExportCsv}
              />
            )}

            {activeTab === "simulator" && (
              <ProcurementSimulator data={analysisData} />
            )}

            {activeTab === "methodology" && (
              <MethodologyPanel />
            )}
          </>
        ) : null}
      </main>

      {/* Forecast Vintage Audit Modal */}
      <VintageInspectorModal
        isOpen={inspectedInterval !== null}
        onClose={handleCloseVintageModal}
        data={vintagesData}
        isLoading={isVintagesLoading}
      />

      {/* Footer */}
      <footer style={{
        background: "var(--bg-secondary)",
        borderTop: "1px solid var(--border-color)",
        padding: "16px 24px",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "0.75rem",
        color: "var(--text-muted)",
        gap: "12px"
      }}>
        <div>
          <strong>WindLens</strong> • UK Day-Ahead Wind Forecast Analytics Platform • Developed for Energy Utilities
        </div>
        <div>
          Data sources: Elexon Insights Solution (BMRS) <code>FUELHH</code> (WIND) & <code>WINDFOR</code> (Stream API) • January 2026
        </div>
      </footer>
    </div>
  );
};

export default App;
