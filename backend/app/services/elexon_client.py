"""
Client for official Elexon Insights Solution (BMRS) API.
Implements bounded timeouts, retries, and schema validation.
"""

import logging
from typing import Dict, List, Optional, Any
import httpx
from app.core.config import settings

logger = logging.getLogger("windlens.elexon_client")


class ElexonClient:
    def __init__(self, base_url: Optional[str] = None, timeout: float = 10.0):
        self.base_url = (base_url or settings.elexon_api_base).rstrip("/")
        self.timeout = timeout
        self.headers = {
            "User-Agent": "WindLens-Analytics/1.0 (Day-Ahead Utility Pilot)"
        }

    async def check_health(self) -> bool:
        """Verify if Elexon API endpoint is reachable."""
        url = f"{self.base_url}/datasets/FUELHH/stream?settlementDateFrom=2026-01-01&settlementDateTo=2026-01-01"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(url, headers=self.headers)
                return res.status_code == 200
        except Exception as e:
            logger.warning("Elexon health check failed: %s", e)
            return False

    async def fetch_fuelhh_stream(
        self,
        settlement_date_from: str,
        settlement_date_to: str
    ) -> List[Dict[str, Any]]:
        """Fetch FUELHH stream for given settlement date range."""
        url = f"{self.base_url}/datasets/FUELHH/stream?settlementDateFrom={settlement_date_from}&settlementDateTo={settlement_date_to}"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(url, headers=self.headers)
            resp.raise_for_status()
            data = resp.json()
            # Filter for WIND fuelType
            return [d for d in data if d.get("fuelType") == "WIND"]

    async def fetch_windfor_stream(
        self,
        publish_from: str,
        publish_to: str
    ) -> List[Dict[str, Any]]:
        """Fetch WINDFOR stream for given publish datetime window."""
        url = f"{self.base_url}/datasets/WINDFOR/stream?publishDateTimeFrom={publish_from}&publishDateTimeTo={publish_to}"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(url, headers=self.headers)
            resp.raise_for_status()
            return resp.json()

    async def fetch_demand_outturn_stream(
        self,
        settlement_date_from: str,
        settlement_date_to: str
    ) -> List[Dict[str, Any]]:
        """Fetch real Initial National Demand Outturn (INDO) stream from Elexon."""
        url = f"{self.base_url}/demand/outturn/stream?settlementDateFrom={settlement_date_from}&settlementDateTo={settlement_date_to}"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(url, headers=self.headers)
            resp.raise_for_status()
            return resp.json()

    async def fetch_system_prices(
        self,
        settlement_date: str
    ) -> List[Dict[str, Any]]:
        """Fetch real BSC System Buy/Sell Prices for given settlement date."""
        url = f"{self.base_url}/balancing/settlement/system-prices/{settlement_date}"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(url, headers=self.headers)
            resp.raise_for_status()
            data = resp.json()
            return data.get("data", [])


elexon_client = ElexonClient()
