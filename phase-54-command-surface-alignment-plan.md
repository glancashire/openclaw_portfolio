# Phase 54 — Command Surface Alignment

## Goal
Align the documented and actual execution entrypoints so operators and future agents have one clear command surface.

## Why this phase
Phase 53 removed one duplicate execution path, but the repo still has drift risk across docs, scripts, and command wrappers. This phase makes the active execution path consistent and easier to use.

## Checklist
- [ ] Inspect `scripts/trade.js` against the active portfolio-backed execution flow
- [ ] Remove or redirect any remaining stale command references
- [ ] Ensure market-open execution and `trade.js submit` describe the same lifecycle
- [ ] Consolidate operator-facing command guidance in docs
- [ ] Add or update tests covering the aligned command surface
- [ ] Run targeted tests
- [ ] Fix failures until green
- [ ] Commit and push

## Target files
- `scripts/trade.js`
- `scripts/submit-orders-at-open.js`
- `docs/trading-workflow.md`
- `docs/operator-runbooks.md`
- related tests under `scripts/` and `tests/`

## Acceptance criteria
- One clear active execution path is documented and enforced.
- Stale command surfaces fail clearly instead of drifting silently.
- Targeted tests pass.
