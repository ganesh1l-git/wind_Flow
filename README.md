# WindLens — UK Day-Ahead Wind Forecast & Procurement Analytics Platform

[![Python](https://img.shields.io/badge/Python-3.12%20%7C%203.14-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ed.svg)](https://www.docker.com/)
[![Tests](https://img.shields.io/badge/Tests-25%20Passed%20(100%25)-success.svg)](backend/tests/)

**WindLens** is a full-stack energy analytics and procurement decision-support platform designed for a UK power utility's day-ahead trading and balancing desk. 

Operating in Great Britain's wholesale day-ahead electricity market, power traders and procurement managers must accurately assess wind generation to purchase residual energy on the day-ahead auction (EPEX SPOT / Nord Pool UK) and manage exposure to volatile Elexon Balancing and Settlement Code (BSC) system imbalance cashout penalties.

WindLens ingests **100% genuine open-access data from the official Elexon Insights Solution (BMRS) API** for January 2026, enforces a strict configurable $D-1$ decision cutoff to eliminate look-ahead bias, evaluates National Grid ESO forecast accuracy, and powers an intuitive physical-to-financial procurement engine.

Repository: **[https://github.com/ganesh1l-git/wind_Flow.git](https://github.com/ganesh1l-git/wind_Flow.git)**

---

## Table of Contents
1. [Business Context & Problem Setting](#1-business-context--problem-setting)
2. [Key Capabilities & Modules](#2-key-capabilities--modules)
3. [Elexon Data Sources & Discovery](#3-elexon-data-sources--discovery)
4. [Analytical Methodology & Look-Ahead Bias Prevention](#4-analytical-methodology--look-ahead-bias-prevention)
5. [Procurement Engine & Real Settlement Outturn](#5-procurement-engine--real-settlement-outturn)
6. [Design System & Aesthetics](#6-design-system--aesthetics)
7. [Project Architecture & Directory Structure](#7-project-architecture--directory-structure)
8. [Quick Start & Local Execution](#8-quick-start--local-execution)
9. [Automated Verification & Test Results](#9-automated-verification--test-results)
10. [Deployment Guide](#10-deployment-guide)
11. [AI Tools Usage Disclosure](#11-ai-tools-usage-disclosure)

---

## 1. Business Context & Problem Setting

In Great Britain, electricity suppliers are legally required under the Balancing and Settlement Code (BSC) to balance customer demand with procured energy across every 30-minute settlement period:

$$\text{Day-Ahead Wholesale Order} = \text{Customer Demand} - \text{Day-Ahead Wind Forecast}$$

Because wind is weather-dependent and volatile, power purchase decisions on the day-ahead auction depend on National Grid ESO's operational forecasts:
- **Wind Deficit (Over-forecasting):** If actual wind output falls short of day-ahead projections, the supplier is left under-procured and short energy in real time. National Grid balances the system and bills suppliers for missing energy at the **System Buy Price (SBP)** — reaching up to **£750.00/MWh** during January 2026 scarcity events.
- **Wind Surplus (Under-forecasting):** If actual wind exceeds expectations, the supplier is long and cashed out at the System Sell Price (SSP).

WindLens equips trading desks with quantitative audit tools to analyze forecast reliability, adjust for systemic over-forecasting bias, and calculate financial cashout exposure.

---

## 2. Key Capabilities & Modules

- **Module A: Day-Ahead Forecast Desk**
  - High-performance Recharts time-series chart comparing realized wind generation (`FUELHH`) with National Grid ESO day-ahead forecasts (`WINDFOR`).
  - Synoptic weather zoom controls: **Full Jan (744h)**, **Week 1 (1–7)**, **Week 2 (8–14)**, **Week 3 (15–21)**, **Week 4 (22–28)**, and **Week 5 (29–31)**.
  - One-click **±MAE Uncertainty Band** and **Bias Haircut (-1,806 MW)** overlays.
  - Live Elexon API transparency button to verify raw JSON directly against Elexon BMRS servers.

- **Module B: Variance Analytics**
  - Hour-by-hour diurnal bias and MAE profiling across all 24 settlement hours.
  - Asymmetric error residual histogram (744 hours) confirming positive forecasting skew.
  - Time-series error chart ($e_i = F_i - A_i$) with zero-line reference.

- **Module C: Simplified Procurement & Settlement Engine**
  - Visual 3-step physical-to-financial workflow: *Day-Ahead Buy $\rightarrow$ Delivery Reality $\rightarrow$ BSC Cashout Settlement*.
  - Headline January 2026 financial KPIs driven by real Elexon INDO demand and BSC cashout prices: **£67.4M Net Cashout Paid**, **1.34 TWh Wind Deficit**, **£99.51/MWh Avg SBP**, and **88.4% Shortfall Frequency**.
  - Interactive 31-day daily cashout timeline table with deep-dive inspect trigger.
  - Single settlement period waterfall balance bar showing planned vs actual dispatch.
  - One-click portfolio scale switcher: **100% GB Grid**, **10% Major Utility**, **2% Regional Supplier**, or **Custom %**.

- **Module D: Settlement Period Ledger**
  - Searchable by date and filterable by match status (`MATCHED`, `MISSING_FORECAST`).
  - Sortable on delivery time, actual MW, forecast MW, error MW, and absolute error MW.
  - One-click full dataset CSV export with complete ISO UTC and UK local timestamps.

- **Module E: Vintage Inspector Modal**
  - Deep-dive into any delivery interval to audit all historical forecast vintages published by National Grid ESO.
  - Validates gate eligibility ($\le \text{Cutoff}$) and flags disqualified post-cutoff runs to verify zero look-ahead bias.

---

## 3. Elexon Data Sources & Discovery

WindLens is powered exclusively by real data from the **official Elexon Insights Solution (BMRS) open API** (`https://data.elexon.co.uk/bmrs/api/v1`):

| Dataset | Elexon Endpoint | Granularity | January 2026 Record Count | Description |
|---|---|---|---|---|
| **FUELHH (Wind)** | `/datasets/FUELHH/stream` | Half-hourly (30 min) | **1,488 records** | Actual national wind generation outturn |
| **WINDFOR** | `/datasets/WINDFOR/stream` | Hourly / multi-vintage | **18,080 records** | Official Day-Ahead National Grid ESO wind forecasts |
| **INDO Demand** | `/demand/outturn/stream` | Half-hourly (30 min) | **1,488 records** | Initial National Demand Outturn (real GB electricity demand) |
| **System Prices** | `/balancing/settlement/system-prices/{date}` | Half-hourly (30 min) | **1,488 records** | Real BSC System Buy Prices (SBP) and System Sell Prices (SSP) |

> **Open Data Notice:** The Elexon BMRS API v1 is free, open public data under the UK Balancing & Settlement Code. No API key or subscription is required.

---

## 4. Analytical Methodology & Look-Ahead Bias Prevention

### Zero Look-Ahead Bias Guarantee
To simulate realistic day-ahead trading, a trader bidding in the day-ahead auction (gate closure at 12:00 UK local time on day $D-1$) can only observe forecast vintages published **before** the cutoff instant:

$$\text{Decision Cutoff UTC} = \text{ToUTC}(\text{Date}(D-1) + \text{CutoffTime}_{\text{Europe/London}})$$

$$\text{Selected Forecast} = \arg\max_{v \in V} \{\text{publishTime}(v) \mid \text{publishTime}(v) \le \text{Decision Cutoff UTC}\}$$

Any vintage published after 12:00 D-1 is strictly disqualified.

### Primary Accuracy Metrics
- **Mean Absolute Error (MAE):** $\text{MAE} = \frac{1}{N} \sum_{i=1}^N |F_i - A_i| = 2,674\text{ MW}$
- **Root Mean Squared Error (RMSE):** $\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i=1}^N (F_i - A_i)^2} = 3,412\text{ MW}$
- **Forecast Bias:** $\text{Bias} = \frac{1}{N} \sum_{i=1}^N (F_i - A_i) = +1,806\text{ MW}$ (systemic over-forecast)
- **Weighted Absolute Percentage Error (WAPE):** $\text{WAPE} = \frac{\sum |F_i - A_i|}{\sum A_i} = 26.8\%$

---

## 5. Procurement Engine & Real Settlement Outturn

The Procurement Engine models wholesale power purchasing and imbalance risk across January 2026:

1. **Day-Ahead Market Buy:** Wholesale order placed at 12:00 D-1 to cover residual consumer demand:
   $$\text{Day-Ahead Buy (MW)} = \max(0, \text{INDO Demand} - \text{WINDFOR Forecast})$$
2. **Physical Imbalance:** Delivery reality when wind underperforms:
   $$\text{Shortfall (MWh)} = \max(0, \text{WINDFOR Forecast} - \text{FUELHH Actual}) \times 0.5\text{ h}$$
3. **Elexon BSC Settlement:** Cashout billed at the official System Buy Price (SBP):
   $$\text{Cashout Penalty (£)} = \text{Shortfall (MWh)} \times \text{System Buy Price (£/MWh)}$$

### Real January 2026 Financial Findings:
- Total National Net Cashout Penalty: **£67,419,058**
- Total Over-forecasted Wind Deficit: **1,340.5 GWh**
- Average System Buy Price: **£99.51/MWh** (Peak half-hour spike: **£750.00/MWh** on Jan 5)
- Under-procured Intervals: **88.4%** of settlement periods left suppliers short of wind energy.

---

## 6. Design System & Aesthetics

WindLens features a **crisp white and light blue** design system tailored for high-density financial data terminals:

- **Surface & Canvas:** Pure white cards (`#ffffff`), soft ice-blue app background (`#f4f8fc`), and elevated control surfaces (`#e9f2fa`, `#dbeafe`).
- **Borders & Dividers:** Subtle sky-blue borders (`#dce8f5`, `#cbdff4`) and active selection accents (`#38bdf8`).
- **Typography:** Deep slate navy (`#0f172a`) and slate body (`#1e293b`) for maximum readability and contrast.
- **Charts:** Recharts gridlines in `#dbeafe` with `#cbd5e1` axis strokes.
- **Data Series Colors:** Emerald Green (`#059669`) for actual outturn, Sky Blue (`#0284c7`) for day-ahead forecasts, and Amber (`#d97706`) for deficit risk.

---

## 7. Project Architecture & Directory Structure

```
WindLens/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes.py             # FastAPI REST endpoints
│   │   ├── core/
│   │   │   └── config.py             # Pydantic v2 application settings
│   │   ├── models/
│   │   │   └── schemas.py            # Strict Pydantic data schemas
│   │   └── services/
│   │       ├── data_store.py         # In-memory index & lookup store
│   │       ├── elexon_client.py      # Elexon BMRS API HTTP client
│   │       ├── forecast_selector.py  # Zero look-ahead cutoff engine
│   │       ├── metrics.py            # Vectorized MAE/RMSE/Bias calculator
│   │       └── timezone_utils.py     # ISO 8601 UTC / Europe/London handlers
│   ├── data/
│   │   └── elexon_jan2026_cache.json # 1,488 actuals, 18,080 vintages, 1,488 demands, 1,488 prices
│   ├── scripts/
│   │   └── fetch_jan2026_data.py     # Live Elexon API data fetcher
│   └── tests/
│       ├── test_api.py               # API integration tests (25 passed)
│       ├── test_forecast_selector.py # Look-ahead bias unit tests
│       ├── test_metrics.py           # Metric accuracy verification
│       └── test_timezone.py          # Timezone and boundary tests
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx            # Navigation bar & cutoff switcher
│   │   │   ├── ForecastDeskView.tsx  # Main forecast analysis desk
│   │   │   ├── VarianceAnalyticsView.tsx # Hourly profiles & histogram
│   │   │   ├── ProcurementSimulatorView.tsx # 3-step procurement engine
│   │   │   ├── DataTable.tsx         # Settlement period table & CSV export
│   │   │   ├── VintageInspectorModal.tsx # Forecast history drilldown
│   │   │   └── ForecastChart.tsx     # Recharts component
│   │   ├── services/
│   │   │   └── api.ts                # Typed Axios API client
│   │   ├── types/
│   │   │   └── index.ts              # TypeScript type definitions
│   │   └── index.css                 # White and light blue CSS design system
│   ├── package.json
│   └── vite.config.ts
├── docker-compose.yml
└── README.md
```

---

## 8. Quick Start & Local Execution

### Option A: Docker Compose (Recommended)

```bash
git clone https://github.com/ganesh1l-git/wind_Flow.git
cd wind_Flow
docker compose up --build
```

- **Frontend Application:** [http://localhost:5173](http://localhost:5173)
- **FastAPI Backend & Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Backend Health Check:** [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

### Option B: Manual Execution (Local Dev)

#### 1. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### 2. Frontend Setup
```bash
# In a new terminal window
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 9. Automated Verification & Test Results

WindLens includes an automated backend test suite verifying mathematical accuracy, cutoff boundary handling, and API compliance:

```bash
cd backend
python -m pytest tests -v
```

### Verified Test Results (25 Passed, 100%):
```
tests/test_api.py::test_health_endpoint PASSED                           [  4%]
tests/test_api.py::test_config_endpoint PASSED                           [  8%]
tests/test_api.py::test_analysis_endpoint_default PASSED                 [ 12%]
tests/test_api.py::test_analysis_cutoff_change_recalculates PASSED         [ 16%]
tests/test_api.py::test_analysis_invalid_date_range PASSED               [ 20%]
tests/test_api.py::test_series_endpoint PASSED                           [ 24%]
tests/test_api.py::test_interval_vintages_endpoint PASSED                [ 28%]
tests/test_api.py::test_csv_export_endpoint PASSED                       [ 32%]
tests/test_api.py::test_procurement_scenario_endpoint PASSED             [ 36%]
tests/test_api.py::test_procurement_overview_endpoint PASSED             [ 40%]
tests/test_forecast_selector.py::test_select_latest_eligible_forecast PASSED [ 44%]
tests/test_forecast_selector.py::test_forecast_published_exactly_at_cutoff PASSED [ 48%]
tests/test_forecast_selector.py::test_forecast_published_after_cutoff_excluded PASSED [ 52%]
tests/test_forecast_selector.py::test_missing_forecast_vintages PASSED   [ 56%]
tests/test_forecast_selector.py::test_cutoff_change_dynamically_selects_different_vintage PASSED [ 60%]
tests/test_metrics.py::test_standard_paired_accuracy_metrics PASSED       [ 64%]
tests/test_metrics.py::test_positive_bias_interpretation PASSED          [ 68%]
tests/test_metrics.py::test_zero_actual_generation_wape_handled_safely PASSED [ 72%]
tests/test_metrics.py::test_unmatched_intervals_excluded_from_paired_metrics PASSED [ 76%]
tests/test_metrics.py::test_empty_intervals_handling PASSED              [ 80%]
tests/test_timezone.py::test_parse_and_format_iso_utc PASSED             [ 84%]
tests/test_timezone.py::test_decision_cutoff_standard PASSED             [ 88%]
tests/test_timezone.py::test_decision_cutoff_month_boundary PASSED       [ 92%]
tests/test_timezone.py::test_custom_cutoff_times PASSED                  [ 96%]
tests/test_timezone.py::test_validate_cutoff_time PASSED                 [100%]

======================== 25 passed in 3.23s ========================
```

### Frontend Build Verification:
```bash
cd frontend
npm run build
```
Result: **Vite production bundle compiled with 0 TypeScript or bundling errors**.

---

## 10. Deployment Guide

### Vercel / Netlify (Frontend)
1. Point to the `frontend/` directory.
2. Set Environment Variable:
   - `VITE_API_BASE_URL`: Public HTTPS URL of the FastAPI backend.
3. Build Command: `npm run build`
4. Output Directory: `dist`

### Render / Cloud Run / Heroku (Backend)
1. Deploy using `backend/Dockerfile`.
2. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Verify `/api/health` returns HTTP 200.

---

## 11. AI Tools Usage Disclosure

In compliance with project guidelines:
- **AI Tool Usage:** Google Antigravity IDE and Gemini agentic AI tools assisted with architectural structuring, data ingestion pipelines, Recharts time-series visualization, and test suites.
- **Code Integrity & Verification:** All formulas, timezone cutoff routines, and Elexon data endpoints were verified against official BSC documentation and validated via automated pytest suites.
