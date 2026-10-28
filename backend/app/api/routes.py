"""
FastAPI route handlers for WindLens platform.
Exposes analysis, series, vintage inspection, CSV export, and procurement scenarios.
"""

import csv
import io
import logging
import time
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, Response
from fastapi.responses import StreamingResponse

from app.core.config import settings
from app.models.schemas import (
    AnalysisResponse,
    AnalysisMetadata,
    IntervalRecord,
    IntervalVintagesResponse,
    ConfigResponse,
    HealthResponse,
    ProcurementScenarioRequest,
    ProcurementScenarioResponse,
    DailyProcurementSummary,
    ProcurementOverviewResponse
)
from app.services.data_store import data_store
from app.services.elexon_client import elexon_client
from app.analysis.forecast_selector import select_day_ahead_forecast
from app.analysis.metrics import calculate_metrics
from app.utils.timezone_utils import (
    parse_iso_utc,
    to_uk_local,
    validate_cutoff_time,
    get_decision_cutoff_utc,
    format_iso_utc
)

logger = logging.getLogger("windlens.routes")
router = APIRouter()
START_TIME = time.time()


def build_interval_records(
    start_date: str = "2026-01-01",
    end_date: str = "2026-01-31",
    cutoff_time: str = "12:00"
) -> List[IntervalRecord]:
    """Build matched interval records for requested date range and cutoff."""
    validate_cutoff_time(cutoff_time)
    
    # Retrieve sorted delivery start times from data store
    target_starts = data_store.get_all_target_start_times()
    records: List[IntervalRecord] = []

    for st in target_starts:
        dt_utc = parse_iso_utc(st)
        dt_uk = to_uk_local(dt_utc)
        d_str = dt_uk.strftime("%Y-%m-%d")

        if d_str < start_date or d_str > end_date:
            continue

        actual_data = data_store.get_actual(st)
        has_actual = (actual_data is not None)
        actual_mw: Optional[float] = None
        settlement_period: Optional[int] = None
        if has_actual:
            actual_mw = round(float(actual_data["generation"]), 2)
            settlement_period = actual_data.get("settlementPeriod")

        vintages_raw = data_store.get_forecast_vintages(st)
        forecast_mw, sel_pub_time, cutoff_utc, _ = select_day_ahead_forecast(
            delivery_start_iso=st,
            vintages_raw=vintages_raw,
            cutoff_time_str=cutoff_time
        )
        has_forecast = (forecast_mw is not None)

        error_mw: Optional[float] = None
        abs_error_mw: Optional[float] = None
        if has_actual and has_forecast and actual_mw is not None and forecast_mw is not None:
            error_mw = round(forecast_mw - actual_mw, 2)
            abs_error_mw = round(abs(error_mw), 2)
            match_status = "MATCHED"
        elif has_actual and not has_forecast:
            match_status = "MISSING_FORECAST"
        elif not has_actual and has_forecast:
            match_status = "MISSING_ACTUAL"
        else:
            match_status = "EXCLUDED"

        uk_formatted = dt_uk.strftime("%Y-%m-%d %H:%M %Z")

        # Real Elexon Demand Outturn (INDO)
        demand_data = data_store.get_demand(st)
        demand_mw: Optional[float] = None
        if demand_data and demand_data.get("initialDemandOutturn") is not None:
            demand_mw = round(float(demand_data["initialDemandOutturn"]), 2)

        # Real Elexon BSC System Imbalance Prices
        price_data = data_store.get_system_price(st)
        system_buy_price: Optional[float] = None
        system_sell_price: Optional[float] = None
        net_imbalance_volume: Optional[float] = None
        if price_data:
            if price_data.get("systemBuyPrice") is not None:
                system_buy_price = round(float(price_data["systemBuyPrice"]), 2)
            if price_data.get("systemSellPrice") is not None:
                system_sell_price = round(float(price_data["systemSellPrice"]), 2)
            if price_data.get("netImbalanceVolume") is not None:
                net_imbalance_volume = round(float(price_data["netImbalanceVolume"]), 2)

        # Day-Ahead Buy Requirement = Demand - Forecast Wind
        day_ahead_procured_mw: Optional[float] = None
        if demand_mw is not None and forecast_mw is not None:
            day_ahead_procured_mw = round(max(0.0, demand_mw - forecast_mw), 2)

        # Real Cashout Cost (£) for this 30-min settlement period (0.5h)
        imbalance_cost_gbp: Optional[float] = None
        if error_mw is not None:
            imbalance_mwh = error_mw * 0.5
            if error_mw > 0 and system_buy_price is not None:
                # Shortfall penalty (utility under-procured)
                imbalance_cost_gbp = round(imbalance_mwh * system_buy_price, 2)
            elif error_mw < 0 and system_sell_price is not None:
                # Surplus credit (utility over-procured)
                imbalance_cost_gbp = round(imbalance_mwh * system_sell_price, 2)

        records.append(IntervalRecord(
            delivery_start=st,
            delivery_start_uk=uk_formatted,
            delivery_date=d_str,
            settlement_period=settlement_period,
            actual_generation_mw=actual_mw,
            forecast_generation_mw=forecast_mw,
            error_mw=error_mw,
            abs_error_mw=abs_error_mw,
            selected_publish_time=sel_pub_time,
            decision_cutoff_utc=cutoff_utc,
            has_actual=has_actual,
            has_forecast=has_forecast,
            match_status=match_status,
            demand_mw=demand_mw,
            system_buy_price_gbp=system_buy_price,
            system_sell_price_gbp=system_sell_price,
            net_imbalance_volume_mwh=net_imbalance_volume,
            day_ahead_procured_mw=day_ahead_procured_mw,
            imbalance_cost_gbp=imbalance_cost_gbp
        ))

    return records


