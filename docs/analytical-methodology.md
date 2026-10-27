# Analytical Methodology & Mathematical Specification

This document details the analytical principles, temporal mechanics, mathematical formulas, and data quality standards governing **WindLens**.

---

## 1. The Energy Trading Context

In the UK wholesale electricity market, energy suppliers and utilities must continuously balance their physical consumer demand with procured generation. Power purchases on the Day-Ahead Market (e.g. EPEX SPOT or Nord Pool UK day-ahead auctions) must be submitted and cleared on day $D-1$ before gate closure.

Because wind generation is weather-dependent and exhibits significant intermittency, the trading desk must rely on day-ahead renewable forecasts to determine how much residual power must be procured from thermal power stations (e.g., CCGT, biomass) or other flexible assets.

The fundamental procurement balance equation is:

$$\text{Remaining Procurement Requirement} = \text{Client Demand} - \text{Available Wind Generation}$$

If wind generation is **overforecasted**, actual wind outturn falls short of expectations, leaving the utility with a deficit that must be covered in the expensive intraday balancing mechanism. If wind is **underforecasted**, the utility faces an unexpected surplus that may need to be spilled or sold back at discounted cashout prices.

---

## 2. Temporal Logic & The Day-Ahead Decision Cutoff

### 2.1 The Danger of Look-Ahead Bias

National Grid ESO (now NESO) issues updated wind forecasts continuously throughout each day as numerical weather prediction (NWP) models update. For any given delivery interval (e.g. January 15 at 14:00 UTC), dozens of forecast vintages are published:
- Some are published 48 hours in advance.
- Some are published 24 hours in advance (Day-Ahead).
- Some are published 4 hours in advance (Intraday).
- Some are published 30 minutes in advance (Near Real-Time).

Evaluating forecast accuracy using the *latest forecast published right before delivery* introduces severe **look-ahead bias**: it reflects weather knowledge that did not exist when the day-ahead trading decision was executed.

### 2.2 Day-Ahead Decision Cutoff Rule

WindLens eliminates look-ahead bias by enforcing a configurable **pilot decision cutoff** (default: `12:00` UK local time on preceding day $D-1$):

1. **Target Delivery Interval ($T_i$):** An exact 30-minute interval on delivery date $D$.
2. **Preceding Local Calendar Day ($D-1$):**
   $$\text{Local Delivery Date} = \text{to\_uk\_local}(T_i).\text{date}()$$
   $$\text{Decision Date} = \text{Local Delivery Date} - 1 \text{ day}$$
3. **Cutoff Instant ($C_i$):**
   $$C_i = \text{datetime}(\text{Decision Date}, \text{hour}=12, \text{minute}=00, \text{tz}=\text{Europe/London}).\text{astimezone}(\text{UTC})$$
4. **Eligibility Criterion:**
   $$\text{Eligible}(v) \iff \text{publishTime}(v) \le C_i$$
5. **Winning Selection:**
   $$F_i = \text{generation}(\arg\max_{v \in \text{Eligible}} \text{publishTime}(v))$$

If no forecast vintage satisfies $\text{publishTime}(v) \le C_i$, the interval is flagged as `MISSING_FORECAST`. WindLens never silently falls forward to a post-cutoff forecast.

---

## 3. Mathematical Metric Formulations

All primary paired accuracy metrics are computed over the set of matched intervals:

$$\mathcal{M} = \{ i \in \{1, \dots, N_{\text{calendar}}\} \mid \text{has\_actual}(i) \land \text{has\_forecast}(i) \}$$

$$N = |\mathcal{M}|$$

### 3.1 Mean Absolute Error (MAE)

Measures the average absolute magnitude of forecast errors in megawatts:

$$\text{MAE} = \frac{1}{N} \sum_{i \in \mathcal{M}} |F_i - A_i| \quad [\text{MW}]$$

*Interpretation:* On average, the day-ahead forecast deviated from actual generation by MAE megawatts, regardless of direction.

### 3.2 Root Mean Squared Error (RMSE)

Measures the quadratic mean error, penalizing large outlier errors more heavily than small ones:

$$\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i \in \mathcal{M}} (F_i - A_i)^2} \quad [\text{MW}]$$

*Interpretation:* If RMSE is significantly larger than MAE, it indicates the presence of large, sudden forecast errors (e.g. during sudden frontal passages or wind ramp events).

