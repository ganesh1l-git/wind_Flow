"""
Unit tests for Timezone and UK Day-Ahead Cutoff Calculations.
"""

from datetime import datetime, timezone
import pytest
from app.utils.timezone_utils import (
    parse_iso_utc,
    format_iso_utc,
    to_uk_local,
    get_decision_cutoff_utc,
    validate_cutoff_time
)


def test_parse_and_format_iso_utc():
    ts = "2026-01-15T14:30:00Z"
    dt = parse_iso_utc(ts)
    assert dt.tzinfo == timezone.utc
    assert dt.year == 2026
    assert dt.month == 1
    assert dt.day == 15
    assert dt.hour == 14
    assert dt.minute == 30
    assert format_iso_utc(dt) == ts


def test_decision_cutoff_standard():
    """For delivery interval on 2026-01-15 14:30 UTC, cutoff at 12:00 is 2026-01-14 12:00 UTC."""
    delivery_dt = datetime(2026, 1, 15, 14, 30, tzinfo=timezone.utc)
    cutoff = get_decision_cutoff_utc(delivery_dt, "12:00")
    assert cutoff == datetime(2026, 1, 14, 12, 0, tzinfo=timezone.utc)


def test_decision_cutoff_month_boundary():
    """For delivery interval on 2026-01-01 00:30 UTC, preceding day cutoff is on 2025-12-31."""
    delivery_dt = datetime(2026, 1, 1, 0, 30, tzinfo=timezone.utc)
    cutoff = get_decision_cutoff_utc(delivery_dt, "12:00")
    assert cutoff == datetime(2025, 12, 31, 12, 0, tzinfo=timezone.utc)


def test_custom_cutoff_times():
    """Custom cutoffs like 09:30 or 17:00 must correctly set hour and minute."""
    delivery_dt = datetime(2026, 1, 20, 10, 0, tzinfo=timezone.utc)
    cutoff_morning = get_decision_cutoff_utc(delivery_dt, "09:30")
    assert cutoff_morning == datetime(2026, 1, 19, 9, 30, tzinfo=timezone.utc)

    cutoff_evening = get_decision_cutoff_utc(delivery_dt, "17:00")
    assert cutoff_evening == datetime(2026, 1, 19, 17, 0, tzinfo=timezone.utc)


def test_validate_cutoff_time():
    assert validate_cutoff_time("12:00") == (12, 0)
    assert validate_cutoff_time("00:00") == (0, 0)
    assert validate_cutoff_time("23:59") == (23, 59)
    
    with pytest.raises(ValueError):
        validate_cutoff_time("24:00")
    with pytest.raises(ValueError):
        validate_cutoff_time("12:60")
    with pytest.raises(ValueError):
        validate_cutoff_time("invalid")
    with pytest.raises(ValueError):
        validate_cutoff_time("1:00")  # Requires two-digit hour HH:MM
