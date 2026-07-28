# Phase 220 — Dashboard and investor email gain windows

## Objective
Add gain/loss visibility for both the whole portfolio and each held instrument across the dashboard and portfolio investor email for these windows:
- since purchase
- last 7 days
- last 30 days
- YTD
- last 365 days

The feature should be truthful about data coverage, avoid fabricating instrument-level history when only portfolio-level history exists, and preserve existing reporting/delivery flows.

## Current state / repo truth
- `summaryArtifacts.js` already computes and renders portfolio-level **since purchase** gain using `costBasis.js`.
- `investorReportingData.js` currently stamps **YTD** onto every instrument row, but it is actually portfolio-level, not per-instrument.
- `historyDigest.js` reads portfolio-level `history.md` snapshots and can anchor rolling windows for the whole portfolio.
- `reportEmail.js` renders investor holdings and recommendation surfaces from `summary.json` / structured summary data.
- Dashboard and email already have tests around structured summary artifacts and report rendering, so this feature should extend those contracts rather than create a parallel path.

## Product/data design decisions

### 1) Define two separate performance scopes
- **Portfolio performance windows**: computed from portfolio history snapshots (`history.md`) and/or total cost basis where appropriate.
- **Instrument performance windows**:
  - **Since purchase**: supported from current cost basis + current value (already partly available).
  - **7d / 30d / YTD / 365d**: only show when we have a defensible historical anchor per instrument.

### 2) Be explicit about availability
Do not imply that all windows are equally supported.
Introduce per-metric availability/status fields such as:
- `available`
- `missing_history`
- `portfolio_level_only`
- `partial`

### 3) Fix the current YTD semantics
The existing `investorReportingData.js` behavior that copies portfolio YTD onto each holding row should be replaced.
Per-instrument YTD must either:
- come from real per-instrument historical anchors, or
- render as unavailable / pending data support.

### 4) Prefer additive structured-summary changes
Extend `summary.json` with a stable shape such as:
- `performance.portfolio.windows`
- `performance.instruments[]` or per-row `performanceWindows`

That keeps dashboard/email renderers thin and lets future HTML/report surfaces reuse the same model.

## Proposed implementation plan

### Phase A — design the structured data contract
- [ ] Add a new reporting contract section to the structured summary model for gain windows.
- [ ] Decide the exact JSON shape for:
  - [ ] portfolio window gain amount + percent
  - [ ] instrument window gain amount + percent
  - [ ] per-window availability / caveat metadata
  - [ ] anchor dates used for each calculation
- [ ] Keep `since purchase` under the same window contract so all surfaces render from one model.

Suggested shape:
```json
{
  "performance": {
    "portfolio": {
      "windows": {
        "sincePurchase": { "gainChf": 0, "gainPct": 0, "availability": "available", "anchorDate": null },
        "last7d": { "gainChf": 0, "gainPct": 0, "availability": "available", "anchorDate": "2026-06-23" },
        "last30d": { "gainChf": 0, "gainPct": 0, "availability": "available", "anchorDate": "2026-05-31" },
        "ytd": { "gainChf": 0, "gainPct": 0, "availability": "available", "anchorDate": "2026-01-01" },
        "last365d": { "gainChf": 0, "gainPct": 0, "availability": "missing_history", "anchorDate": null }
      }
    }
  }
}
```

### Phase B — build portfolio-level window calculations
- [ ] Add a helper module or extend `historyDigest.js` with utilities to:
  - [ ] locate the nearest valid snapshot on/before a target anchor date
  - [ ] compute gain CHF and gain % between anchor total value and current total value
  - [ ] support anchors for 7d, 30d, YTD, and 365d
- [ ] Define YTD anchor carefully:
  - [ ] use the latest available snapshot on/before Jan 1 of the current year, or earliest available snapshot in-year with an explicit degraded availability note
- [ ] Define rolling-window fallback rules when the exact anchor day is missing (weekends/holidays are expected).
- [ ] Reuse the existing cost-basis path for portfolio `since purchase`, but normalize its output into the new window contract.
- [ ] Add tests for sparse history, duplicate rows, weekend anchors, and insufficient history.

### Phase C — design instrument-level window support
- [ ] Audit existing sources for per-instrument historical anchors:
  - [ ] `holdings.md`
  - [ ] `history.md`
  - [ ] dated report JSON artifacts
  - [ ] any runtime/summary artifacts that preserve prior per-instrument market value or price
- [ ] Decide the initial support level:
  - [ ] **Baseline safe version**: instrument `since purchase` only; 7d/30d/YTD/365d marked unavailable until per-instrument history exists.
  - [ ] **Enhanced version**: if dated summary/report JSON artifacts reliably include prior instrument values, compute rolling windows from those artifacts.
- [ ] Document the chosen truth model in the plan comments/code so future sessions do not accidentally regress into fake per-row YTD.

