"""
Elexon Data Fetcher & Cache Builder for January 2026.
Retrieves actual wind generation (FUELHH where fuelType='WIND')
and forecast wind generation (WINDFOR) directly from Elexon Insights Solution BMRS API.
Saves sanitized, validated records into a local JSON cache for rapid, offline-capable analysis.
"""

import json
import logging
import os
import sys
import time
from datetime import datetime, timedelta, timezone
import urllib.request
import urllib.error

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("elexon_fetcher")

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
CACHE_FILE = os.path.join(OUTPUT_DIR, "elexon_jan2026_cache.json")


def http_get_json(url: str, max_retries: int = 3, timeout: int = 30):
    headers = {"User-Agent": "WindLens-Analytics/1.0 (UK Day-Ahead Energy Utility)"}
    for attempt in range(1, max_retries + 1):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=timeout) as response:
                if response.status == 200:
                    raw = response.read().decode("utf-8")
                    return json.loads(raw)
                logger.warning("HTTP status %s for %s", response.status, url)
        except urllib.error.HTTPError as e:
            logger.warning("HTTP error %s on attempt %s for %s", e.code, attempt, url)
        except Exception as e:
            logger.warning("Error %s on attempt %s for %s", e, attempt, url)
        time.sleep(1.5 * attempt)
    logger.error("Failed to fetch %s after %s attempts", url, max_retries)
    return None


def fetch_fuelhh_wind_jan2026():
    """Fetch actual wind generation from FUELHH for 2026-01-01 to 2026-01-31."""
    logger.info("Fetching FUELHH actual wind generation for January 2026...")
    url = f"{BASE_URL}/datasets/FUELHH/stream?settlementDateFrom=2026-01-01&settlementDateTo=2026-01-31"
    raw_items = http_get_json(url)
    if not raw_items:
        raise RuntimeError("Failed to fetch FUELHH stream from Elexon API")

    wind_items = []
    for item in raw_items:
        if item.get("fuelType") == "WIND":
            wind_items.append({
                "startTime": item.get("startTime"),
                "publishTime": item.get("publishTime"),
                "settlementDate": item.get("settlementDate"),
                "settlementPeriod": item.get("settlementPeriod"),
                "generation": float(item.get("generation", 0.0))
            })

    # Sort deterministically by startTime
    wind_items.sort(key=lambda x: x["startTime"])
    logger.info("Successfully fetched and filtered %d FUELHH WIND records", len(wind_items))
    return wind_items


def fetch_windfor_jan2026():
    """Fetch WINDFOR forecast vintages covering January 2026."""
    logger.info("Fetching WINDFOR forecast vintages published for January 2026...")
    # Fetch in 5-day publication windows from 2025-12-28 to 2026-02-01
    date_windows = [
        ("2025-12-28T00:00:00Z", "2026-01-02T00:00:00Z"),
        ("2026-01-02T00:00:00Z", "2026-01-07T00:00:00Z"),
        ("2026-01-07T00:00:00Z", "2026-01-12T00:00:00Z"),
        ("2026-01-12T00:00:00Z", "2026-01-17T00:00:00Z"),
        ("2026-01-17T00:00:00Z", "2026-01-22T00:00:00Z"),
        ("2026-01-22T00:00:00Z", "2026-01-27T00:00:00Z"),
        ("2026-01-27T00:00:00Z", "2026-02-01T00:00:00Z"),
    ]

    all_forecasts = []
    seen = set()

    for start_str, end_str in date_windows:
        url = f"{BASE_URL}/datasets/WINDFOR/stream?publishDateTimeFrom={start_str}&publishDateTimeTo={end_str}"
        logger.info("Fetching WINDFOR stream window: %s to %s", start_str, end_str)
        items = http_get_json(url)
        if items:
            added = 0
            for it in items:
                start_time = it.get("startTime", "")
                pub_time = it.get("publishTime", "")
                # Only retain targets in January 2026
                if start_time.startswith("2026-01-"):
                    key = (start_time, pub_time)
                    if key not in seen:
                        seen.add(key)
                        all_forecasts.append({
                            "startTime": start_time,
                            "publishTime": pub_time,
                            "generation": float(it.get("generation", 0.0))
                        })
                        added += 1
            logger.info("  Window yielded %d new Jan 2026 forecast vintages (total: %d)", added, len(all_forecasts))
        time.sleep(0.5)

    all_forecasts.sort(key=lambda x: (x["startTime"], x["publishTime"]))
    logger.info("Total unique WINDFOR Jan 2026 vintages fetched: %d", len(all_forecasts))
    return all_forecasts


def build_cache():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    fuelhh = fetch_fuelhh_wind_jan2026()
    windfor = fetch_windfor_jan2026()

    cache_data = {
        "metadata": {
            "source": "Elexon Insights Solution (BMRS)",
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
            "target_period": "January 2026",
            "fuelhh_wind_count": len(fuelhh),
            "windfor_vintage_count": len(windfor),
        },
        "actuals": fuelhh,
        "forecasts": windfor
    }

    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache_data, f, indent=2)

    logger.info("Saved cache to %s (%d actuals, %d forecast vintages)", CACHE_FILE, len(fuelhh), len(windfor))
    return cache_data


if __name__ == "__main__":
    build_cache()
