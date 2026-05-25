# Phase 29 — Structured UI summary artifacts plan

## Goal
Generate stable machine-readable portfolio summary artifacts that mirror the command-center dashboard state and can power future UI, digest, and multi-portfolio surfaces.

## Scope checklist
- [ ] Add a per-portfolio `summary.json` artifact under `portfolio/<name>/summary.json`
- [ ] Add a repo-level `runtime/overview/portfolio-index.json`
- [ ] Add a repo-level `runtime/overview/pending-actions.json`
- [ ] Define stable JSON shapes for each artifact in code and tests
- [ ] Ensure artifact generation reuses dashboard/report/state helpers instead of re-deriving logic inconsistently
- [ ] Include health status, broker/delivery posture, freshness, blocker counts, pending approvals, recommended next step, and recent material event snippets
- [ ] Keep artifacts aligned with Markdown/dashboard state for the ETF portfolio
- [ ] Add focused regression tests for schema presence and content alignment
- [ ] Update roadmap/progress docs to reflect Phase 29 completion when done

## Implementation notes
- Prefer a reusable summary-builder module in `src/reporting/` or a nearby shared location.
- Keep field names explicit and stable; avoid UI-specific fluff.
- Design the portfolio index and pending-actions queue so Phase 30 and 31 can build directly on them.

## Verification
- [ ] `node scripts/test-structured-summary-artifacts.js`
- [ ] `node scripts/generate-portfolio-summary.js portfolio/etf`
- [ ] inspect generated JSON files directly
- [ ] rerun dashboard generation to confirm alignment assumptions still hold

## Exit criteria
Phase 29 is complete when the JSON artifacts generate deterministically, reflect current Markdown/dashboard state, and pass focused schema/content regression coverage.
