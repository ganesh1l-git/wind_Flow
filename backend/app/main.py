"""
WindLens Backend Main Application.
FastAPI entrypoint with CORS, lifespan startup preload, and API routers.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.services.data_store import data_store
from app.api.routes import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("windlens.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: preload Elexon data cache
    logger.info("Initializing WindLens data store...")
    success = data_store.load_cache()
    if not success:
        logger.warning("Cache could not be loaded on startup; fallback or live fetch required")
    else:
        logger.info("Data store initialized with January 2026 Elexon records")
    yield
    # Shutdown
    logger.info("WindLens backend shutting down.")


app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="UK Day-Ahead Wind Forecast Analytics Platform. Developed for UK Energy Utilities evaluating Elexon FUELHH actuals vs WINDFOR forecasts.",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes under prefix and root health
app.include_router(router, prefix=settings.api_prefix)
app.include_router(router)  # Also expose directly for convenience (e.g. /health)


@app.get("/")
async def root():
    return {
        "app": settings.app_name,
        "version": settings.version,
        "docs_url": "/docs",
        "health_url": "/health",
        "api_prefix": settings.api_prefix
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