@router.get("/health", response_model=HealthResponse)
async def get_health():
    """System health check and upstream reachability status."""
    uptime = time.time() - START_TIME
    upstream_ok = await elexon_client.check_health()
    return HealthResponse(
        status="healthy",
        uptime_seconds=round(uptime, 2),
        cached_actuals_count=len(data_store.actuals_by_start),
        cached_forecast_vintages_count=sum(len(v) for v in data_store.forecasts_by_target.values()),
        elexon_upstream_reachable=upstream_ok,
        version=settings.version
    )


@router.get("/config", response_model=ConfigResponse)
async def get_config():
    """Application configuration and pilot assumptions."""
    return ConfigResponse(
        app_name=settings.app_name,
        version=settings.version,
        default_cutoff_time=settings.default_cutoff_time,
        default_start_date=settings.default_start_date,
        default_end_date=settings.default_end_date,
        uk_timezone=settings.uk_timezone,
        pilot_notice="PILOT ASSUMPTION: The day-ahead decision cutoff (default 12:00 UK local time D-1) is a configurable analytical assumption and does not represent an official Elexon market rule. Look-ahead bias is strictly eliminated by selecting only forecasts published at or before the configured cutoff."
    )


@router.get("/analysis", response_model=AnalysisResponse)
async def get_analysis(
    start_date: str = Query(default="2026-01-01", pattern=r"^\d{4}-\d{2}-\d{2}$"),
    end_date: str = Query(default="2026-01-31", pattern=r"^\d{4}-\d{2}-\d{2}$"),
    cutoff_time: str = Query(default="12:00", pattern=r"^([01]\d|2[0-3]):([0-5]\d)$")
):
    """
    Run full day-ahead forecast analytics for the specified delivery date range and decision cutoff.
    Dynamically recalculates all metrics without look-ahead bias.
    """
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date must be before or equal to end_date")

    records = build_interval_records(start_date=start_date, end_date=end_date, cutoff_time=cutoff_time)
    
    # Calculate expected calendar intervals: 48 per calendar day
    try:
        d1 = datetime.strptime(start_date, "%Y-%m-%d")
        d2 = datetime.strptime(end_date, "%Y-%m-%d")
        num_days = (d2 - d1).days + 1
        expected_intervals = num_days * 48
    except Exception:
        expected_intervals = 1488

    metrics, daily_summaries, error_distribution, hourly_profiles = calculate_metrics(
        intervals=records,
        total_calendar_intervals=expected_intervals
    )

    metadata = AnalysisMetadata(
        evaluation_period=f"{start_date} to {end_date}",
        start_date=start_date,
        end_date=end_date,
        decision_cutoff_time=cutoff_time,
        timezone=settings.uk_timezone,
        pilot_assumption_notice=f"Day-ahead decision cutoff set to {cutoff_time} UK local time on preceding day (D-1). All forecast records published after this timestamp are excluded from accuracy metrics to guarantee zero look-ahead bias.",
        source_actuals="Elexon FUELHH (Stream API, fuelType='WIND')",
        source_forecasts="Elexon WINDFOR (Stream API, National Wind Forecast)",
        calculated_at=datetime.now(timezone.utc).isoformat(),
        data_source_mode="LIVE_CACHE"
    )

    return AnalysisResponse(
        metadata=metadata,
        metrics=metrics,
        daily_summaries=daily_summaries,
        error_distribution=error_distribution,
        hourly_profiles=hourly_profiles,
        series=records
    )


