# Phase 30 — Multi-portfolio overview board plan

## Goal
Turn the new structured summary artifacts into a top-level multi-portfolio operator board that is readable in Markdown/HTML and exposes one clear cross-portfolio action surface.

## Scope checklist
- [ ] Build a generated `runtime/overview/portfolio-overview.md` board using `runtime/overview/portfolio-index.json` and `runtime/overview/pending-actions.json`
- [ ] Add a concise top summary with portfolio count, total value, blocked/warning counts, and pending-action totals
- [ ] Add a per-portfolio table with total value, last sync, health, drift posture, blockers, pending approvals, pending actions, and recommended next step
- [ ] Add a cross-portfolio recommended-actions section ordered by urgency
- [ ] Add optional HTML rendering for the overview board to match existing report/dashboard presentation posture
- [ ] Handle placeholder/template/demo portfolios gracefully without breaking the overview
- [ ] Add focused tests for aggregation, sorting, and missing-data edge cases
- [ ] Update roadmap/progress docs to reflect Phase 30 completion when done

## Implementation notes
- Reuse Phase 29 artifacts rather than re-reading Markdown files where possible.
- Keep the board deterministic and skimmable.
- Do not overfit to only the ETF portfolio; preserve sane behavior for multiple portfolios with mixed readiness.
- If a portfolio is obviously template/demo-like, surface it clearly rather than silently hiding it unless the repo already has a canonical active-portfolio filter.

## Verification
- [ ] `node scripts/test-multi-portfolio-overview.js`
- [ ] `node scripts/generate-portfolio-summary.js portfolio/etf`
- [ ] `node scripts/generate-multi-portfolio-overview.js`
- [ ] inspect generated Markdown/HTML outputs directly

## Exit criteria
Phase 30 is complete when the repo emits a useful multi-portfolio overview board on top of Phase 29 artifacts, with tests covering aggregation and edge cases.
