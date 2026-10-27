# WindLens Video Demonstration Script (10-Minute Maximum)

This script provides a structured narration guide and screen action sequence for a 10-minute video demonstration. It is divided into two distinct 5-minute sections:
- **Part 1 (0:00–5:00):** Customer Presentation to the Energy Utility Day-Ahead Trading Desk.
- **Part 2 (5:00–10:00):** Technical Review for the Internal Technical Lead.

---

## Part 1: Customer Presentation — Day-Ahead Trading Desk (5 Minutes)

### 0:00 – 0:30 | Introduction & The Day-Ahead Challenge
- **Screen:** Open WindLens Executive Dashboard.
- **Narration:**
  > "Hello team. As power procurement traders for a UK energy utility, your core mandate every morning is determining how much wholesale electricity to buy in the day-ahead auction to meet consumer demand.
  > Because wind power is weather-dependent, you face a critical question: *How much wind will be available tomorrow, and how accurate was the forecast when you actually had to make the purchase decision?*
  > Today, I am proud to present **WindLens**, an analytics platform built specifically for your day-ahead trading desk, evaluating genuine Elexon actuals against wind forecasts for January 2026."

### 0:30 – 1:30 | Executive Dashboard & Pilot Assumptions
- **Screen:** Hover over the Pilot Assumption Notice and KPI cards.
- **Narration:**
  > "Here on the Executive Dashboard, we immediately see the operational picture.
  > Notice the blue banner at the top: we have established a clear, transparent pilot assumption: **12:00 UK local time on day D-1** as the decision cutoff instant. Look-ahead bias is strictly eliminated—no forecasts published after this cutoff are ever used.
  > Across January 2026, the national wind fleet generated an average of **11,581 MW**, but day-ahead forecasts predicted an average of **13,387 MW**.
  > This created a systematic positive **Forecast Bias of +1,805 MW** with a **Mean Absolute Error (MAE) of 2,002 MW** and a **WAPE of 17.29%**.
  > In 88% of matched intervals, day-ahead forecasts overestimated actual wind generation."

### 1:30 – 2:30 | Forecast vs Actual Generation Time-Series
- **Screen:** Click on the **'Forecast vs Actual'** tab. Hover over interval tooltips. Zoom to Week 2 (`W2`).
- **Narration:**
  > "Moving to the time-series explorer, we compare genuine Elexon `FUELHH` actual wind outturn—the solid green line—against the day-ahead forecast from `WINDFOR`—the dashed cyan line.
  > Looking at Week 2 in January, observe how wind fluctuated dramatically between 3,000 MW and 21,000 MW.
  > Hovering over an interval like January 10th at 18:00, our rich tooltip shows:
  > - Outturn: 14,200 MW
  > - Selected Day-Ahead Forecast: 16,800 MW
  > - Forecast Publication Time: January 9th at 11:30 UTC, 30 minutes prior to your decision cutoff.
  > You can instantly spot large ramp deviations and understand where forecast divergence occurred."

### 2:30 – 3:30 | Quantitative Error & Accuracy Analytics
- **Screen:** Click on the **'Error & Accuracy Analytics'** tab. Switch between Error Time-Series, Histogram, and Daily MAE.
- **Narration:**
  > "Under Error Analytics, we quantitatively evaluate the error: $e = \text{Forecast} - \text{Actual}$.
  > The amber bars represent periods of overforecasting; the rose bars show underforecasting.
  > Notice the zero-reference line: deviations above zero mean wind underperformed expectations.
  > Switching to the **Distribution Histogram**, we see an asymmetric distribution with positive skew: errors frequently clustered between +1,000 MW and +3,000 MW.
  > The **Daily Breakdown** chart demonstrates that while some days had low errors around 800 MW, major storm transitions experienced daily MAE spikes exceeding 3,500 MW."

### 3:30 – 4:20 | Interval Vintage Audit (Look-Ahead Bias Protection)
- **Screen:** Click on the **'Interval Explorer'** table. Locate an interval and click the **'Inspect'** button to open the Vintage Modal.
- **Narration:**
  > "Now let's examine one of WindLens's most powerful features: the **Forecast Vintage Auditor**.
  > For any delivery interval, you can click 'Inspect'.
  > Here, you see all 24 forecast vintages published by Elexon for this single interval.
  > The vintages published before 12:00 D-1 are marked as **Eligible**, and the latest one is highlighted as **Selected**.
  > The 18 subsequent vintages published in the afternoon and overnight are marked as **Excluded**.
  > This gives your trading desk 100% confidence that our accuracy numbers reflect the exact information available when you submitted your bids."

### 4:20 – 5:00 | Day-Ahead Procurement Decision Simulator
- **Screen:** Click on the **'Procurement Simulator'** tab. Move the demand slider between 25,000 MW and 35,000 MW.
- **Narration:**
  > "Finally, how does this translate into your daily procurement decisions?
  > In our **Procurement Simulator**, we model: $\text{Residual Procurement} = \text{Demand} - \text{Forecast Wind}$.
  > If consumer demand is 30,000 MW and wind forecast is 12,000 MW, your nominal purchase requirement is 18,000 MW.
  > But because our empirical MAE is 2,002 MW, WindLens calculates the **Uncertainty Band**:
  > If wind underperforms by 1 MAE, your thermal procurement requirement rises to 20,000 MW.
  > This allows your team to pre-contract thermal flexibility and hedge intraday balancing cashout risks.
  > Thank you—let's now review the technical architecture."