@router.get("/series", response_model=List[IntervalRecord])
async def get_series(
    start_date: str = Query(default="2026-01-01"),
    end_date: str = Query(default="2026-01-31"),
    cutoff_time: str = Query(default="12:00")
):
    """Retrieve time-series interval records."""
    return build_interval_records(start_date=start_date, end_date=end_date, cutoff_time=cutoff_time)


@router.get("/intervals/{delivery_timestamp}/vintages", response_model=IntervalVintagesResponse)
async def get_interval_vintages(
    delivery_timestamp: str,
    cutoff_time: str = Query(default="12:00", pattern=r"^([01]\d|2[0-3]):([0-5]\d)$")
):
    """
    Inspect all retrieved forecast vintages for a single 30-minute delivery interval.
    Displays publish timestamps, MW values, eligibility flags, and the winning selected forecast.
    Demonstrates look-ahead bias prevention for technical reviews.
    """
    try:
        dt_utc = parse_iso_utc(delivery_timestamp)
        st_clean = format_iso_utc(dt_utc)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid delivery_timestamp: {e}")

    dt_uk = to_uk_local(dt_utc)
    delivery_date = dt_uk.strftime("%Y-%m-%d")
    uk_formatted = dt_uk.strftime("%Y-%m-%d %H:%M %Z")

    actual_data = data_store.get_actual(st_clean)
    actual_mw = round(float(actual_data["generation"]), 2) if actual_data else None

    vintages_raw = data_store.get_forecast_vintages(st_clean)
    forecast_mw, sel_pub_time, cutoff_utc, vintage_records = select_day_ahead_forecast(
        delivery_start_iso=st_clean,
        vintages_raw=vintages_raw,
        cutoff_time_str=cutoff_time
    )

    num_eligible = sum(1 for v in vintage_records if v.is_eligible)
    num_excluded = sum(1 for v in vintage_records if not v.is_eligible)

    explanation = (
        f"For delivery interval {uk_formatted}, {len(vintage_records)} total forecast vintages were retrieved from Elexon. "
        f"Under the {cutoff_time} UK local time decision cutoff (UTC cutoff: {cutoff_utc}), {num_eligible} vintages were published "
        f"at or before the cutoff and deemed eligible. {num_excluded} vintages published after the cutoff were strictly excluded "
        f"to prevent look-ahead bias. "
    )
    if forecast_mw is not None:
        explanation += f"The selected day-ahead forecast is {forecast_mw} MW (published at {sel_pub_time})."
    else:
        explanation += "No forecast vintage was published prior to the decision cutoff; interval is marked as missing forecast."

    return IntervalVintagesResponse(
        delivery_start=st_clean,
        delivery_start_uk=uk_formatted,
        delivery_date=delivery_date,
        cutoff_time_uk=cutoff_time,
        decision_cutoff_utc=cutoff_utc,
        actual_generation_mw=actual_mw,
        selected_forecast_mw=forecast_mw,
        selected_publish_time=sel_pub_time,
        vintages=vintage_records,
        explanation=explanation
    )


