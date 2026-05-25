# Phase 156 — Held-Instrument Focus + Casual-Investor Report Redesign Plan

## Goal

Update the portfolio-manager so it:

1. **Standardizes focused research/enrichment** for instruments that are:
   - persisted as portfolio candidates, and
   - already purchased / currently held.
2. **Redesigns all outbound email reports** for a casual, non-technical investor.
3. **Improves the portfolio report** to emphasize holdings, value, gains, and next-step guidance without repetition.
4. **Improves fill/purchase reports** to be concise and useful for completed buys.
5. **Improves health reports** so they stay minimal when healthy and action-oriented when there are issues.

This phase is presentation + reporting + data-selection focused. It must preserve existing safety constraints, readonly-first broker posture, and approval gates.

---

## User requirements captured

### 1) Instrument research focus
Make it standard to gather focused information on instruments that are:
- persisted as candidates
- already purchased / held

### 2) Email report design principles
All email reports should be:
- for a casual, non-geek user
- clear and succinct
- visually attractive
- use nice colors and rounded backgrounds
- avoid black backgrounds
- avoid low-contrast fonts
- mobile friendly

### 3) Portfolio report requirements
Audience:
- casual investor who wants to know what the portfolio contains, value, and gains

Requirements:
- management summary at the top
- include symbol and instrument name
- do not repeat information
- structure information clearly and readably
- include a simple overview table with:
  - quantity held
  - average buying price
  - last traded price
  - total value
  - gains since purchase
  - YTD
  - value in CHF
  - gains in CHF
- add a summary line with totals as needed
- show a short remark on the next step that would improve the portfolio

### 4) Fill / purchase report requirements
Audience:
- casual investor who wants to know what was bought at which price with what result

Requirements:
- as little information as possible while still useful
- include symbol and instrument name
- include:
  - quantity purchased
  - purchase price per unit
  - total cost
  - cost in CHF including commission
  - how many are now held

### 5) Health report requirements
Audience:
- non-geek user who wants to know if something went wrong

Requirements:
- if everything works, keep it minimal
- management summary at the top
- if there are issues, try to fix them automatically where safe
- if issues cannot be fixed, suggest solutions

---

## Non-goals

This phase does **not**:
- change ETF-only / CHF-first scope
- remove execution approval gates
- introduce live trading autonomy beyond current safety policy
- add speculative research on instruments outside approved/held/candidate scope
- redesign every internal dashboard surface unless needed to support reports

---

## Current-state hypothesis

Likely current system traits based on repo layout:
- reporting is generated via `src/reporting/*` and `scripts/generate-report.js`
- email rendering likely uses HTML templates in reporting modules
- dashboard and health report surfaces already exist
- instrument detail gathering may currently be spread across holdings sync / suggestion / proposal flows
- some reports may be optimized for completeness rather than investor readability

We should validate these assumptions before implementation.

---

## Target outcomes

### A. Focused instrument intelligence model
Introduce a standard notion of **report-worthy instrument enrichment** with priority tiers:

1. **Held instruments** — highest priority
   - always enrich for portfolio and fill reports
2. **Persisted candidates** — next priority
   - enrich when they are part of current proposal / watch / recommendation flows
3. **Everything else** — not enriched by default

Focused enrichment should prefer concise investor-useful facts, for example:
- symbol / ISIN / name
- asset class / region / issuer
- investment thesis in one line
- current role in portfolio
- cost basis / last price / value / gain context where held
- simple risk/fit notes where candidate

The goal is not “more data”; it is **better filtered context**.

### B. Unified investor-friendly email design system
Create or refactor a reusable email layout system with:
- light background
- readable typography
- strong contrast
- rounded cards / panels
- mobile-safe widths and stacking
- compact tables that degrade gracefully on narrow screens
- consistent section spacing and summary callouts
- no black backgrounds
- no low-contrast text

### C. Report-type-specific content contracts
Each report type should have a tighter, clearer information contract:
- portfolio report → holdings/value/gains overview
- fill report → what was bought, what it cost, what is now held
- health report → are things okay; if not, what happened and what next

---

## Proposed implementation lanes

### Lane 1 — Discovery and contract audit
Inspect:
- `src/reporting/reportGenerator.js`
- `src/reporting/reportEmail.js`
- `src/reporting/dashboardGenerator.js`
- health report generator path(s)
- fill/execution notification generator path(s)
- candidate persistence and held-instrument state sources

Deliverable:
- a short discovery note appended to this phase file or a sibling note
- identified source-of-truth fields for:
  - average buy price
  - last traded price
  - YTD
  - CHF conversion
  - commission-inclusive fill cost
  - currently held quantity
  - candidate/held instrument lists

### Lane 2 — Focused instrument enrichment policy
Define a small shared helper/service to select the subset of instruments that deserve richer data gathering:
- held instruments
- persisted candidates
- optionally active proposal instruments

Potential outputs:
- `src/reporting/instrumentFocus.js`
- or `src/lib/instrumentFocus.js`

Responsibilities:
- identify focused instruments
- normalize display fields
- provide concise investor-friendly fact blocks
- avoid broad noisy enrichment on unrelated instruments

### Lane 3 — Email design system refresh
Refactor report email HTML/CSS into reusable presentational primitives:
- page wrapper
- summary card
- section card
- KPI row / chips
- readable table styles
- mobile stacking helpers
- severity/status badge palette

