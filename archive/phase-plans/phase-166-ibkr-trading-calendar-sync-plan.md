# Phase 166 — IBKR Trading Calendar Sync Plan

## Objectives
- Integrate exchange-open / trading-calendar data from IBKR for persisted approved instruments so the system knows when the relevant venues are open.
- Persist that market-hours / calendar state in a durable local artifact instead of recomputing it ad hoc only during preflight.
- Keep the persisted calendar state refreshed automatically with a cron-driven sync job.
- Reuse the existing IBKR contract identity and market-hours seams where possible, rather than introducing a second calendar model.

## Current State / Findings
- Approved persisted instruments already carry IBKR identity fields in `portfolio.md` parsing:
  - `ibkrConid`
  - `ibkrSymbol`
  - `ibkrLocalSymbol`
  - `ibkrPrimaryExchange`
- The runtime already evaluates exchange-open state in two places:
  - `src/execution/executionDiagnostics.js`
    - parses IBKR `tradingHours` / `liquidHours`
    - evaluates current state via `parseHoursSegments(...)` and `evaluateHoursState(...)`
  - `src/execution/liveReadinessPreflight.js`
    - consumes those diagnostics for pre-submit readiness
- There is already a fallback venue-reference path via `src/execution/venueHoursReference.js` and `lib/marketHours.js`.
- Cron and reporting infrastructure already exist and are used elsewhere:
  - cron health surfaced in reporting
  - runtime artifacts already written under `runtime/...`
- This means the clean implementation path is not “invent a calendar engine”, but rather:
  1. fetch IBKR contract-hours for approved instruments
  2. normalize/persist them
  3. read the persisted artifact from diagnostics/preflight/reporting
  4. refresh it on a schedule with cron

## Scope Recommendation
Keep phase 166 focused on **read-only calendar intelligence**:
- no live trading behavior changes beyond consuming persisted hours where helpful
- no broad scheduling redesign
- no replacement of existing fallback venue hours for missing / stale IBKR data

## Risks / Dependencies
- IBKR availability is intermittent because native gateway still depends on periodic manual auth; the sync path must degrade cleanly when IBKR is unavailable.
- Approved instruments may have incomplete IBKR contract identity; sync must surface partial coverage instead of failing the whole portfolio silently.
- IBKR trading-hours strings can be messy across exchanges / holidays / partial sessions; normalization should preserve raw source fields as evidence.
- Cron delivery on this host is already known to be finicky; the sync job should prefer artifact/state updates first and optional delivery second.
- We should avoid making the execution path depend on a fresh network lookup at decision time.

## Proposed Design

### 1) Add a persisted market-calendar artifact
Create a portfolio-scoped runtime artifact, for example:
- `runtime/market-calendar/<portfolio>.json`

Suggested payload shape:
```json
{
  "portfolio": "etf",
  "generatedAt": "ISO-8601",
  "source": "ibkr_contract_hours",
  "brokerReady": true,
  "coverage": {
    "totalApprovedInstruments": 0,
    "withIbkrIdentity": 0,
    "synced": 0,
    "missingIdentity": 0,
    "syncFailed": 0
  },
  "instruments": [
    {
      "tickerOrIsin": "SXR8",
      "name": "iShares Core S&P 500 UCITS ETF",
      "ibkrConid": "...",
      "ibkrSymbol": "...",
      "ibkrPrimaryExchange": "...",
      "exchange": "...",
      "currency": "CHF",
      "tradingHoursRaw": "YYYYMMDD:HHMM-HHMM;...",
      "liquidHoursRaw": "YYYYMMDD:HHMM-HHMM;...",
      "tradingHoursSegments": [ ... ],
      "liquidHoursSegments": [ ... ],
      "tradingStateNow": { ... },
      "liquidStateNow": { ... },
      "sourceKind": "ibkr_contract",
      "lastSyncedAt": "ISO-8601",
      "syncStatus": "ok|missing_identity|ibkr_unavailable|error",
      "error": null
    }
  ]
}
```

Design note:
- preserve both raw IBKR strings and normalized segments
- include a point-in-time evaluation (`tradingStateNow`, `liquidStateNow`) for convenience
- do **not** throw away provenance

### 2) Add a dedicated sync module
Add something like:
- `src/execution/marketCalendarStore.js`
- `src/execution/marketCalendarSync.js`