---

## Part 2: Technical Lead Review — Architecture & Engineering (5 Minutes)

### 5:00 – 5:40 | System Architecture & Monorepo Structure
- **Screen:** Display `docs/architecture.md` and the monorepo directory tree.
- **Narration:**
  > "Welcome to the technical review. WindLens is architected as a decoupled, production-grade web platform:
  > - **Backend:** Python with FastAPI, Pydantic v2, and native `zoneinfo` time-zone handling.
  > - **Frontend:** React 19, TypeScript, Vite, and Recharts, styled with custom high-contrast CSS.
  > - **Containerization:** Docker Compose managing isolated frontend and backend services with Nginx reverse proxying.
  > - **Data Layer:** Pre-seeded in-memory cache of 2.59 MB holding 1,488 actuals and 18,080 forecast vintages, allowing instantaneous recalculations."

### 5:40 – 6:40 | Data Pipeline & The 1-Hour Resolution Discovery
- **Screen:** Open `backend/app/services/data_store.py` and `backend/scripts/fetch_jan2026_data.py`.
- **Narration:**
  > "Let's review the Elexon data ingestion. We interface directly with Elexon's Insights Solution BMRS Stream API:
  > - `FUELHH/stream`: Provides half-hourly generation by fuel type. We filter strictly for `fuelType == 'WIND'`, yielding 1,488 records across January 2026.
  > - `WINDFOR/stream`: Provides national wind forecasts.
  > An important empirical discovery during ingestion: National Grid ESO publishes `WINDFOR` at **1-hour intervals**, while `FUELHH` is published at **half-hour intervals**.
  > Per assignment instructions—*do not interpolate missing values in primary accuracy metrics*—we match exact timestamps:
  > - 744 hourly intervals have exact matched pairs (100% of available forecasts).
  > - 744 half-hour intervals (`:30`) are transparently flagged as `MISSING_FORECAST` without synthetic data invention."

### 6:40 – 7:40 | Forecast Selection & Zero Look-Ahead Bias
- **Screen:** Open `backend/app/analysis/forecast_selector.py` and `backend/app/utils/timezone_utils.py`.
- **Narration:**
  > "The core engine lives in `forecast_selector.py`.
  > Given a target interval $T_i$, `get_decision_cutoff_utc` converts $T_i$ to UK local time (`Europe/London`), computes the preceding calendar date $D-1$, sets the local cutoff time (e.g. 12:00), and converts back to UTC.
  > We then filter all vintages where `publishTime <= cutoff_utc`.
  > The latest eligible vintage is selected.
  > If the user changes the cutoff from 12:00 to 14:00, the backend dynamically re-evaluates all 744 intervals in under 30 milliseconds without relying on stale pre-calculated values."

### 7:40 – 8:40 | Code Quality, Error Handling, and Automated Tests
- **Screen:** Terminal running `pytest backend/tests -v`.
- **Narration:**
  > "Reliability is paramount. We built an automated test suite with **24 unit and integration tests** in pytest:
  > - `test_forecast_selector.py`: Tests latest eligible selection, cutoff boundaries, post-cutoff exclusions, and missing forecasts.
  > - `test_metrics.py`: Verifies mathematical correctness of MAE, RMSE, Bias sign, and zero-denominator safety in WAPE.
  > - `test_timezone.py`: Verifies Europe/London timezone handling and month boundary transitions (e.g. Jan 1 delivery cutoff on Dec 31).
  > - `test_api.py`: Validates FastAPI endpoints, responses, and error handling.
  > All 24 tests pass in 2.6 seconds.
  > On the frontend, `npm run build` compiles cleanly with zero TypeScript errors."

### 8:40 – 9:30 | Containerization & Deployment Architecture
- **Screen:** Open `docker-compose.yml` and `frontend/nginx.conf`.
- **Narration:**
  > "For local and production deployment, WindLens is fully containerized:
  > - `backend/Dockerfile`: Multi-stage Python 3.12 image with healthcheck.
  > - `frontend/Dockerfile`: Multi-stage Node.js build producing static assets served by Nginx.
  > - `nginx.conf`: Proxies `/api/` and `/health` to the backend container while serving the SPA.
  > A single command—`docker compose up --build`—spins up the entire platform on ports 3000 and 8000."

### 9:30 – 10:00 | Limitations & Production Roadmap
- **Screen:** Return to the WindLens platform and conclusion slide.
- **Narration:**
  > "In summary, WindLens delivers an end-to-end, statistically sound pilot for day-ahead wind analytics.
  > To respect the assignment scope:
  > 1. The 12:00 cutoff is a pilot assumption, not an official Elexon rule.
  > 2. The data is confined to Elexon FUELHH and WINDFOR without demand or market prices.
  > 3. For production, we can integrate utility smart meter demand streams and half-hour NWP ensemble models.
  > Thank you for your time, and I look forward to your questions."
