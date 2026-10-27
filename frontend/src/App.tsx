import React, { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { MetricRibbon } from "./components/MetricRibbon";
import { ExecutiveDashboard } from "./components/ExecutiveDashboard";
import { DataTable } from "./components/DataTable";
import { ErrorAnalysisChart } from "./components/ErrorAnalysisChart";
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
  fetchIntervalVintages
} from "./services/api";
import { AlertCircle, RefreshCw } from "lucide-react";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("cockpit");
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

  return (
    <div style={{ height: "100vh", width: "100vw", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* 1. Apple Pro Command Header (46px) */}
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

      {/* 2. Precision Metric Ribbon (38px) */}
      {analysisData && <MetricRibbon metrics={analysisData.metrics} />}

      {/* 3. Main Workspace Area */}
      <main style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {error ? (
          <div style={{
            margin: "40px auto",
            maxWidth: "520px",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: "var(--radius-md)",
            padding: "24px",
            textAlign: "center"
          }}>
            <AlertCircle size={36} color="var(--color-alert)" style={{ margin: "0 auto 12px auto" }} />
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#fca5a5", marginBottom: "8px" }}>
              Unable to Retrieve Market Analysis
            </h3>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: "16px" }}>
              {error}
            </p>
            <button className="action-btn-sm" onClick={loadAnalysis} style={{ margin: "0 auto" }}>
              <RefreshCw size={13} /> Retry Analysis
            </button>
          </div>
        ) : isLoading && !analysisData ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1 }}>
            <div style={{
              width: "32px",
              height: "32px",
              border: "2px solid rgba(255,255,255,0.08)",
              borderTopColor: "var(--color-forecast)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite"
            }} />
            <div style={{ marginTop: "14px", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
              Loading Elexon Day-Ahead Power Analysis...
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "3px" }}>
              Enforcing {cutoffTime} UK Local Cutoff • Eliminating Look-Ahead Bias
            </div>
          </div>
        ) : analysisData ? (
          <>
            {activeTab === "cockpit" && (
              <ExecutiveDashboard
                data={analysisData}
                onInspectInterval={handleInspectInterval}
              />
            )}

            {activeTab === "ledger" && (
              <DataTable
                series={analysisData.series}
                onInspectInterval={handleInspectInterval}
                onExportCsv={() => {}}
              />
            )}

            {activeTab === "diurnal" && (
              <ErrorAnalysisChart
                dailySummaries={analysisData.daily_summaries}
                errorDistribution={analysisData.error_distribution}
                hourlyProfiles={analysisData.hourly_profiles}
              />
            )}

            {activeTab === "audit" && (
              <MethodologyPanel />
            )}
          </>
        ) : null}
      </main>

      {/* 4. Forecast Vintage Audit Modal */}
      <VintageInspectorModal
        isOpen={inspectedInterval !== null}
        onClose={handleCloseVintageModal}
        data={vintagesData}
        isLoading={isVintagesLoading}
      />
    </div>
  );
};

export default App;
