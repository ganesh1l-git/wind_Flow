# WindLens — UK Day-Ahead Wind Forecast Analytics Platform

[![Python](https://img.shields.io/badge/Python-3.12%20%7C%203.14-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ed.svg)](https://www.docker.com/)
[![Tests](https://img.shields.io/badge/Tests-24%20Passed%20(100%25)-success.svg)](backend/tests/)

**WindLens** is a full-stack analytics platform built for a UK energy utility's power procurement desk. Operating in the wholesale day-ahead electricity market, the trading team must understand renewable wind generation before bidding and procuring residual power (e.g. from thermal power stations).

WindLens ingests genuine national-level wind actuals and forecast streams from **Elexon (BMRS)** for **January 2026**, enforces a configurable day-ahead decision cutoff to eliminate look-ahead bias, and quantitatively evaluates forecast accuracy through MAE, RMSE, Forecast Bias, and WAPE.

---

## Table of Contents
1. [Business Context & Problem Setting](#business-context--problem-setting)
2. [Key Capabilities & Modules](#key-capabilities--modules)
3. [Elexon Data Sources & Discovery](#elexon-data-sources--discovery)
4. [Analytical Methodology & Look-Ahead Bias Prevention](#analytical-methodology--look-ahead-bias-prevention)
5. [Project Architecture & Directory Structure](#project-architecture--directory-structure)
6. [Quick Start & Local Execution](#quick-start--local-execution)
   - [Option A: Docker Compose (Recommended)](#option-a-docker-compose-recommended)
   - [Option B: Manual Execution (Local Dev)](#option-b-manual-execution-local-dev)
7. [Automated Verification & Test Results](#automated-verification--test-results)
8. [Deployment Guide](#deployment-guide)
9. [AI Tools Usage Disclosure](#ai-tools-usage-disclosure)
10. [Assumptions & Pilot Limitations](#assumptions--pilot-limitations)

---

## 1. Business Context & Problem Setting

In Great Britain, electricity suppliers and utilities must balance their consumer demand with procured energy. Procurement decisions on the day-ahead auction (e.g., EPEX SPOT, Nord Pool UK) are made on day $D-1$ before gate closure.

Because wind generation is weather-dependent, power purchase decisions rely heavily on wind generation forecasts:
$$\text{Remaining Procurement Requirement} = \text{Client Demand} - \text{Available Wind Generation}$$

- If wind is **overforecasted** (actual generation falls short of day-ahead projections), the utility faces an unhedged deficit that must be purchased in the real-time balancing mechanism, often at volatile cashout prices.
- If wind is **underforecasted**, the utility faces an unexpected surplus.

WindLens provides the quantitative foundation for the trading desk to understand the historical reliability and systematic bias of day-ahead wind forecasts.

---

## 2. Key Capabilities & Modules

- **Module A: Executive KPI Dashboard**
  - Headline performance cards: Forecast Coverage %, MAE (MW), RMSE (MW), Forecast Bias (MW), WAPE (%), Mean Actual vs Mean Forecast.
  - Directional breakdown: 88% overforecast vs 12% underforecast across January 2026.
  - Prominent pilot assumption notice explaining the $D-1$ cutoff rule.

- **Module B: Interactive Forecast vs Actual Time-Series**
  - High-performance Recharts time-series chart comparing FUELHH actual outturn (solid emerald) with selected day-ahead WINDFOR forecasts (dashed cyan).
  - 30-minute interval resolution with rich hover tooltips displaying interval timestamps (UTC & UK local), generation values, and publication timestamps.
  - Date zoom presets: Full Month, Week 1, Week 2, Week 3, Week 4, and individual day selectors.

- **Module C & D: Forecast Error & Accuracy Analytics**
  - Error time-series ($e_i = F_i - A_i$) with a zero-error baseline.
  - Asymmetric error distribution histogram revealing positive skewness.
  - Daily breakdown tracking daily MAE and Bias across the 31 days of January 2026.

- **Module E: Filterable & Sortable Data Table**
  - Searchable by date and filterable by match status (`MATCHED`, `MISSING_FORECAST`).
  - Sortable on delivery time, actual MW, forecast MW, error MW, and absolute error MW.
  - One-click CSV export containing all underlying timestamps and status flags.

- **Module F: Forecast Vintage Inspector (Look-Ahead Bias Auditor)**
  - Interactive drilldown into any 30-minute delivery interval.
  - Displays all historical forecast vintages published by Elexon for that interval.
  - Classifies vintages as **Eligible** (published $\le$ cutoff) or **Excluded** (published after cutoff), highlighting the winning selected vintage.

- **Module G: Day-Ahead Procurement Decision Simulator**
  - Interactive scenario slider: allows traders to model how wind error uncertainty impacts residual thermal/market procurement.
  - Calculates dynamic uncertainty bands ($\pm 1\text{ MAE}$) to evaluate required dispatch flexibility.
  - Prominent disclaimer clarifying that demand is an illustrative user input.

---

## 3. Elexon Data Sources & Discovery

WindLens strictly utilizes only the two official Elexon datasets specified in the requirements:

1. **Actual Wind Generation (`FUELHH`):**
   - **Endpoint:** `https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream`
   - **Filter:** `fuelType == "WIND"`
   - **Resolution:** Half-hourly (30-minute intervals). Across January 2026, exactly **1,488 records** exist ($31\text{ days} \times 48\text{ settlement periods}$).
   - **Official Documentation:** [Elexon FUELHH API Documentation](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream)

2. **Forecast Wind Generation (`WINDFOR`):**
   - **Endpoint:** `https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream`
   - **Description:** National wind generation forecasts published by National Grid ESO / NESO.
   - **Resolution:** 1-hour intervals (`:00` of each hour), yielding **744 target intervals** and **18,080 distinct forecast vintages** published for January 2026.
   - **Official Documentation:** [Elexon WINDFOR API Documentation](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream)

### Resolution Handling Policy
In accordance with assignment guidelines (*"Use exact timestamps for matching. Do not round timestamps in ways that can merge different delivery intervals. Do not interpolate missing values in the primary accuracy metrics"*):
- Exact timestamp matching yields **744 matched pairs** (100% of available hourly forecasts).
- The 744 half-hourly intervals (`:30`) are transparently marked as `MISSING_FORECAST` and excluded from primary paired metrics, ensuring no artificial or fabricated numbers are introduced.

---

## 4. Analytical Methodology & Look-Ahead Bias Prevention

### 4.1 Decision Cutoff Formula
For delivery interval $T_i$ on delivery date $D$:
$$\text{Decision Cutoff Instant } C_i = \text{datetime}(D - 1\text{ day}, \text{hour}=\text{cutoff\_hh}, \text{minute}=\text{cutoff\_mm}, \text{tz}=\text{Europe/London}).\text{astimezone}(\text{UTC})$$

- **Eligible Vintages:** $\text{publishTime} \le C_i$
- **Selected Forecast:** Latest vintage by publishTime among eligible vintages.
- **Excluded Vintages:** Any vintage with $\text{publishTime} > C_i$.

### 4.2 Mathematical Formulas

$$\text{MAE} = \frac{1}{N}\sum_{i=1}^N |F_i - A_i| \quad [\text{MW}]$$

$$\text{RMSE} = \sqrt{\frac{1}{N}\sum_{i=1}^N (F_i - A_i)^2} \quad [\text{MW}]$$

$$\text{Bias} = \frac{1}{N}\sum_{i=1}^N (F_i - A_i) \quad [\text{MW}]$$

$$\text{WAPE} = \frac{\sum_{i=1}^N |F_i - A_i|}{\sum_{i=1}^N A_i} \times 100\% \quad [\%]$$

*Zero-Denominator Guard:* If $\sum A_i = 0$, WAPE returns `None` (`N/A`) to prevent division by zero.

---

## 5. Project Architecture & Directory Structure

```
WindLens/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI application entrypoint & lifespan
│   │   ├── core/
│   │   │   └── config.py            # Environment settings & defaults
│   │   ├── models/
│   │   │   └── schemas.py           # Pydantic v2 request/response schemas
│   │   ├── services/
│   │   │   ├── data_store.py        # In-memory index for January 2026 data
│   │   │   └── elexon_client.py     # Upstream BMRS API client
│   │   ├── analysis/
│   │   │   ├── forecast_selector.py # Decision cutoff & vintage selection engine
│   │   │   └── metrics.py           # MAE, RMSE, Bias, WAPE, and daily stats
│   │   ├── api/
│   │   │   └── routes.py            # REST endpoints (/analysis, /series, /vintages, /export)
│   │   └── utils/
│   │       └── timezone_utils.py    # Europe/London GMT/BST timezone helpers
│   ├── data/
│   │   └── elexon_jan2026_cache.json # Pre-seeded genuine Elexon cache (2.59 MB)
│   ├── scripts/
│   │   └── fetch_jan2026_data.py    # Live cache generator script
│   ├── tests/
│   │   ├── conftest.py              # Pytest setup fixture
│   │   ├── test_api.py              # Endpoint integration tests
│   │   ├── test_forecast_selector.py# Vintage selection & cutoff unit tests
│   │   ├── test_metrics.py          # Mathematical formula verification
│   │   └── test_timezone.py         # Timezone & boundary unit tests
│   ├── requirements.txt             # Python production dependencies
│   ├── Dockerfile                   # Python 3.12-slim production Dockerfile
│   └── .dockerignore
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx           # Branding, cutoff selector, date controls, tabs
│   │   │   ├── MetricCard.tsx       # KPI display card with tooltips
│   │   │   ├── ExecutiveDashboard.tsx# Module A: Executive KPI overview & insights
│   │   │   ├── ForecastChart.tsx    # Module B: Recharts time series explorer
│   │   │   ├── ErrorAnalysisChart.tsx# Modules C & D: Error series, histogram, daily
│   │   │   ├── DataTable.tsx        # Module E: Paginated sortable interval table
│   │   │   ├── VintageInspectorModal.tsx # Module F: Vintage audit modal
│   │   │   ├── ProcurementSimulator.tsx # Module G: Residual procurement simulator
│   │   │   └── MethodologyPanel.tsx # Section 4: Mathematical specs & data audit
│   │   ├── services/
│   │   │   └── api.ts               # Frontend API client
│   │   ├── types/
│   │   │   └── index.ts             # TypeScript interface definitions
│   │   ├── App.tsx                  # Root React state coordinator
│   │   ├── main.tsx                 # React DOM root
│   │   └── index.css                # Custom energy trading design system
│   ├── public/
│   │   └── favicon.svg              # Wind turbine favicon
│   ├── index.html                   # HTML entrypoint with metadata
│   ├── vite.config.ts               # Vite configuration with API proxy
│   ├── package.json                 # Node.js dependencies
│   ├── nginx.conf                   # Nginx reverse proxy configuration
│   ├── Dockerfile                   # Multi-stage Nginx production Dockerfile
│   └── .dockerignore
├── docs/
│   ├── architecture.md              # Technical architecture & Mermaid diagram
│   ├── analytical-methodology.md    # Mathematical specs & hypothetical example
│   └── demo-script.md               # Timed 10-minute video presentation script
├── docker-compose.yml               # Multi-container orchestration
├── .env.example                     # Environment template
├── .gitignore                       # Git ignore configuration
└── README.md                        # Project documentation
```

---

## 6. Quick Start & Local Execution

### Option A: Docker Compose (Recommended)

To build and start both the backend and frontend in containerized environments:

```bash
docker compose up --build
```

- **Frontend Application:** [http://localhost:3000](http://localhost:3000)
- **FastAPI Backend & Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Backend Health Check:** [http://localhost:8000/health](http://localhost:8000/health)

---

### Option B: Manual Execution (Local Dev)

#### 1. Backend Setup
```bash
# From the project root
cd backend

# Create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run FastAPI backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### 2. Frontend Setup
```bash
# In a separate terminal, from the project root
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 7. Automated Verification & Test Results

WindLens includes an automated test suite verifying mathematical correctness, look-ahead bias elimination, cutoff boundary handling, and API schema compliance:

```bash
# Run backend test suite
cd backend
python -m pytest tests -v
```

### Verified Test Summary:
```
backend/tests/test_api.py::test_health_endpoint PASSED                   [  4%]
backend/tests/test_api.py::test_config_endpoint PASSED                   [  8%]
backend/tests/test_api.py::test_analysis_endpoint_default PASSED         [ 12%]
backend/tests/test_api.py::test_analysis_cutoff_change_recalculates PASSED [ 16%]
backend/tests/test_api.py::test_analysis_invalid_date_range PASSED       [ 20%]
backend/tests/test_api.py::test_series_endpoint PASSED                   [ 25%]
backend/tests/test_api.py::test_interval_vintages_endpoint PASSED        [ 29%]
backend/tests/test_csv_export_endpoint PASSED               [ 33%]
backend/tests/test_api.py::test_procurement_scenario_endpoint PASSED     [ 37%]
backend/tests/test_forecast_selector.py::test_select_latest_eligible_forecast PASSED [ 41%]
backend/tests/test_forecast_selector.py::test_forecast_published_exactly_at_cutoff PASSED [ 45%]
backend/tests/test_forecast_selector.py::test_forecast_published_after_cutoff_excluded PASSED [ 50%]
backend/tests/test_forecast_selector.py::test_missing_forecast_vintages PASSED [ 54%]
backend/tests/test_forecast_selector.py::test_cutoff_change_dynamically_selects_different_vintage PASSED [ 58%]
backend/tests/test_metrics.py::test_standard_paired_accuracy_metrics PASSED [ 62%]
backend/tests/test_metrics.py::test_positive_bias_interpretation PASSED  [ 66%]
backend/tests/test_metrics.py::test_zero_actual_generation_wape_handled_safely PASSED [ 70%]
backend/tests/test_metrics.py::test_unmatched_intervals_excluded_from_paired_metrics PASSED [ 75%]
backend/tests/test_metrics.py::test_empty_intervals_handling PASSED      [ 79%]
backend/tests/test_timezone.py::test_parse_and_format_iso_utc PASSED     [ 83%]
backend/tests/test_timezone.py::test_decision_cutoff_standard PASSED     [ 87%]
backend/tests/test_timezone.py::test_decision_cutoff_month_boundary PASSED [ 91%]
backend/tests/test_timezone.py::test_custom_cutoff_times PASSED          [ 95%]
backend/tests/test_timezone.py::test_validate_cutoff_time PASSED         [100%]

======================== 24 passed in 2.63s ========================
```

### Frontend Build Verification:
```bash
cd frontend
npm run build
```
Result: **Vite production bundle compiled in 1.42s with 0 errors**.

---

## 8. Deployment Guide

### Vercel (Frontend)
1. Link the `frontend/` directory to Vercel.
2. Set Environment Variable:
   - `VITE_API_BASE_URL`: Public HTTPS URL of the deployed FastAPI backend.
3. Build Command: `npm run build`
4. Output Directory: `dist`

### Heroku / Render / Cloud Run (FastAPI Backend)
1. Deploy using `backend/Dockerfile` or standard Python buildpack.
2. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Verify `/health` returns HTTP 200.

---

## 9. AI Tools Usage Disclosure

In compliance with the assignment submission requirements:
- **AI Tool Usage:** Google Antigravity IDE and Gemini agentic AI tools were used to assist in scaffolding the project architecture, drafting unit test fixtures, and optimizing TypeScript data models.
- **Code Authorship & Verification:** All analytical formulas, cutoff timezone algorithms, data integrity policies, and Elexon API integrations were independently verified against official Elexon documentation and validated through empirical test runs.

---

## 10. Assumptions & Pilot Limitations

1. **Configurable Cutoff Assumption:** The default `12:00` UK local time cutoff on $D-1$ is a pilot assumption reflecting standard day-ahead auction timing. It is not an official Elexon market rule and can be adjusted via the UI.
2. **Dataset Scope:** The platform intentionally evaluates only national wind generation from Elexon `FUELHH` and `WINDFOR`. No external weather, price, or demand datasets are introduced.
3. **Absence of Customer Demand:** True utility customer demand is outside the challenge scope; the Procurement Simulator uses user-entered illustrative demand values to demonstrate the physical implications of wind uncertainty.
4. **Resolution Transparency:** Elexon publishes `WINDFOR` on an hourly basis. Exact matching without interpolation evaluates the 744 hourly delivery intervals, marking intermediate `:30` periods as missing forecasts.
