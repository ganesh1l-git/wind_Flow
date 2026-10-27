"""
Pytest configuration and fixtures.
Preloads data_store cache for integration and API tests.
"""

import os
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.data_store import data_store


@pytest.fixture(scope="session", autouse=True)
def setup_test_datastore():
    """Ensure data store is loaded for all tests."""
    data_store.load_cache()
    yield


@pytest.fixture
def client():
    """FastAPI TestClient fixture."""
    with TestClient(app) as test_client:
        yield test_client
