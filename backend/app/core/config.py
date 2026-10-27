"""
Application configuration for WindLens platform.
"""

import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
CACHE_FILE = DATA_DIR / "elexon_jan2026_cache.json"


class Settings(BaseModel):
    app_name: str = "WindLens — UK Day-Ahead Wind Forecast Analytics"
    version: str = "1.0.0"
    api_prefix: str = "/api"
    elexon_api_base: str = "https://data.elexon.co.uk/bmrs/api/v1"
    
    # Default pilot day-ahead decision cutoff time (UK local time, 24-hr format HH:MM)
    default_cutoff_time: str = "12:00"
    
    # Target analysis period
    default_start_date: str = "2026-01-01"
    default_end_date: str = "2026-01-31"
    
    # Timezone
    uk_timezone: str = "Europe/London"
    
    # Cache path
    cache_file_path: Path = CACHE_FILE
    
    # CORS origins
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"
    ]


settings = Settings()
