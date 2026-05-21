# Phase 179B Plan — IBKR Hours Parsing and Venue-Aware Preflight Diagnostics

## Objectives
- Turn IBKR `tradingHours` / `liquidHours` strings into structured, code-usable diagnostics.
- Extend preflight so executable rows report venue-aware state, including whether they appear inside or outside liquid/trading hours.
- Persist a pre-submit diagnostics artifact so operator review can happen before any future live retry.
- Keep the logic diagnostic-first: warnings and truth surfaces now, stricter blocking only where already justified.

## Current state analysis
- Phase 179A introduced shared execution diagnostics and removed the worst hardcoded venue assumptions.
- `executionDiagnostics.parseHoursSegments()` currently only tokenizes the raw strings; it does not evaluate whether a given timestamp is inside those windows.
- `liveReadinessPreflight` now carries execution diagnostics in `marketWindow`, but it still does not produce row-level venue-hours interpretations.
- We already have a local markdown exchange-hours reference, but IBKR contract hours should be treated as the first source of truth when available.
- A clean Phase 179A implementation commit has already been pushed (`b108b35`).

## Risks / dependencies
- IBKR hours strings can include multiple segments, `CLOSED`, and venue-local times; parsing errors could create misleading guidance.
- We should avoid introducing hard blocks based on incomplete or missing contract-hours data.
- This phase may touch reporting/preflight shapes, so regression coverage matters.
- The repo still contains unrelated dirty runtime/live-ops artifacts; commits must remain narrowly scoped.

## Actionable checklist
- [ ] Extend execution diagnostics with hours-evaluation helpers:
  - parse date/time segments reliably
  - evaluate whether a timestamp is within trading hours / liquid hours
  - surface nearest active segment or closed reason where possible
- [ ] Add row-level venue-hours interpretation to preflight diagnostics.
- [ ] Persist structured pre-submit diagnostic artifacts under `runtime/` for executable rows.
- [ ] Add targeted tests for:
  - hours segment parsing
  - within/outside liquid hours evaluation
  - closed-day handling
  - preflight diagnostics artifact creation / shape
- [ ] Run targeted tests continuously until green.
- [ ] Run broader execution verification and full repo suite before closing the phase.

## Acceptance criteria
- Preflight output includes row-level hours-aware diagnostics for executable rows when contract-hours data is available.
- A runtime diagnostic artifact is written for the current executable pre-submit surface.
- Missing hours data degrades gracefully to warnings/unknown, not misleading hard failures.
- Targeted tests, broader execution verification, and full repo suite pass.