### Phase D — if historical instrument data is available, implement an instrument history digest
- [ ] Create a helper that reads dated report/summary artifacts and extracts per-instrument value/price history by stable identity (ISIN/conid/symbol).
- [ ] Deduplicate by date and prefer the latest artifact per day.
- [ ] Normalize identity matching using the same approved-instrument mapping rules already used in reporting.
- [ ] Compute per-instrument windows:
  - [ ] gain CHF using value delta when quantity is stable and history is trustworthy
  - [ ] gain % from anchor value where valid
- [ ] If quantity changes make the result ambiguous, mark the metric `partial` or `unsupported` instead of overstating precision.

### Phase E — extend structured summary generation
- [ ] Update `summaryArtifacts.js` to produce the new `performance` payload.
- [ ] Update `buildInvestorHoldingsSnapshot(...)` so each row carries a `performanceWindows` object instead of standalone `ytdChf/ytdPct` fields.
- [ ] Preserve backward compatibility only where needed for current renderers/tests; otherwise migrate renderers to the new contract promptly.
- [ ] Ensure generated `summary.json` and dated report sibling JSON both include the same gain-window payload.

### Phase F — render in dashboard surfaces
- [ ] Add a portfolio performance card/table to the dashboard with rows for:
  - [ ] since purchase
  - [ ] last 7 days
  - [ ] last 30 days
  - [ ] YTD
  - [ ] last 365 days
- [ ] Add per-instrument performance columns or a nested sub-table in the dashboard.
- [ ] Keep the layout readable in Markdown and HTML; avoid turning the dashboard into an unreadable wide table.
- [ ] If necessary, show only the most decision-relevant windows in the compact card and place the full matrix in the detailed section.

### Phase G — render in investor email
- [ ] Add a concise portfolio-level performance summary block near the headline metrics.
- [ ] Extend the holdings table to include the requested time-window gains for each instrument, but only if readability holds.
- [ ] If five windows make the email table too wide, prefer one of these layouts:
  - [ ] a compact multi-row per instrument block, or
  - [ ] a smaller holdings table plus a separate "performance windows" detail section.
- [ ] Keep mobile/email client rendering safe: no JS, no horizontal-overflow-dependent design.
- [ ] Make unavailable metrics obvious but non-alarming (`—`, `unavailable`, or muted helper text).

### Phase H — tests and verification
- [ ] Add focused tests for:
  - [ ] portfolio window calculations from history
  - [ ] year-boundary/YTD behavior
  - [ ] insufficient-history fallbacks
  - [ ] instrument-level availability semantics
  - [ ] structured summary JSON contract
  - [ ] dashboard rendering of the new section
  - [ ] portfolio email rendering of the new section
- [ ] Re-run existing suites most likely to regress:
  - [ ] `scripts/test-structured-summary-artifacts.js`
  - [ ] `scripts/test-investor-reporting-data.js`
  - [ ] `scripts/test-report-email-rendering.js`
  - [ ] `scripts/test-dashboard-*.js` subset touching summary rendering
- [ ] Regenerate a real dashboard/email preview and inspect the artifact manually.

## Recommended delivery order
1. Portfolio-level window contract + calculations
2. Replace fake per-row YTD semantics with explicit availability
3. Dashboard portfolio-level rendering
4. Email portfolio-level rendering
5. Instrument-level rolling windows only if the repo already contains trustworthy per-instrument historical anchors
6. Otherwise, ship truthful placeholders for instrument rolling windows and open a follow-up phase for richer instrument history capture

## Risks / caveats
- The biggest risk is **showing mathematically wrong per-instrument rolling returns** when holdings changed over time or when only portfolio-level history exists.
- Email width is a real constraint; the request is straightforward conceptually but can become unreadable if implemented as a giant 11-column table.
- Existing archived report JSON artifacts may provide enough history, but identity matching and quantity changes need careful handling.
- Any fallback that silently substitutes portfolio performance for single-instrument performance would be a regression in truthfulness.

## Acceptance criteria
- Dashboard shows portfolio gains for since purchase, last 7 days, last 30 days, YTD, and last 365 days.
- Portfolio email shows the same portfolio-level gain windows.
- Each instrument row shows since-purchase gain when cost basis is available.
- Each instrument row shows 7d/30d/YTD/365d only when backed by trustworthy instrument history; otherwise it renders as explicitly unavailable.
- Structured summary / dated report JSON expose a stable gain-window contract.
- Focused reporting/dashboard/email tests pass.
- At least one regenerated preview artifact is inspected manually before completion.

## Open question to resolve during implementation
- Can we derive trustworthy per-instrument 7d/30d/YTD/365d windows from existing dated summary/report artifacts without first adding a new historical holdings snapshot lane?
  - If yes: implement it in this phase.
  - If no: ship truthful portfolio-level windows + since-purchase per instrument now, and create a follow-up phase for persistent instrument history.