Constraints:
- inline or email-safe CSS only
- graceful mobile rendering
- no dependence on dark theme

### Lane 4 — Portfolio report redesign
Create a new portfolio-report contract centered on:
1. Management summary
2. Portfolio snapshot
3. Holdings overview table
4. Totals line
5. Simple next-step remark
6. Optional concise risks / caveats only if material

#### Suggested portfolio report structure

1. **Management Summary**
   - total portfolio value
   - overall gain since purchase
   - YTD move
   - cash level
   - one-sentence status / next-step remark

2. **Portfolio Overview Table**
   Columns:
   - Symbol
   - Name
   - Quantity
   - Avg buy price
   - Last price
   - Total value
   - Gain since purchase
   - YTD
   - Value (CHF)
   - Gain (CHF)

3. **Totals Row**
   - total value
   - total gain
   - total CHF value
   - total CHF gain

4. **Suggested Next Step**
   - one or two sentences only

Rules:
- no repeated metrics in multiple sections
- no technical implementation detail
- no broker/debug clutter unless blocking

### Lane 5 — Fill / purchase report redesign
Create a compact fill report contract:

1. Management summary line/card:
   - Bought `<qty>` of `<symbol> — <name>`

2. Compact detail block:
   - quantity bought
   - unit price
   - total cost
   - CHF cost incl. commission
   - total now held

3. Optional one-line impact note:
   - e.g. “This increases the position to X shares and raises invested exposure to Y.”

Rules:
- minimal by default
- no noisy execution metadata unless needed for reconciliation

### Lane 6 — Health report redesign
Create a dual-mode health report:

#### Healthy mode
- very short management summary
- minimal details
- maybe 1 compact list of what was checked

#### Issue mode
- management summary first
- issues ordered by severity
- auto-fixes attempted where safe
- clear operator actions only when needed
- suggested solutions when auto-fix is not possible

Rules:
- no jargon-first presentation
- translate technical failures into user-friendly outcomes
- keep raw diagnostics secondary

### Lane 7 — Verification and fixtures
Add or update tests/fixtures for:
- portfolio report rendering
- fill notification rendering
- health report rendering
- mobile-safe HTML snapshot expectations where practical
- field population correctness for cost basis / CHF cost / current holding quantity / totals rows

Potential existing test touchpoints:
- `scripts/test-live-report-email-path.js`
- `scripts/test-health-report-runner.js`
- `scripts/test-reporting-completeness.js`
- dashboard/report rendering tests already in repo

---

## Data requirements to verify before coding

We need to confirm where the following currently come from and whether they are trustworthy:
- average buying price per held instrument
- current quantity held
- latest traded price
- YTD return/value change
- value in CHF
- gain in CHF
- fill commission and commission-inclusive CHF cost
- candidate persistence source

If one or more fields are missing or only partially available, we should:
1. document the gap,
2. provide a fallback display rule,
3. avoid inventing data.

Example fallback rules:
- if YTD unavailable → display `—`
- if commission missing → label cost as excluding commission
- if CHF gain cannot be computed reliably → omit that column rather than show misleading values

---

## Sequencing

### Step 1 — Discovery
Audit current report generators, templates, and data sources.

### Step 2 — Design contracts
Write small explicit output contracts for:
- portfolio report
- fill report
- health report
- focused instrument enrichment

### Step 3 — Implement shared presentation layer
Create reusable email-friendly layout/style helpers.

### Step 4 — Implement focused instrument selection/enrichment
Restrict richer data gathering to held + persisted candidate instruments.

### Step 5 — Redesign portfolio report
Make the portfolio report investor-first and non-repetitive.

### Step 6 — Redesign fill report
Make the purchase notification compact and useful.

### Step 7 — Redesign health report
Keep healthy-state minimal and issue-state actionable.

### Step 8 — Verify
Run focused report rendering/tests and inspect generated artifacts.

---

## Verification gates

Minimum evidence before calling this phase complete:
- report generator tests pass for touched surfaces
- at least one generated portfolio report inspected directly
- at least one generated fill/purchase report inspected directly
- at least one generated health report inspected directly
- confirmation that the new outputs meet the light/mobile/readable design goals
- confirmation that focused enrichment only targets held/candidate instruments by default

---

## Risks

1. **Data completeness risk**
   Some requested fields may not exist consistently in current artifacts.

2. **Email client CSS limitations**
   Fancy layout must remain email-safe; rounded cards and colors are okay, but complex CSS may not survive all clients.

3. **Over-duplication from layered generators**
   Existing code may compute similar summaries in several places; we should centralize rather than patch repeatedly.

4. **Too much content in mobile tables**
   The portfolio table has many requested columns; we may need mobile-friendly stacking or split labels while preserving readability.

---

## Recommendation

Implement this as one reporting-focused phase with discovery first and code second.

The most important design principle is:
**optimize for investor clarity, not system completeness.**

That means:
- fewer sections
- less repetition
- stronger summaries
- focused instrument detail only where it matters
- clear next-step guidance

---

## Definition of done

This phase is done when:
- focused enrichment defaults to held + persisted candidate instruments
- portfolio reports clearly show holdings, value, and gains for a casual investor
- fill reports concisely show what was bought, for how much, and what is now held
- health reports stay minimal when healthy and helpful when broken
- all email reports use a light, readable, mobile-friendly visual system
- verification evidence exists in tests and/or generated sample artifacts
