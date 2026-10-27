"""
Timezone utilities for UK energy market day-ahead decision evaluation.
Ensures strict IANA Europe/London compliance, handles GMT/BST transitions,
and guarantees timezone-aware comparisons.
"""

from datetime import datetime, date, time, timezone, timedelta
from zoneinfo import ZoneInfo
import re

UK_TZ = ZoneInfo("Europe/London")
UTC_TZ = timezone.utc


def parse_iso_utc(ts_str: str) -> datetime:
    """Parse ISO 8601 string into a timezone-aware UTC datetime."""
    if not ts_str:
        raise ValueError("Timestamp string cannot be empty")
    cleaned = ts_str.replace("Z", "+00:00")
    dt = datetime.fromisoformat(cleaned)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC_TZ)
    return dt.astimezone(UTC_TZ)


def format_iso_utc(dt: datetime) -> str:
    """Format timezone-aware datetime to ISO 8601 UTC string (with Z)."""
    utc_dt = dt.astimezone(UTC_TZ)
    return utc_dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def to_uk_local(dt: datetime) -> datetime:
    """Convert any timezone-aware datetime to Europe/London local time."""
    if dt.tzinfo is None:
        raise ValueError("Cannot convert naive datetime to UK local; must be timezone-aware")
    return dt.astimezone(UK_TZ)


def validate_cutoff_time(cutoff_time_str: str) -> tuple[int, int]:
    """Validate 24-hr time string HH:MM and return (hour, minute)."""
    if not re.match(r"^([01]\d|2[0-3]):([0-5]\d)$", cutoff_time_str):
        raise ValueError(f"Invalid cutoff time format '{cutoff_time_str}'. Expected 'HH:MM' (24-hour, e.g. '12:00').")
    parts = cutoff_time_str.split(":")
    return int(parts[0]), int(parts[1])


def get_decision_cutoff_utc(delivery_dt_utc: datetime, cutoff_time_str: str = "12:00") -> datetime:
    """
    Compute the day-ahead decision cutoff instant in UTC.
    
    Rule:
    1. Determine delivery date in UK local time (Europe/London).
    2. Decision is made on the preceding calendar day (D-1).
    3. Construct local timestamp on D-1 at the configured cutoff time.
    4. Convert that local instant to unambiguous UTC for comparison.
    """
    hour, minute = validate_cutoff_time(cutoff_time_str)
    
    # 1. Delivery time in UK local
    delivery_local = to_uk_local(delivery_dt_utc)
    delivery_date = delivery_local.date()
    
    # 2. Preceding calendar day
    preceding_date = delivery_date - timedelta(days=1)
    
    # 3. Construct local cutoff instant
    # Note: In January (GMT), Europe/London is UTC+0. In summer (BST), UTC+1.
    cutoff_local = datetime(
        preceding_date.year,
        preceding_date.month,
        preceding_date.day,
        hour,
        minute,
        0,
        tzinfo=UK_TZ
    )
    
    # 4. Unambiguous UTC instant
    return cutoff_local.astimezone(UTC_TZ)