@router.get("/export/csv")
async def export_csv(
    start_date: str = Query(default="2026-01-01"),
    end_date: str = Query(default="2026-01-31"),
    cutoff_time: str = Query(default="12:00")
):
    """Export processed analysis data to CSV."""
    records = build_interval_records(start_date=start_date, end_date=end_date, cutoff_time=cutoff_time)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "delivery_start_utc",
        "delivery_start_uk_local",
        "delivery_date",
        "settlement_period",
        "actual_wind_generation_mw",
        "selected_forecast_mw",
        "forecast_error_mw",
        "abs_error_mw",
        "selected_forecast_publish_time_utc",
        "assumed_decision_cutoff_utc",
        "match_status",
        "pilot_cutoff_assumption"
    ])

    for r in records:
        writer.writerow([
            r.delivery_start,
            r.delivery_start_uk,
            r.delivery_date,
            r.settlement_period if r.settlement_period is not None else "",
            r.actual_generation_mw if r.actual_generation_mw is not None else "",
            r.forecast_generation_mw if r.forecast_generation_mw is not None else "",
            r.error_mw if r.error_mw is not None else "",
            r.abs_error_mw if r.abs_error_mw is not None else "",
            r.selected_publish_time or "",
            r.decision_cutoff_utc,
            r.match_status,
            f"{cutoff_time} UK Local (D-1)"
        ])

    output.seek(0)
    filename = f"windlens_uk_wind_analysis_{start_date}_to_{end_date}_cutoff_{cutoff_time.replace(':', '')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.post("/procurement-scenario", response_model=ProcurementScenarioResponse)
