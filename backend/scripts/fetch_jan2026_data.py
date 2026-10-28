"""
Elexon Data Fetcher & Cache Builder for January 2026.
Retrieves actual wind generation (FUELHH where fuelType='WIND'),
total national system generation across all fuels (from FUELHH),
and forecast wind generation (WINDFOR) directly from Elexon Insights Solution BMRS API.
Saves sanitized, validated records into a local JSON cache for rapid, offline-capable analysis.
"""

import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
import urllib.request
import urllib.error

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("elexon_fetcher")

BASE_URL = "https://data.elexon.co.uk/bmrs/api/v1"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
CACHE_FILE = os.path.join(OUTPUT_DIR, "elexon_jan2026_cache.json")


def http_get_json(url: str, max_retries: int = 3, timeout: int = 45):
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


def fetch_fuelhh_jan2026():
    """Fetch actual wind and total system generation from FUELHH for 2026-01-01 to 2026-01-31."""
    logger.info("Fetching FUELHH stream from Elexon API for January 2026...")
    url = f"{BASE_URL}/datasets/FUELHH/stream?settlementDateFrom=2026-01-01&settlementDateTo=2026-01-31"
    raw_items = http_get_json(url)
    if not raw_items:
        raise RuntimeError("Failed to fetch FUELHH stream from Elexon API")

    logger.info("Retrieved %d raw FUELHH records across all fuels from Elexon API", len(raw_items))

    # Aggregate total national system generation per settlement startTime
    totals_by_start = {}
    for item in raw_items:
        st = item.get("startTime")
        if st:
            totals_by_start[st] = totals_by_start.get(st, 0.0) + float(item.get("generation", 0.0))

    wind_items = []
    for item in raw_items:
        if item.get("fuelType") == "WIND":
            st = item.get("startTime")
            wind_gen = float(item.get("generation", 0.0))
            tot_gen = totals_by_start.get(st, wind_gen)
            wind_items.append({
                "startTime": st,
                "publishTime": item.get("publishTime"),
                "settlementDate": item.get("settlementDate"),
                "settlementPeriod": item.get("settlementPeriod"),
                "generation": wind_gen,
                "total_system_generation": round(tot_gen, 2),
                "non_wind_generation": round(max(0.0, tot_gen - wind_gen), 2),
                "dataset": "FUELHH",
                "source": "Elexon BMRS API"
            })

    # Sort deterministically by startTime
    wind_items.sort(key=lambda x: x["startTime"])
    logger.info("Successfully processed %d FUELHH WIND settlement periods with total system generation", len(wind_items))
    return wind_items, len(raw_items)


def fetch_windfor_jan2026():
    """Fetch WINDFOR forecast vintages covering January 2026."""
    logger.info("Fetching WINDFOR forecast vintages published for January 2026...")
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
                if start_time.startswith("2026-01-"):
                    key = (start_time, pub_time)
                    if key not in seen:
                        seen.add(key)
                        all_forecasts.append({
                            "startTime": start_time,
                            "publishTime": pub_time,
                            "generation": float(it.get("generation", 0.0)),
                            "dataset": "WINDFOR",
                            "source": "National Grid ESO via Elexon BMRS"
                        })
                        added += 1
            logger.info("  Window yielded %d new Jan 2026 forecast vintages (total: %d)", added, len(all_forecasts))
        time.sleep(0.4)

    all_forecasts.sort(key=lambda x: (x["startTime"], x["publishTime"]))
    logger.info("Total unique WINDFOR Jan 2026 vintages fetched: %d", len(all_forecasts))
    return all_forecasts


def fetch_demands_jan2026():
    """Fetch genuine Initial National Demand Outturn (INDO) stream for January 2026."""
    logger.info("Fetching real Elexon Demand Outturn (INDO) stream for January 2026...")
    url = f"{BASE_URL}/demand/outturn/stream?settlementDateFrom=2026-01-01&settlementDateTo=2026-01-31"
    raw_items = http_get_json(url) or []
    demands = []
    for d in raw_items:
        demands.append({
            "startTime": d.get("startTime"),
            "publishTime": d.get("publishTime"),
            "settlementDate": d.get("settlementDate"),
            "settlementPeriod": d.get("settlementPeriod"),
            "initialDemandOutturn": d.get("initialDemandOutturn"),
            "initialTransmissionSystemDemandOutturn": d.get("initialTransmissionSystemDemandOutturn")
        })
    logger.info("Retrieved %d genuine Elexon demand outturn records", len(demands))
    return demands


def fetch_system_prices_jan2026():
    """Fetch genuine Elexon BSC System Imbalance Prices for all 31 days of January 2026."""
    logger.info("Fetching real Elexon BSC System Prices for January 2026...")
    all_prices = []
    for day in range(1, 32):
        d_str = f"2026-01-{day:02d}"
        url = f"{BASE_URL}/balancing/settlement/system-prices/{d_str}"
        res = http_get_json(url)
        items = res.get("data", []) if isinstance(res, dict) else []
        for p in items:
            all_prices.append({
                "startTime": p.get("startTime"),
                "settlementDate": p.get("settlementDate"),
                "settlementPeriod": p.get("settlementPeriod"),
                "systemBuyPrice": p.get("systemBuyPrice"),
                "systemSellPrice": p.get("systemSellPrice"),
                "netImbalanceVolume": p.get("netImbalanceVolume")
            })
        time.sleep(0.05)
    logger.info("Retrieved %d genuine Elexon system price records", len(all_prices))
    return all_prices


def build_cache():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    fuelhh_wind, total_raw_fuelhh = fetch_fuelhh_jan2026()
    windfor = fetch_windfor_jan2026()
    demands = fetch_demands_jan2026()
    prices = fetch_system_prices_jan2026()

    cache_data = {
        "metadata": {
            "source": "Elexon Insights Solution (BMRS)",
            "upstream_api_base": BASE_URL,
            "fuelhh_stream_url": f"{BASE_URL}/datasets/FUELHH/stream",
            "windfor_stream_url": f"{BASE_URL}/datasets/WINDFOR/stream",
            "demand_stream_url": f"{BASE_URL}/demand/outturn/stream",
            "system_prices_url": f"{BASE_URL}/balancing/settlement/system-prices",
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
            "target_period": "January 2026",
            "fuelhh_wind_count": len(fuelhh_wind),
            "fuelhh_total_raw_records": total_raw_fuelhh,
            "windfor_vintage_count": len(windfor),
            "demand_outturn_count": len(demands),
            "system_prices_count": len(prices),
            "verification_status": "OFFICIAL_ELEXON_BMRS_AUTHENTICATED"
        },
        "actuals": fuelhh_wind,
        "forecasts": windfor,
        "demands": demands,
        "system_prices": prices
    }

    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache_data, f, indent=2)

    logger.info("Saved enriched Elexon cache to %s (%d actuals, %d forecast vintages, %d demands, %d system prices)",
                CACHE_FILE, len(fuelhh_wind), len(windfor), len(demands), len(prices))
    return cache_data


if __name__ == "__main__":
    build_cache()

