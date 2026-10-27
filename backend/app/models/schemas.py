"""
Pydantic schemas for WindLens API requests and responses.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class VintageRecord(BaseModel):
    publish_time: str
    publish_time_uk: str
    generation_mw: float
    is_eligible: bool
    is_selected: bool
    exclusion_reason: Optional[str] = None


class IntervalRecord(BaseModel):
    delivery_start: str
    delivery_start_uk: str
    delivery_date: str
    settlement_period: Optional[int] = None
    actual_generation_mw: Optional[float] = None
    forecast_generation_mw: Optional[float] = None
    error_mw: Optional[float] = None
    abs_error_mw: Optional[float] = None
    selected_publish_time: Optional[str] = None
    decision_cutoff_utc: str
    has_actual: bool
    has_forecast: bool
    match_status: str  # "MATCHED", "MISSING_FORECAST", "MISSING_ACTUAL", "EXCLUDED"


class AccuracyMetrics(BaseModel):
    total_calendar_intervals: int
    intervals_with_actual: int
    intervals_with_eligible_forecast: int
    matched_intervals_count: int
    forecast_coverage_pct: float
    mae_mw: Optional[float] = None
    rmse_mw: Optional[float] = None
    bias_mw: Optional[float] = None
    wape_pct: Optional[float] = None
    median_abs_error_mw: Optional[float] = None
    max_abs_error_mw: Optional[float] = None
    max_abs_error_interval: Optional[str] = None
    overforecast_count: int = 0
    underforecast_count: int = 0
    exact_forecast_count: int = 0
    avg_actual_mw: Optional[float] = None
    avg_forecast_mw: Optional[float] = None
    max_actual_mw: Optional[float] = None
    min_actual_mw: Optional[float] = None
    max_forecast_mw: Optional[float] = None
    min_forecast_mw: Optional[float] = None


class DailySummary(BaseModel):
    date: str
    total_intervals: int
    matched_intervals: int
    mae_mw: Optional[float] = None
    rmse_mw: Optional[float] = None
    bias_mw: Optional[float] = None
    wape_pct: Optional[float] = None
    actual_energy_mwh: float = 0.0
    forecast_energy_mwh: float = 0.0


class ErrorDistributionBin(BaseModel):
    bin_start: float
    bin_end: float
    label: str
    count: int


class AnalysisMetadata(BaseModel):
    evaluation_period: str
    start_date: str
    end_date: str
    decision_cutoff_time: str
    timezone: str
    pilot_assumption_notice: str
    source_actuals: str
    source_forecasts: str
    calculated_at: str
    data_source_mode: str  # "LIVE_CACHE" or "ELEXON_API"


class HourlyProfile(BaseModel):
    hour: int
    label: str
    avg_actual_mw: float
    avg_forecast_mw: float
    mae_mw: float
    bias_mw: float
    count: int


class AnalysisResponse(BaseModel):
    metadata: AnalysisMetadata
    metrics: AccuracyMetrics
    daily_summaries: List[DailySummary]
    error_distribution: List[ErrorDistributionBin]
    hourly_profiles: List[HourlyProfile] = []
    series: List[IntervalRecord]


class IntervalVintagesResponse(BaseModel):
    delivery_start: str
    delivery_start_uk: str
    delivery_date: str
    cutoff_time_uk: str
    decision_cutoff_utc: str
    actual_generation_mw: Optional[float] = None
    selected_forecast_mw: Optional[float] = None
    selected_publish_time: Optional[str] = None
    vintages: List[VintageRecord]
    explanation: str


class ProcurementScenarioRequest(BaseModel):
    illustrative_demand_mw: float = Field(default=30000.0, ge=0.0, le=100000.0)
    decision_cutoff_time: str = "12:00"
    delivery_start: Optional[str] = None


class ProcurementScenarioResponse(BaseModel):
    illustrative_demand_mw: float
    delivery_start: str
    selected_forecast_mw: float
    actual_generation_mw: Optional[float]
    residual_procurement_mw: float  # Demand - Forecast Wind
    actual_residual_procurement_mw: Optional[float]  # Demand - Actual Wind
    uncertainty_band_mae_mw: float
    procurement_range_lower_mw: float
    procurement_range_upper_mw: float
    disclaimer: str


class HealthResponse(BaseModel):
    status: str
    uptime_seconds: float
    cached_actuals_count: int
    cached_forecast_vintages_count: int
    elexon_upstream_reachable: bool
    version: str


class ConfigResponse(BaseModel):
    app_name: str
    version: str
    default_cutoff_time: str
    default_start_date: str
    default_end_date: str
    uk_timezone: str
    pilot_notice: str
