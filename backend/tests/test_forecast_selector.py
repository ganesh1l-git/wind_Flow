"""
Unit tests for Day-Ahead Forecast Vintage Selection and Look-Ahead Bias Prevention.
"""

import pytest
from app.analysis.forecast_selector import select_day_ahead_forecast


def test_select_latest_eligible_forecast():
    """Verify that among multiple vintages before cutoff, the latest one is selected."""
    delivery_interval = "2026-01-15T14:00:00Z"
    cutoff_time = "12:00"  # Preceding day cutoff is 2026-01-14T12:00:00Z
    
    vintages = [
        {"publishTime": "2026-01-13T10:00:00Z", "generation": 1000.0},
        {"publishTime": "2026-01-14T06:00:00Z", "generation": 1200.0},
        {"publishTime": "2026-01-14T11:30:00Z", "generation": 1400.0},  # Latest eligible
        {"publishTime": "2026-01-14T15:00:00Z", "generation": 1800.0},  # Post-cutoff
        {"publishTime": "2026-01-15T02:00:00Z", "generation": 2200.0},  # Delivery day
    ]
    
    selected_mw, sel_pub, cutoff_utc, records = select_day_ahead_forecast(
        delivery_interval, vintages, cutoff_time
    )
    
    assert selected_mw == 1400.0
    assert sel_pub == "2026-01-14T11:30:00Z"
    assert cutoff_utc == "2026-01-14T12:00:00Z"
    assert len(records) == 5
    
    # Check eligibility flags
    eligible_recs = [r for r in records if r.is_eligible]
    excluded_recs = [r for r in records if not r.is_eligible]
    assert len(eligible_recs) == 3
    assert len(excluded_recs) == 2
    
    # Check winning selection flag
    selected_recs = [r for r in records if r.is_selected]
    assert len(selected_recs) == 1
    assert selected_recs[0].publish_time == "2026-01-14T11:30:00Z"
    assert selected_recs[0].generation_mw == 1400.0


def test_forecast_published_exactly_at_cutoff():
    """A forecast published exactly at the cutoff timestamp must be deemed eligible."""
    delivery_interval = "2026-01-10T18:00:00Z"
    cutoff_time = "12:00"  # Cutoff is 2026-01-09T12:00:00Z
    
    vintages = [
        {"publishTime": "2026-01-09T12:00:00Z", "generation": 3500.0},  # Exactly at cutoff
    ]
    
    selected_mw, sel_pub, cutoff_utc, records = select_day_ahead_forecast(
        delivery_interval, vintages, cutoff_time
    )
    
    assert selected_mw == 3500.0
    assert sel_pub == "2026-01-09T12:00:00Z"
    assert records[0].is_eligible is True
    assert records[0].is_selected is True


def test_forecast_published_after_cutoff_excluded():
    """All forecasts published after cutoff must be strictly excluded; no silent fall-forward."""
    delivery_interval = "2026-01-10T18:00:00Z"
    cutoff_time = "12:00"  # Cutoff is 2026-01-09T12:00:00Z
    
    vintages = [
        {"publishTime": "2026-01-09T12:00:01Z", "generation": 3600.0},  # 1 second after cutoff
        {"publishTime": "2026-01-09T18:00:00Z", "generation": 3700.0},
        {"publishTime": "2026-01-10T08:00:00Z", "generation": 4000.0},
    ]
    
    selected_mw, sel_pub, cutoff_utc, records = select_day_ahead_forecast(
        delivery_interval, vintages, cutoff_time
    )
    
    assert selected_mw is None
    assert sel_pub is None
    assert all(r.is_eligible is False for r in records)
    assert all(r.is_selected is False for r in records)
    assert all("excluded" in (r.exclusion_reason or "").lower() for r in records)


def test_missing_forecast_vintages():
    """Empty vintage list returns None without exceptions."""
    delivery_interval = "2026-01-20T00:00:00Z"
    selected_mw, sel_pub, cutoff_utc, records = select_day_ahead_forecast(
        delivery_interval, [], "12:00"
    )
    assert selected_mw is None
    assert sel_pub is None
    assert len(records) == 0


def test_cutoff_change_dynamically_selects_different_vintage():
    """Changing cutoff from 11:00 to 14:00 should select a later vintage if published in that window."""
    delivery_interval = "2026-01-05T12:00:00Z"
    vintages = [
        {"publishTime": "2026-01-04T10:30:00Z", "generation": 5000.0},
        {"publishTime": "2026-01-04T12:30:00Z", "generation": 5500.0},
    ]
    
    # At 11:00 cutoff, only 10:30 is eligible
    mw_11, _, _, _ = select_day_ahead_forecast(delivery_interval, vintages, "11:00")
    assert mw_11 == 5000.0
    
    # At 14:00 cutoff, 12:30 becomes eligible and is selected
    mw_14, _, _, _ = select_day_ahead_forecast(delivery_interval, vintages, "14:00")
    assert mw_14 == 5500.0