Responsibilities:
- load approved instruments from `portfolio.md`
- resolve/fetch IBKR contract details for each approved instrument with usable identity
- extract `tradingHours` / `liquidHours`
- reuse `parseHoursSegments(...)` and `evaluateHoursState(...)` from execution diagnostics or move those helpers into a shared module if needed
- write the normalized artifact atomically
- expose readers like:
  - `readMarketCalendarArtifact({ portfolioDir })`
  - `getInstrumentCalendarState({ portfolioDir, tickerOrIsin, now })`
  - `syncMarketCalendar({ portfolioDir, now, allowStaleBroker=false })`

### 3) Add a CLI/script entry point
Add a script such as:
- `scripts/sync-market-calendar.js --portfolio=etf`

Behavior:
- read approved instruments
- sync IBKR market-calendar data
- write runtime artifact
- return a structured summary JSON to stdout
- non-zero exit only for genuine script/invariant failures; IBKR-unavailable should be represented clearly and safely

### 4) Consume persisted calendar state in diagnostics / readiness
Phase 166 should wire readers into existing execution readiness surfaces conservatively:
- prefer persisted IBKR calendar state when present and fresh
- fall back to direct contract diagnostics / venue reference when unavailable
- avoid forcing network calls from preflight if persisted data already exists

Likely touch points:
- `src/execution/executionDiagnostics.js`
- `src/execution/liveReadinessPreflight.js`
- possibly dashboard/health/reporting status summaries later, but that can remain secondary to the core sync/store path

### 5) Add cron-based refresh
Create a cron job to refresh calendar state periodically, likely on the current session or isolated agent-turn depending what fits the existing reporting/scripting style.

Recommended characteristics:
- frequency: every 6–12 hours, plus maybe a pre-market morning anchor for Europe/Zurich-relevant venues
- best-effort delivery
- primary success criterion is artifact freshness, not chat output
- if IBKR is unavailable, record that in the artifact instead of spamming failures

Example conceptual job:
- name: `sync-etf-market-calendar`
- payload: run the sync script for `portfolio/etf`
- output: refresh `runtime/market-calendar/etf.json`

## Implementation Phases

### Phase 166a — Core model and persistence
- Extract/share hours parsing helpers if needed
- Implement market-calendar artifact read/write helpers
- Add tests for:
  - IBKR hours parsing reuse
  - artifact shape
  - missing-identity handling
  - stale/unavailable broker cases

### Phase 166b — IBKR sync path
- Implement approved-instrument → contract-hours sync flow
- Add CLI script for manual sync
- Add tests with mocked IBKR contract responses

### Phase 166c — Execution/readiness integration
- Make readiness/diagnostics prefer persisted calendar state where appropriate
- Keep venue fallback intact
- Add regression tests proving no hard dependency on live IBKR for preflight

### Phase 166d — Cron automation and observability
- Register/update cron job
- Surface calendar freshness / coverage in reporting or health summaries if useful
- Add tests for cron/job wiring where practical

## Test Plan
- Unit tests
  - hours parsing / evaluation helpers
  - artifact serialization / deserialization
  - per-instrument normalization
- Integration tests
  - sync approved instruments into persisted artifact from mocked contract detail payloads
  - readiness path reads persisted artifact and falls back correctly
- Regression tests
  - incomplete IBKR identity does not crash sync
  - IBKR unavailable does not destroy prior useful artifact state unless explicitly intended
  - cron-triggered sync does not require delivery success to count as operationally useful

## Acceptance Criteria
- The repo has a read-only market-calendar sync path that fetches IBKR trading-hours for approved instruments and persists them locally.
- Persisted calendar artifacts include both raw broker data and normalized/evaluated state.
- Existing readiness logic can use persisted IBKR market-hours data without requiring a live lookup on every run.
- A cron job keeps the artifact refreshed automatically.
- Tests cover parsing, persistence, degraded broker states, and core integration paths.
- The design degrades safely when IBKR is unavailable or instrument identity is incomplete.

## Recommendation
This is worth doing. The cleanest first implementation is:
1. persist the IBKR contract-hours artifact
2. add a manual sync script + tests
3. only then wire readiness/reporting to consume it
4. add cron last

That order keeps the risk low and gives us evidence at each step.
