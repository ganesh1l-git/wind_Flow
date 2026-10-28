"""
Integration and API tests for WindLens FastAPI endpoints.
"""

import pytest


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert data["cached_actuals_count"] > 0
    assert data["cached_forecast_vintages_count"] > 0


def test_config_endpoint(client):
    response = client.get("/api/config")
    assert response.status_code == 200
    data = response.json()
    assert data["default_cutoff_time"] == "12:00"
    assert data["uk_timezone"] == "Europe/London"
    assert "PILOT ASSUMPTION" in data["pilot_notice"]


def test_analysis_endpoint_default(client):
    response = client.get("/api/analysis?start_date=2026-01-01&end_date=2026-01-07&cutoff_time=12:00")
    assert response.status_code == 200
    data = response.json()
    
    # Metadata assertions
    assert data["metadata"]["start_date"] == "2026-01-01"
    assert data["metadata"]["end_date"] == "2026-01-07"
    assert data["metadata"]["decision_cutoff_time"] == "12:00"
    
    # Metrics assertions
    metrics = data["metrics"]
    assert metrics["matched_intervals_count"] > 0
    assert metrics["mae_mw"] is not None
    assert metrics["rmse_mw"] is not None
    assert metrics["bias_mw"] is not None
    assert metrics["wape_pct"] is not None
    assert metrics["mae_mw"] > 0
    
    # Series assertions
    series = data["series"]
    assert len(series) > 0
    sample = series[0]
    assert "delivery_start" in sample
    assert "match_status" in sample
    assert "decision_cutoff_utc" in sample
    
    # Daily summaries
    daily = data["daily_summaries"]
    assert len(daily) == 7


def test_analysis_cutoff_change_recalculates(client):
    """Changing cutoff must dynamically recalculate metrics."""
    res_11 = client.get("/api/analysis?start_date=2026-01-01&end_date=2026-01-03&cutoff_time=11:00")
    res_14 = client.get("/api/analysis?start_date=2026-01-01&end_date=2026-01-03&cutoff_time=14:00")
    
    assert res_11.status_code == 200
    assert res_14.status_code == 200
    data_11 = res_11.json()
    data_14 = res_14.json()
    
    assert data_11["metadata"]["decision_cutoff_time"] == "11:00"
    assert data_14["metadata"]["decision_cutoff_time"] == "14:00"


def test_analysis_invalid_date_range(client):
    """When start_date > end_date, API should return 400 Bad Request."""
    response = client.get("/api/analysis?start_date=2026-01-15&end_date=2026-01-10")
    assert response.status_code == 400
    assert "start_date must be before or equal to end_date" in response.json()["detail"]


def test_series_endpoint(client):
    response = client.get("/api/series?start_date=2026-01-01&end_date=2026-01-02")
    assert response.status_code == 200
    series = response.json()
    assert isinstance(series, list)
    assert len(series) > 0


def test_interval_vintages_endpoint(client):
    """Test detailed vintage inspection for technical audit."""
    target_interval = "2026-01-05T12:00:00Z"
    response = client.get(f"/api/intervals/{target_interval}/vintages?cutoff_time=12:00")
    assert response.status_code == 200
    data = response.json()
    assert data["delivery_start"] == target_interval
    assert "vintages" in data
    assert "explanation" in data
    assert "decision_cutoff_utc" in data
    if data["vintages"]:
        assert any(v["is_eligible"] for v in data["vintages"])


def test_csv_export_endpoint(client):
    response = client.get("/api/export/csv?start_date=2026-01-01&end_date=2026-01-02")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    content = response.text
    assert "delivery_start_utc" in content
    assert "actual_wind_generation_mw" in content
    assert "selected_forecast_mw" in content
    assert "forecast_error_mw" in content


def test_procurement_scenario_endpoint(client):
    payload = {
        "illustrative_demand_mw": 32000.0,
        "decision_cutoff_time": "12:00"
    }
    response = client.post("/api/procurement-scenario", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["illustrative_demand_mw"] == 32000.0
    assert data["residual_procurement_mw"] >= 0
    assert "EDUCATIONAL DECISION-SUPPORT NOTICE" in data["disclaimer"]
    assert "elexon_demand_mw" in data
    assert "system_buy_price_gbp" in data


def test_procurement_overview_endpoint(client):
    response = client.get("/api/procurement-overview?cutoff_time=12:00")
    assert response.status_code == 200
    data = response.json()
    assert data["total_demand_mwh"] > 0
    assert data["total_day_ahead_procured_mwh"] > 0
    assert data["total_cashout_cost_gbp"] > 0
    assert data["avg_system_buy_price_gbp"] > 0
    assert len(data["daily_summaries"]) == 31
    assert "Genuine Elexon" in data["data_source"]

