import type {
  AnalysisResponse,
  IntervalVintagesResponse,
  ProcurementScenarioResponse,
  HealthResponse,
  ConfigResponse
} from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: HTTP ${res.status}`);
  return res.json();
}

export async function fetchConfig(): Promise<ConfigResponse> {
  const res = await fetch(`${API_BASE}/api/config`);
  if (!res.ok) throw new Error(`Config fetch failed: HTTP ${res.status}`);
  return res.json();
}

export async function fetchAnalysis(
  startDate: string = "2026-01-01",
  endDate: string = "2026-01-31",
  cutoffTime: string = "12:00"
): Promise<AnalysisResponse> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    cutoff_time: cutoffTime
  });
  const res = await fetch(`${API_BASE}/api/analysis?${params.toString()}`);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorBody.detail || `Analysis request failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchIntervalVintages(
  deliveryTimestamp: string,
  cutoffTime: string = "12:00"
): Promise<IntervalVintagesResponse> {
  const encoded = encodeURIComponent(deliveryTimestamp);
  const res = await fetch(`${API_BASE}/api/intervals/${encoded}/vintages?cutoff_time=${cutoffTime}`);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorBody.detail || `Vintage inspection request failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function simulateProcurement(
  illustrativeDemandMw: number,
  cutoffTime: string = "12:00",
  deliveryStart?: string
): Promise<ProcurementScenarioResponse> {
  const res = await fetch(`${API_BASE}/api/procurement-scenario`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      illustrative_demand_mw: illustrativeDemandMw,
      decision_cutoff_time: cutoffTime,
      delivery_start: deliveryStart
    })
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorBody.detail || `Scenario simulation failed: HTTP ${res.status}`);
  }
  return res.json();
}

export function getCsvExportUrl(
  startDate: string = "2026-01-01",
  endDate: string = "2026-01-31",
  cutoffTime: string = "12:00"
): string {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    cutoff_time: cutoffTime
  });
  return `${API_BASE}/api/export/csv?${params.toString()}`;
}
