"""
Unit tests for Accuracy Metrics: MAE, RMSE, Bias, and WAPE.
"""

import math
import pytest
from app.models.schemas import IntervalRecord
from app.analysis.metrics import calculate_metrics


def make_interval(
    delivery_start: str,
    actual_mw: float | None,
    forecast_mw: float | None,
    match_status: str = "MATCHED"
) -> IntervalRecord:
    error_mw = (forecast_mw - actual_mw) if (forecast_mw is not None and actual_mw is not None) else None
    abs_err = abs(error_mw) if error_mw is not None else None
    return IntervalRecord(
        delivery_start=delivery_start,
        delivery_start_uk=f"{delivery_start} GMT",
        delivery_date=delivery_start[:10],
        settlement_period=1,
        actual_generation_mw=actual_mw,
        forecast_generation_mw=forecast_mw,
        error_mw=error_mw,
        abs_error_mw=abs_err,
        selected_publish_time="2026-01-01T10:00:00Z",
        decision_cutoff_utc="2026-01-01T12:00:00Z",
        has_actual=(actual_mw is not None),
        has_forecast=(forecast_mw is not None),
        match_status=match_status
    )


def test_standard_paired_accuracy_metrics():
    """Verify standard formulas: MAE, RMSE, Bias, and WAPE."""
    intervals = [
        make_interval("2026-01-02T10:00:00Z", actual_mw=1000.0, forecast_mw=1200.0), # e = +200, |e| = 200
        make_interval("2026-01-02T10:30:00Z", actual_mw=2000.0, forecast_mw=1800.0), # e = -200, |e| = 200
        make_interval("2026-01-02T11:00:00Z", actual_mw=1500.0, forecast_mw=1600.0), # e = +100, |e| = 100
        make_interval("2026-01-02T11:30:00Z", actual_mw=1500.0, forecast_mw=1200.0), # e = -300, |e| = 300
    ]
    # Errors: [200, -200, 100, -300]
    # Abs:    [200,  200, 100,  300] -> Sum = 800 -> MAE = 800 / 4 = 200.0
    # Squared: [40000, 40000, 10000, 90000] -> Sum = 180000 -> RMSE = sqrt(180000 / 4) = sqrt(45000) = 212.13
    # Bias: (200 - 200 + 100 - 300) / 4 = -200 / 4 = -50.0
    # Actuals sum: 1000 + 2000 + 1500 + 1500 = 6000
    # WAPE: 800 / 6000 * 100 = 13.33%

    metrics, daily, bins, hourly = calculate_metrics(intervals, total_calendar_intervals=4)
    assert metrics.matched_intervals_count == 4
    assert metrics.mae_mw == 200.0
    assert metrics.rmse_mw == round(math.sqrt(45000), 2)
    assert metrics.bias_mw == -50.0
    assert metrics.wape_pct == 13.33
    assert metrics.overforecast_count == 2
    assert metrics.underforecast_count == 2
    assert metrics.max_abs_error_mw == 300.0
    assert len(hourly) == 24


def test_positive_bias_interpretation():
    """Verify that consistent overforecasting yields a positive bias."""
    intervals = [
        make_interval("2026-01-05T00:00:00Z", actual_mw=500.0, forecast_mw=600.0),
        make_interval("2026-01-05T00:30:00Z", actual_mw=500.0, forecast_mw=700.0),
    ]
    metrics, _, _, _ = calculate_metrics(intervals, total_calendar_intervals=2)
    assert metrics.bias_mw == 150.0  # Positive bias = overforecasting on average


def test_zero_actual_generation_wape_handled_safely():
    """When actual generation sums to zero, WAPE must return None rather than raising ZeroDivisionError."""
    intervals = [
        make_interval("2026-01-08T00:00:00Z", actual_mw=0.0, forecast_mw=100.0),
        make_interval("2026-01-08T00:30:00Z", actual_mw=0.0, forecast_mw=50.0),
    ]
    metrics, _, _, _ = calculate_metrics(intervals, total_calendar_intervals=2)
    assert metrics.wape_pct is None  # Safe handling of 0 denominator
    assert metrics.mae_mw == 75.0
    assert metrics.matched_intervals_count == 2


def test_unmatched_intervals_excluded_from_paired_metrics():
    """Intervals with missing forecast or missing actual must not skew paired accuracy metrics."""
    intervals = [
        make_interval("2026-01-10T00:00:00Z", actual_mw=1000.0, forecast_mw=1100.0, match_status="MATCHED"),
        make_interval("2026-01-10T00:30:00Z", actual_mw=1000.0, forecast_mw=None, match_status="MISSING_FORECAST"),
        make_interval("2026-01-10T01:00:00Z", actual_mw=None, forecast_mw=1200.0, match_status="MISSING_ACTUAL"),
    ]
    metrics, _, _, _ = calculate_metrics(intervals, total_calendar_intervals=3)
    assert metrics.matched_intervals_count == 1
    assert metrics.intervals_with_actual == 2
    assert metrics.intervals_with_eligible_forecast == 2
    assert metrics.mae_mw == 100.0
    assert metrics.forecast_coverage_pct == round(1 / 3 * 100.0, 2)


def test_empty_intervals_handling():
    """Empty list returns zero matched count and None metrics without crashing."""
    metrics, daily, bins, hourly = calculate_metrics([], total_calendar_intervals=1488)
    assert metrics.matched_intervals_count == 0
    assert metrics.mae_mw is None
    assert metrics.rmse_mw is None
    assert metrics.bias_mw is None
    assert metrics.wape_pct is None
    assert len(daily) == 0
    assert len(bins) == 0
    assert len(hourly) == 0