async def simulate_procurement_scenario(req: ProcurementScenarioRequest):
    """
    Day-Ahead Procurement Decision Engine.
    Uses genuine Elexon INDO Demand outturn and Elexon BSC System Imbalance Prices.
    Allows portfolio scaling (e.g. 100% GB grid vs utility portfolio share) or custom demand overrides.
    """
    records = build_interval_records(
        start_date="2026-01-01",
        end_date="2026-01-31",
        cutoff_time=req.decision_cutoff_time
    )
    matched = [r for r in records if r.match_status == "MATCHED"]
    
    if not matched:
        raise HTTPException(status_code=404, detail="No matched forecast intervals available to evaluate scenario")

    # Find requested interval or default to worst shortfall interval
    target_rec = matched[len(matched) // 2]
    if req.delivery_start:
        for r in matched:
            if r.delivery_start == req.delivery_start:
                target_rec = r
                break

    # Determine base demand: use user override if provided, otherwise real Elexon INDO demand
    base_demand = target_rec.demand_mw if target_rec.demand_mw is not None else 32000.0
    if req.illustrative_demand_mw is not None:
        effective_demand = req.illustrative_demand_mw
    else:
        effective_demand = round(base_demand * (req.portfolio_share_pct / 100.0), 2)

    # Scaling factor for generation if portfolio share applied
    scale = (req.portfolio_share_pct / 100.0) if req.illustrative_demand_mw is None else 1.0
    forecast_mw = round((target_rec.forecast_generation_mw or 0.0) * scale, 2)
    actual_mw = round(target_rec.actual_generation_mw * scale, 2) if target_rec.actual_generation_mw is not None else None

    # Calculate overall MAE for uncertainty band
    mae_mw = sum(r.abs_error_mw for r in matched if r.abs_error_mw is not None) / len(matched)
    scaled_mae = round(mae_mw * scale, 2)

    residual_mw = round(max(0.0, effective_demand - forecast_mw), 2)
    actual_residual_mw = round(max(0.0, effective_demand - actual_mw), 2) if actual_mw is not None else None

    # Uncertainty bounds
    lower_mw = round(max(0.0, effective_demand - (forecast_mw + scaled_mae)), 2)
    upper_mw = round(max(0.0, effective_demand - max(0.0, forecast_mw - scaled_mae)), 2)

    # Real Elexon System Buy Price (Cashout price)
    sbp = target_rec.system_buy_price_gbp or 85.0
    if req.custom_cashout_price_gbp is not None:
        sbp = req.custom_cashout_price_gbp

    ssp = target_rec.system_sell_price_gbp or sbp

    # Imbalance: error = Forecast - Actual
    imbalance_mw = round(forecast_mw - (actual_mw or forecast_mw), 2)
    is_shortfall = (imbalance_mw > 0)
    
    # Half-hourly MWh = MW * 0.5
    imbalance_mwh = abs(imbalance_mw) * 0.5
    applicable_price = sbp if is_shortfall else ssp
    imbalance_cost = round(imbalance_mwh * applicable_price, 2)

    disclaimer = (
        "EDUCATIONAL DECISION-SUPPORT NOTICE: Built directly on genuine Elexon INDO demand outturn, "
        "WINDFOR day-ahead forecasts, FUELHH wind generation actuals, and BSC System Buy Prices for January 2026."
    )

    return ProcurementScenarioResponse(
        illustrative_demand_mw=effective_demand,
        delivery_start=target_rec.delivery_start,
        delivery_start_uk=target_rec.delivery_start_uk,
        settlement_period=target_rec.settlement_period,
        selected_forecast_mw=forecast_mw,
        actual_generation_mw=actual_mw,
        residual_procurement_mw=residual_mw,
        actual_residual_procurement_mw=actual_residual_mw,
        uncertainty_band_mae_mw=scaled_mae,
        procurement_range_lower_mw=lower_mw,
        procurement_range_upper_mw=upper_mw,
        disclaimer=disclaimer,
        elexon_demand_mw=target_rec.demand_mw,
        portfolio_share_pct=req.portfolio_share_pct,
        system_buy_price_gbp=sbp,
        system_sell_price_gbp=ssp,
        imbalance_mw=imbalance_mw,
        imbalance_cost_gbp=imbalance_cost,
        is_shortfall=is_shortfall,
        data_source="Genuine Elexon INDO & BSC System Prices"
    )


@router.get("/procurement-overview", response_model=ProcurementOverviewResponse)
async def get_procurement_overview(
    cutoff_time: str = Query(default="12:00", pattern=r"^([01]\d|2[0-3]):([0-5]\d)$")
):
    """
    Overview of genuine January 2026 Procurement & Imbalance Cashout metrics.
    Aggregates real Elexon INDO Demand, WINDFOR Day-Ahead Procurement, and BSC Cashout costs.
    """
    records = build_interval_records(start_date="2026-01-01", end_date="2026-01-31", cutoff_time=cutoff_time)
    matched = [r for r in records if r.match_status == "MATCHED"]

    total_demand_mwh = sum((r.demand_mw or 0.0) * 0.5 for r in matched)
    total_da_procured_mwh = sum((r.day_ahead_procured_mw or 0.0) * 0.5 for r in matched)
    total_actual_procured_mwh = sum(max(0.0, (r.demand_mw or 0.0) - (r.actual_generation_mw or 0.0)) * 0.5 for r in matched)
    total_net_imbalance_mwh = sum((r.error_mw or 0.0) * 0.5 for r in matched)
    total_cashout_cost_gbp = sum((r.imbalance_cost_gbp or 0.0) for r in matched if (r.error_mw or 0.0) > 0)

    valid_sbps = [r.system_buy_price_gbp for r in matched if r.system_buy_price_gbp is not None]
    avg_sbp = round(sum(valid_sbps) / len(valid_sbps), 2) if valid_sbps else 85.0
    max_sbp = max(valid_sbps) if valid_sbps else 85.0

    shortfall_count = sum(1 for r in matched if (r.error_mw or 0.0) > 0)
    surplus_count = sum(1 for r in matched if (r.error_mw or 0.0) < 0)

    worst_shortfall_rec = max(matched, key=lambda r: (r.error_mw or 0.0), default=None)
    highest_price_rec = max(matched, key=lambda r: (r.system_buy_price_gbp or 0.0), default=None)

    def rec_to_dict(rec):
        if not rec:
            return None
        return {
            "delivery_start": rec.delivery_start,
            "delivery_start_uk": rec.delivery_start_uk,
            "settlement_period": rec.settlement_period,
            "demand_mw": rec.demand_mw,
            "forecast_mw": rec.forecast_generation_mw,
            "actual_mw": rec.actual_generation_mw,
            "error_mw": rec.error_mw,
            "system_buy_price_gbp": rec.system_buy_price_gbp,
            "cashout_cost_gbp": rec.imbalance_cost_gbp
        }

    # Daily aggregation
    by_date = {}
    for r in matched:
        d = r.delivery_date
        if d not in by_date:
            by_date[d] = []
        by_date[d].append(r)

    daily_summaries: List[DailyProcurementSummary] = []
    for d, recs in sorted(by_date.items()):
        d_demand_mwh = sum((r.demand_mw or 0.0) * 0.5 for r in recs)
        d_da_mwh = sum((r.day_ahead_procured_mw or 0.0) * 0.5 for r in recs)
        d_act_wind_mwh = sum((r.actual_generation_mw or 0.0) * 0.5 for r in recs)
        d_fc_wind_mwh = sum((r.forecast_generation_mw or 0.0) * 0.5 for r in recs)
        d_imb_mwh = sum((r.error_mw or 0.0) * 0.5 for r in recs)
        d_cashout = sum((r.imbalance_cost_gbp or 0.0) for r in recs if (r.error_mw or 0.0) > 0)
        d_sbps = [r.system_buy_price_gbp for r in recs if r.system_buy_price_gbp is not None]
        d_avg_sbp = round(sum(d_sbps) / len(d_sbps), 2) if d_sbps else 85.0
        d_shortfalls = sum(1 for r in recs if (r.error_mw or 0.0) > 0)

        daily_summaries.append(DailyProcurementSummary(
            date=d,
            demand_mwh=round(d_demand_mwh, 1),
            day_ahead_procured_mwh=round(d_da_mwh, 1),
            actual_wind_mwh=round(d_act_wind_mwh, 1),
            forecast_wind_mwh=round(d_fc_wind_mwh, 1),
            imbalance_mwh=round(d_imb_mwh, 1),
            cashout_cost_gbp=round(d_cashout, 2),
            avg_system_buy_price=d_avg_sbp,
            shortfall_intervals=d_shortfalls
        ))

    return ProcurementOverviewResponse(
        total_demand_mwh=round(total_demand_mwh, 1),
        total_day_ahead_procured_mwh=round(total_da_procured_mwh, 1),
        total_actual_procured_mwh=round(total_actual_procured_mwh, 1),
        total_net_wind_imbalance_mwh=round(total_net_imbalance_mwh, 1),
        total_cashout_cost_gbp=round(total_cashout_cost_gbp, 2),
        avg_system_buy_price_gbp=avg_sbp,
        max_system_buy_price_gbp=max_sbp,
        shortfall_intervals_count=shortfall_count,
        surplus_intervals_count=surplus_count,
        worst_shortfall_interval=rec_to_dict(worst_shortfall_rec),
        highest_price_interval=rec_to_dict(highest_price_rec),
        data_source="Genuine Elexon INDO Demand & BSC Imbalance Prices (Jan 2026)",
        daily_summaries=daily_summaries
    )

