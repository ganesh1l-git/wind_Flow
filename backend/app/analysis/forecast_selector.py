"""
Forecast Vintage Selector for UK Day-Ahead Decisions.
Enforces the configured pilot decision cutoff, prevents look-ahead bias,
and selects the latest eligible forecast vintage for each delivery interval.
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple, Any
from app.models.schemas import VintageRecord
from app.utils.timezone_utils import (
    parse_iso_utc,
    format_iso_utc,
    to_uk_local,
    get_decision_cutoff_utc
)


def select_day_ahead_forecast(
    delivery_start_iso: str,
    vintages_raw: List[Dict[str, Any]],
    cutoff_time_str: str = "12:00"
) -> Tuple[Optional[float], Optional[str], str, List[VintageRecord]]:
    """
    Given a delivery interval start timestamp and all retrieved forecast vintages:
    1. Calculate the day-ahead decision cutoff instant in UTC.
    2. Partition vintages into eligible (published <= cutoff) and excluded (published > cutoff).
    3. Select the latest eligible forecast.
    
    Returns:
    - selected_forecast_mw: float or None
    - selected_publish_time: ISO string or None
    - decision_cutoff_utc: ISO string
    - vintage_records: List of VintageRecord models with eligibility and selection flags.
    """
    delivery_dt = parse_iso_utc(delivery_start_iso)
    cutoff_dt = get_decision_cutoff_utc(delivery_dt, cutoff_time_str)
    cutoff_iso = format_iso_utc(cutoff_dt)

    eligible_vintages = []
    processed_records: List[VintageRecord] = []

    for v in vintages_raw:
        pub_str = v.get("publishTime")
        if not pub_str:
            continue
        
        pub_dt = parse_iso_utc(pub_str)
        pub_uk = to_uk_local(pub_dt).strftime("%Y-%m-%d %H:%M %Z")
        gen_mw = float(v.get("generation", 0.0))

        is_eligible = (pub_dt <= cutoff_dt)
        exclusion_reason = None
        if not is_eligible:
            exclusion_reason = f"Published at {pub_str}, after decision cutoff {cutoff_iso} (excluded to eliminate look-ahead bias)"

        record = VintageRecord(
            publish_time=format_iso_utc(pub_dt),
            publish_time_uk=pub_uk,
            generation_mw=gen_mw,
            is_eligible=is_eligible,
            is_selected=False,
            exclusion_reason=exclusion_reason
        )
        processed_records.append(record)

        if is_eligible:
            eligible_vintages.append((pub_dt, gen_mw, record))

    selected_forecast_mw: Optional[float] = None
    selected_publish_time: Optional[str] = None

    if eligible_vintages:
        # Sort eligible by publish datetime ascending, latest is last
        eligible_vintages.sort(key=lambda x: x[0])
        best_pub_dt, best_mw, best_record = eligible_vintages[-1]
        best_record.is_selected = True
        selected_forecast_mw = round(best_mw, 2)
        selected_publish_time = format_iso_utc(best_pub_dt)

    # Sort all vintage records chronologically by publish time
    processed_records.sort(key=lambda r: r.publish_time)

    return selected_forecast_mw, selected_publish_time, cutoff_iso, processed_records
