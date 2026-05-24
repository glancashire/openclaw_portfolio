# Phase 166b — IBKR Market Calendar Sync Path Plan

## Objectives
- Implement a read-only approved-instrument → IBKR contract-hours sync flow.
- Reuse existing approved-instrument parsing and IBKR contract-intelligence/client seams.
- Persist normalized market-calendar artifacts using the phase 166a store.
- Add a manual CLI/script entry point for one-shot sync and operator verification.

## Current State / Findings
- Approved instruments already expose IBKR identity hints via `src/analysis/approvedInstruments.js`.
- Contract normalization already exists in `src/brokers/interactive-brokers/contractIntelligence.js`.
- The broker abstraction already chooses native vs skill mode in `src/brokers/interactive-brokers/client.js`.
- Phase 166a added shared market-hours helpers and the portfolio-scoped artifact store.
- There is not yet a dedicated sync module that fetches contract-hours for all approved instruments and writes the artifact.

## Risks / Dependencies
- IBKR may be temporarily unavailable; sync must return a safe structured result rather than crash or wipe useful state.
- Some approved instruments may lack full IBKR identity. Those rows should be recorded as partial/missing, not fatal.
- The generic broker client does not yet expose a dedicated contract-details-by-identity method, so 166b may need a narrow client addition.
- Tests must avoid real broker dependency and instead mock the client seam.

## Actionable Checklist
- [ ] Add a narrow IBKR client method to fetch contract details by approved-instrument identity.
- [ ] Implement `src/execution/marketCalendarSync.js` to:
  - load approved instruments
  - fetch contract detail hours where possible
  - normalize per-instrument rows
  - preserve degraded statuses (`missing_identity`, `ibkr_unavailable`, `error`)
  - build and write the artifact
- [ ] Add a manual script entry point:
  - `scripts/sync-market-calendar.js --portfolio=etf`
- [ ] Add comprehensive tests covering:
  - unit normalization of sync result rows
  - integration-style sync using mocked broker responses
  - regression handling for missing identity and broker unavailability
  - script-level success output and safe degraded output
- [ ] Run focused tests until green.
- [ ] Run full `npm test`.
- [ ] Clean unrelated churn, commit, and push phase 166b.

## Acceptance Criteria
- A dedicated sync module can fetch contract-hours for approved instruments and persist a normalized artifact.
- The sync path records partial coverage and broker degradation safely.
- A manual sync script exists and emits structured output.
- Full test suite passes without regressions.
