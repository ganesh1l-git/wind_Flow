export interface VintageRecord {
  publish_time: string;
  publish_time_uk: string;
  generation_mw: number;
  is_eligible: boolean;
  is_selected: boolean;
  exclusion_reason?: string | null;
}

export interface IntervalRecord {
  delivery_start: string;
  delivery_start_uk: string;
  delivery_date: string;
  settlement_period?: number | null;
  actual_generation_mw?: number | null;
  forecast_generation_mw?: number | null;
  error_mw?: number | null;
  abs_error_mw?: number | null;
  selected_publish_time?: string | null;
  decision_cutoff_utc: string;
  has_actual: boolean;
  has_forecast: boolean;
  match_status: "MATCHED" | "MISSING_FORECAST" | "MISSING_ACTUAL" | "EXCLUDED" | string;
  demand_mw?: number | null;
  system_buy_price_gbp?: number | null;
  system_sell_price_gbp?: number | null;
  net_imbalance_volume_mwh?: number | null;
  day_ahead_procured_mw?: number | null;
  imbalance_cost_gbp?: number | null;
}

export interface AccuracyMetrics {
  total_calendar_intervals: number;
  intervals_with_actual: number;
  intervals_with_eligible_forecast: number;
  matched_intervals_count: number;
  forecast_coverage_pct: number;
  mae_mw?: number | null;
  rmse_mw?: number | null;
  bias_mw?: number | null;
  wape_pct?: number | null;
  median_abs_error_mw?: number | null;
  max_abs_error_mw?: number | null;
  max_abs_error_interval?: string | null;
  overforecast_count: number;
  underforecast_count: number;
  exact_forecast_count: number;
  avg_actual_mw?: number | null;
  avg_forecast_mw?: number | null;
  max_actual_mw?: number | null;
  min_actual_mw?: number | null;
  max_forecast_mw?: number | null;
  min_forecast_mw?: number | null;
}

export interface DailySummary {
  date: string;
  total_intervals: number;
  matched_intervals: number;
  mae_mw?: number | null;
  rmse_mw?: number | null;
  bias_mw?: number | null;
  wape_pct?: number | null;
  actual_energy_mwh: number;
  forecast_energy_mwh: number;
}

export interface ErrorDistributionBin {
  bin_start: number;
  bin_end: number;
  label: string;
  count: number;
}

export interface AnalysisMetadata {
  evaluation_period: string;
  start_date: string;
  end_date: string;
  decision_cutoff_time: string;
  timezone: string;
  pilot_assumption_notice: string;
  source_actuals: string;
  source_forecasts: string;
  calculated_at: string;
  data_source_mode: string;
}

export interface HourlyProfile {
  hour: number;
  label: string;
  avg_actual_mw: number;
  avg_forecast_mw: number;
  mae_mw: number;
  bias_mw: number;
  count: number;
}

export interface AnalysisResponse {
  metadata: AnalysisMetadata;
  metrics: AccuracyMetrics;
  daily_summaries: DailySummary[];
  error_distribution: ErrorDistributionBin[];
  hourly_profiles?: HourlyProfile[];
  series: IntervalRecord[];
}

export interface IntervalVintagesResponse {
  delivery_start: string;
  delivery_start_uk: string;
  delivery_date: string;
  cutoff_time_uk: string;
  decision_cutoff_utc: string;
  actual_generation_mw?: number | null;
  selected_forecast_mw?: number | null;
  selected_publish_time?: string | null;
  vintages: VintageRecord[];
  explanation: string;
}

export interface ProcurementScenarioResponse {
  illustrative_demand_mw: number;
  delivery_start: string;
  selected_forecast_mw: number;
  actual_generation_mw?: number | null;
  residual_procurement_mw: number;
  actual_residual_procurement_mw?: number | null;
  uncertainty_band_mae_mw: number;
  procurement_range_lower_mw: number;
  procurement_range_upper_mw: number;
  disclaimer: string;
  delivery_start_uk?: string | null;
  settlement_period?: number | null;
  elexon_demand_mw?: number | null;
  portfolio_share_pct?: number;
  system_buy_price_gbp?: number | null;
  system_sell_price_gbp?: number | null;
  imbalance_mw?: number | null;
  imbalance_cost_gbp?: number | null;
  is_shortfall?: boolean;
  data_source?: string;
}

export interface DailyProcurementSummary {
  date: string;
  demand_mwh: number;
  day_ahead_procured_mwh: number;
  actual_wind_mwh: number;
  forecast_wind_mwh: number;
  imbalance_mwh: number;
  cashout_cost_gbp: number;
  avg_system_buy_price: number;
  shortfall_intervals: number;
}

export interface ProcurementOverviewResponse {
  total_demand_mwh: number;
  total_day_ahead_procured_mwh: number;
  total_actual_procured_mwh: number;
  total_net_wind_imbalance_mwh: number;
  total_cashout_cost_gbp: number;
  avg_system_buy_price_gbp: number;
  max_system_buy_price_gbp: number;
  shortfall_intervals_count: number;
  surplus_intervals_count: number;
  worst_shortfall_interval?: {
    delivery_start: string;
    delivery_start_uk: string;
    settlement_period: number;
    demand_mw: number;
    forecast_mw: number;
    actual_mw: number;
    error_mw: number;
    system_buy_price_gbp: number;
    cashout_cost_gbp: number;
  } | null;
  highest_price_interval?: {
    delivery_start: string;
    delivery_start_uk: string;
    settlement_period: number;
    demand_mw: number;
    forecast_mw: number;
    actual_mw: number;
    error_mw: number;
    system_buy_price_gbp: number;
    cashout_cost_gbp: number;
  } | null;
  data_source: string;
  daily_summaries: DailyProcurementSummary[];
}

export interface HealthResponse {
  status: string;
  uptime_seconds: number;
  cached_actuals_count: number;
  cached_forecast_vintages_count: number;
  elexon_upstream_reachable: boolean;
  version: string;
}

export interface ConfigResponse {
  app_name: string;
  version: string;
  default_cutoff_time: string;
  default_start_date: string;
  default_end_date: string;
  uk_timezone: string;
  pilot_notice: string;
}
