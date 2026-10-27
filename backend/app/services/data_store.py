"""
In-memory data store for Elexon FUELHH actuals and WINDFOR forecasts.
Provides instant lookup and indexing across January 2026 delivery intervals.
"""

import json
import logging
import os
from collections import defaultdict
from typing import Dict, List, Optional, Any
from app.core.config import settings

logger = logging.getLogger("windlens.datastore")


class DataStore:
    def __init__(self):
        self.actuals_by_start: Dict[str, Dict[str, Any]] = {}
        self.forecasts_by_target: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        self.metadata: Dict[str, Any] = {}
        self.is_loaded: bool = False

    def load_cache(self, file_path: Optional[str] = None) -> bool:
        path = file_path or str(settings.cache_file_path)
        if not os.path.exists(path):
            logger.warning("Cache file not found at %s", path)
            return False

        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)

            self.metadata = data.get("metadata", {})
            actuals_list = data.get("actuals", [])
            forecasts_list = data.get("forecasts", [])

            self.actuals_by_start.clear()
            for act in actuals_list:
                st = act.get("startTime")
                if st:
                    self.actuals_by_start[st] = act

            self.forecasts_by_target.clear()
            for fc in forecasts_list:
                st = fc.get("startTime")
                if st:
                    self.forecasts_by_target[st].append(fc)

            # Sort vintages by publishTime for each target startTime
            for st in self.forecasts_by_target:
                self.forecasts_by_target[st].sort(key=lambda x: x.get("publishTime", ""))

            self.is_loaded = True
            logger.info(
                "DataStore loaded successfully: %d actuals, %d forecast vintages across %d target intervals",
                len(self.actuals_by_start),
                len(forecasts_list),
                len(self.forecasts_by_target)
            )
            return True
        except Exception as e:
            logger.error("Failed to load cache from %s: %s", path, e, exc_info=True)
            return False

    def get_actual(self, start_time: str) -> Optional[Dict[str, Any]]:
        return self.actuals_by_start.get(start_time)

    def get_forecast_vintages(self, start_time: str) -> List[Dict[str, Any]]:
        return self.forecasts_by_target.get(start_time, [])

    def get_all_target_start_times(self) -> List[str]:
        # Return sorted union of actuals and forecast start times
        all_starts = set(self.actuals_by_start.keys()).union(set(self.forecasts_by_target.keys()))
        return sorted(list(all_starts))


data_store = DataStore()
