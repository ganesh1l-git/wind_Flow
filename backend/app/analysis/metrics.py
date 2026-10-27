"""
Quantitative Forecast Accuracy Metrics Module.
Calculates MAE, RMSE, Forecast Bias, WAPE, and distribution analytics.
Strictly complies with the requirement that primary paired accuracy metrics
use only valid matched observations, without silent interpolation.
"""

import math
from collections import defaultdict
from typing import List, Tuple, Optional
from app.models.schemas import (
    IntervalRecord,
    AccuracyMetrics,
    DailySummary,
    ErrorDistributionBin
)


def calculate_metrics(
    intervals: List[IntervalRecord],
    total_calendar_intervals: int = 1488
) -> Tuple[AccuracyMetrics, List[DailySummary], List[ErrorDistributionBin]]:
    """
    Compute paired accuracy metrics, daily summaries, and error distribution.
    Only intervals with match_status == 'MATCHED' (both valid actual and eligible forecast)
    are included in paired accuracy calculations.
    """
    intervals_with_actual = sum(1 for i in intervals if i.has_actual)
    intervals_with_forecast = sum(1 for i in intervals if i.has_forecast)
    matched_records = [i for i in intervals if i.match_status == "MATCHED"]
    matched_count = len(matched_records)

    coverage_pct = round((matched_count / total_calendar_intervals * 100.0), 2) if total_calendar_intervals > 0 else 0.0

    if matched_count == 0:
        empty_metrics = AccuracyMetrics(
            total_calendar_intervals=total_calendar_intervals,
            intervals_with_actual=intervals_with_actual,
            intervals_with_eligible_forecast=intervals_with_forecast,
            matched_intervals_count=0,
            forecast_coverage_pct=0.0
        )
        return empty_metrics, [], []

    errors = [r.error_mw for r in matched_records if r.error_mw is not None]
    abs_errors = [r.abs_error_mw for r in matched_records if r.abs_error_mw is not None]
    actuals = [r.actual_generation_mw for r in matched_records if r.actual_generation_mw is not None]
    forecasts = [r.forecast_generation_mw for r in matched_records if r.forecast_generation_mw is not None]

    mae = sum(abs_errors) / matched_count
    rmse = math.sqrt(sum(e ** 2 for e in errors) / matched_count)
    bias = sum(errors) / matched_count

    sum_actual = sum(actuals)
    wape = (sum(abs_errors) / sum_actual * 100.0) if sum_actual > 0 else None

    # Median absolute error
    sorted_abs = sorted(abs_errors)
    mid = len(sorted_abs) // 2
    if len(sorted_abs) % 2 == 0:
        median_abs = (sorted_abs[mid - 1] + sorted_abs[mid]) / 2.0
    else:
        median_abs = sorted_abs[mid]

    # Max absolute error
    max_abs_record = max(matched_records, key=lambda r: (r.abs_error_mw or 0.0))
    max_abs_mw = max_abs_record.abs_error_mw
    max_abs_interval = max_abs_record.delivery_start

    # Frequencies
    over_count = sum(1 for e in errors if e > 0)
    under_count = sum(1 for e in errors if e < 0)
    exact_count = sum(1 for e in errors if e == 0)

    metrics = AccuracyMetrics(
        total_calendar_intervals=total_calendar_intervals,
        intervals_with_actual=intervals_with_actual,
        intervals_with_eligible_forecast=intervals_with_forecast,
        matched_intervals_count=matched_count,
        forecast_coverage_pct=coverage_pct,
        mae_mw=round(mae, 2),
        rmse_mw=round(rmse, 2),
        bias_mw=round(bias, 2),
        wape_pct=round(wape, 2) if wape is not None else None,
        median_abs_error_mw=round(median_abs, 2),
        max_abs_error_mw=round(max_abs_mw, 2) if max_abs_mw is not None else None,
        max_abs_error_interval=max_abs_interval,
        overforecast_count=over_count,
        underforecast_count=under_count,
        exact_forecast_count=exact_count,
        avg_actual_mw=round(sum_actual / matched_count, 2),
        avg_forecast_mw=round(sum(forecasts) / matched_count, 2),
        max_actual_mw=round(max(actuals), 2) if actuals else None,
        min_actual_mw=round(min(actuals), 2) if actuals else None,
        max_forecast_mw=round(max(forecasts), 2) if forecasts else None,
        min_forecast_mw=round(min(forecasts), 2) if forecasts else None
    )

    # Daily aggregation
    by_date = defaultdict(list)
    for r in intervals:
        by_date[r.delivery_date].append(r)

    daily_summaries: List[DailySummary] = []
    for d_str in sorted(by_date.keys()):
        d_records = by_date[d_str]
        d_matched = [r for r in d_records if r.match_status == "MATCHED"]
        d_count = len(d_matched)

        d_mae: Optional[float] = None
        d_rmse: Optional[float] = None
        d_bias: Optional[float] = None
        d_wape: Optional[float] = None

        if d_count > 0:
            d_errs = [r.error_mw for r in d_matched if r.error_mw is not None]
            d_abs = [r.abs_error_mw for r in d_matched if r.abs_error_mw is not None]
            d_acts = [r.actual_generation_mw for r in d_matched if r.actual_generation_mw is not None]
            
            d_mae = round(sum(d_abs) / d_count, 2)
            d_rmse = round(math.sqrt(sum(e ** 2 for e in d_errs) / d_count), 2)
            d_bias = round(sum(d_errs) / d_count, 2)
            s_act = sum(d_acts)
            d_wape = round((sum(d_abs) / s_act * 100.0), 2) if s_act > 0 else None

        # Energy MWh (each half-hour interval = generation MW * 0.5 hours)
        act_mwh = sum((r.actual_generation_mw or 0.0) * 0.5 for r in d_records if r.has_actual)
        fc_mwh = sum((r.forecast_generation_mw or 0.0) * 0.5 for r in d_records if r.has_forecast)

        daily_summaries.append(DailySummary(
            date=d_str,
            total_intervals=len(d_records),
            matched_intervals=d_count,
            mae_mw=d_mae,
            rmse_mw=d_rmse,
            bias_mw=d_bias,
            wape_pct=d_wape,
            actual_energy_mwh=round(act_mwh, 1),
            forecast_energy_mwh=round(fc_mwh, 1)
        ))

    # Error distribution histogram (10 bins from min_err to max_err)
    error_bins: List[ErrorDistributionBin] = []
    if errors:
        min_err = min(errors)
        max_err = max(errors)
        if min_err == max_err:
            error_bins.append(ErrorDistributionBin(
                bin_start=min_err,
                bin_end=max_err,
                label=f"{round(min_err, 0)} MW",
                count=len(errors)
            ))
        else:
            num_bins = 10
            step = (max_err - min_err) / num_bins
            for b in range(num_bins):
                b_start = min_err + b * step
                b_end = min_err + (b + 1) * step
                # For the last bin, include the upper edge
                if b == num_bins - 1:
                    c = sum(1 for e in errors if b_start <= e <= b_end)
                else:
                    c = sum(1 for e in errors if b_start <= e < b_end)
                error_bins.append(ErrorDistributionBin(
                    bin_start=round(b_start, 1),
                    bin_end=round(b_end, 1),
                    label=f"{int(b_start)} to {int(b_end)} MW",
                    count=c
                ))

    return metrics, daily_summaries, error_bins