### 3.3 Forecast Bias

Measures the systematic tendency of the forecast to overpredict or underpredict actual generation:

$$\text{Bias} = \frac{1}{N} \sum_{i \in \mathcal{M}} (F_i - A_i) \quad [\text{MW}]$$

- **$\text{Bias} > 0$ (Positive Bias):** The forecast overestimated wind generation on average. Actual wind was lower than expected, creating under-procurement risks.
- **$\text{Bias} < 0$ (Negative Bias):** The forecast underestimated wind generation on average. Actual wind was higher than expected, creating surplus risks.

### 3.4 Weighted Absolute Percentage Error (WAPE)

Normalizes total absolute error by total actual energy generation:

$$\text{WAPE} = \frac{\sum_{i \in \mathcal{M}} |F_i - A_i|}{\sum_{i \in \mathcal{M}} A_i} \times 100\% \quad [\%]$$

*Zero-Denominator Handling:* If $\sum_{i \in \mathcal{M}} A_i = 0$, WAPE is mathematically undefined. The application returns `None` (rendered as `N/A`) rather than raising a division-by-zero error or presenting misleading percentages.

---

## 4. Empirical Resolution Findings

When processing genuine January 2026 Elexon data:
- `FUELHH`: Half-hourly resolution (1,488 records for WIND).
- `WINDFOR`: 1-hour resolution (744 records).

**Handling Policy:**
WindLens matches records on exact timestamps:
- The 744 hourly intervals have exact matching pairs ($N = 744$, 100% of available forecasts).
- The 744 half-hourly intervals (`:30`) have valid actuals but no forecast published on that exact timestamp. They are marked `MISSING_FORECAST` and excluded from primary paired metrics.
- This adheres strictly to the rule: *"Do not interpolate missing values in the primary accuracy metrics."*

---

## 5. Walkthrough Example (Hypothetical)

> [!NOTE]
> The following table is a clearly labelled, illustrative hypothetical scenario to demonstrate vintage selection and error calculation mechanics. It does not represent real January 2026 data.

### Hypothetical Interval: Delivery Target = 2026-06-15 14:00 UK Local
- Delivery Date: `2026-06-15` (BST, UTC+1).
- Target Start Instant (UTC): `2026-06-15T13:00:00Z`.
- Assumed Decision Cutoff: `12:00` UK Local on $D-1$ (`2026-06-14 12:00 BST` = `2026-06-14T11:00:00Z` UTC).

| Vintage ID | Publication Time (UTC) | Forecast (MW) | Published $\le$ Cutoff? | Audit Eligibility | Selection Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **V1** | 2026-06-13T06:00:00Z | 3,200 MW | Yes | Eligible | Superseded by V2 |
| **V2** | 2026-06-14T10:30:00Z | 3,600 MW | Yes ($\le$ 11:00:00Z) | Eligible | **★ SELECTED (Latest Eligible)** |
| **V3** | 2026-06-14T14:00:00Z | 4,100 MW | No ($>$ 11:00:00Z) | Excluded | Excluded (Post-cutoff) |
| **V4** | 2026-06-15T08:00:00Z | 4,500 MW | No ($>$ 11:00:00Z) | Excluded | Excluded (Delivery day) |

**Resulting Evaluation:**
- Selected Forecast ($F_i$): **3,600 MW** (from V2).
- Actual Generation ($A_i$): **3,100 MW** (hypothetical outturn).
- Forecast Error ($e_i$): $3,600 - 3,100 = \mathbf{+500\text{ MW}}$ (Overforecast).
- Absolute Error ($|e_i|$): **500 MW**.
- Notice: If V3 or V4 had been erroneously used, the error would have appeared as +1,000 MW or +1,400 MW, distorting historical performance.

---

## 6. Procurement Decision Support Boundaries

WindLens provides an educational procurement simulation to help trading teams interpret forecast errors in terms of physical dispatch:

$$\text{Residual Thermal Procurement} = \max(0, \text{Client Demand} - \text{Selected Wind Forecast})$$

**Important Boundary:** Client electricity demand is outside the scope of Elexon's generation dataset. Therefore, the demand parameter in WindLens is explicitly user-entered and illustrative. WindLens does not fabricate demand or make commercial bidding recommendations.
