# Phase 179C Plan — Venue Alerting and Exchange-Hours Reference Integration

## Objectives
- Integrate the existing exchange-hours research artifact into the execution/readiness warning surface.
- Prefer IBKR contract hours when present, but provide a venue-reference fallback when contract hours are absent.
- Make operator warnings more explicit for closed venues, pre-open windows, after-close states, and unknown-hours situations.
- Keep this phase advisory-first: improve explanation and diagnostics before adding stronger automatic blocks.

## Current state analysis
- Phase 179B now parses/evaluates IBKR trading and liquid hours and writes a pre-submit diagnostic artifact.
- The local reference file `runtime/exchange-hours-reference-2026-05-21.md` exists but is not yet structured or read by code.
- Preflight has row-level hours state when contract details are supplied, but there is no fallback when contract-hours data is missing.
- Warnings are still mostly portfolio-level (`market_closed`) rather than instrument/venue-specific explanatory diagnostics.

## Risks / dependencies
- The current local reference is markdown prose, not a normalized machine contract.
- Some venues may have partial or weaker source quality; fallback data must be clearly labeled as reference-derived.
- We should avoid implying more certainty than we actually have for non-IBKR-source hours.
- As before, commits must remain narrowly scoped due to unrelated dirty runtime/live-ops artifacts in the repo.

## Actionable checklist
- [ ] Create a normalized local venue-hours reference module/file from the researched exchange-hours artifact.
- [ ] Add fallback venue-hours evaluation when IBKR contract hours are absent.
- [ ] Extend preflight warnings to include row-level/operator-readable venue timing explanations.
- [ ] Add targeted tests for:
  - reference lookup
  - fallback evaluation
  - warning-shape/content for closed / before-open / unknown states
- [ ] Run targeted tests until green.
- [ ] Run broader execution verification and full repo verification before phase close.

## Acceptance criteria
- Preflight can explain venue timing state using IBKR hours first and local reference second.
- Diagnostic output clearly indicates whether timing came from IBKR contract data or local reference fallback.
- Operator warnings become instrument/venue-specific where possible.
- Targeted tests, broader execution verification, and repo verification all pass.
