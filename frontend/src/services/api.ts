import type {
  AnalysisResponse,
  IntervalVintagesResponse,
  ProcurementScenarioResponse,
  ProcurementOverviewResponse,
  HealthResponse,
  ConfigResponse
} from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8001";

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
  options: {
    illustrativeDemandMw?: number;
    portfolioSharePct?: number;
    cutoffTime?: string;
    deliveryStart?: string;
    customCashoutPriceGbp?: number;
  } | number,
  cutoffTime: string = "12:00",
  deliveryStart?: string
): Promise<ProcurementScenarioResponse> {
  const body = typeof options === "number"
    ? {
        illustrative_demand_mw: options,
        decision_cutoff_time: cutoffTime,
        delivery_start: deliveryStart
      }
    : {
        illustrative_demand_mw: options.illustrativeDemandMw,
        portfolio_share_pct: options.portfolioSharePct ?? 100,
        decision_cutoff_time: options.cutoffTime ?? "12:00",
        delivery_start: options.deliveryStart,
        custom_cashout_price_gbp: options.customCashoutPriceGbp
      };

  const res = await fetch(`${API_BASE}/api/procurement-scenario`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorBody.detail || `Scenario simulation failed: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchProcurementOverview(
  cutoffTime: string = "12:00"
): Promise<ProcurementOverviewResponse> {
  const res = await fetch(`${API_BASE}/api/procurement-overview?cutoff_time=${cutoffTime}`);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorBody.detail || `Procurement overview request failed: HTTP ${res.status}`);
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
