# Phase H1-baseline — Capture allocation baseline for 2-week review

**Date:** 2026-06-03
**Source plan:** `CURRENT_PLAN.md` Phase H — Allocation-target decision

## Objective

Freeze a single, machine-readable baseline snapshot of the post-deconcentration portfolio at T+0 (today, 2026-06-03 16:42 UTC) so that the decision check-in around 2026-06-17 has a concrete comparison point. Without this anchor, "1-2 weeks of behaviour data" is a vibe; with it, the comparison is deterministic.

## What gets captured

For each of the 4 new deconcentration ETFs (XDEW, MWEQ, IS3H, DXS0) AND the legacy mega-cap slots they overlap with (SXR8, EMUAA), a JSON snapshot containing:

- ISIN, IBKR symbol/conid, name
- target % (from `portfolio.md`)
- current allocation % (from `holdings.md` / dashboard)
- drift %
- units held, value CHF, last traded price + currency
- baseline timestamp

The JSON file lives at `runtime/research/h1-baseline-2026-06-03.json` (kept under `runtime/` because it is a generated/reference artifact rather than a source-of-truth contract). A short markdown sibling at `docs/research/h1-allocation-baseline-2026-06-03.md` summarizes it for human consumption and locks in the review-date trigger.

## Risks / Dependencies

- Read-only against existing artefacts (`portfolio/etf/portfolio.md`, `portfolio/etf/holdings.md`, `portfolio/etf/dashboard.md`).
- Must use the existing parser surface; do not introduce new parsers or new schema.

## Checklist

- [ ] Write `scripts/capture-allocation-baseline.js` that reads `portfolio/etf/portfolio.md` (Approved Instruments) + `portfolio/etf/holdings.md` (Current Holdings) and emits the JSON.
- [ ] Run it once to create `runtime/research/h1-baseline-2026-06-03.json`.
- [ ] Write `docs/research/h1-allocation-baseline-2026-06-03.md` with:
  - the deconcentration thesis (one paragraph)
  - a table of the 6 instruments at baseline
  - the 2026-06-17 check-in date
  - the decision matrix: A (additive) vs B (replace SXR8/EMUAA) vs C (partial replace)
- [ ] Add a regression test that asserts the baseline JSON exists, contains the 6 expected ISINs, and has timestamp + target/current/drift fields per row.
- [ ] Add the new script to `docs/operations/test-manifest.json` if needed (only if a separate test belongs in safe lane; the regression test does).

## Acceptance criteria

- Baseline JSON written to `runtime/research/h1-baseline-2026-06-03.json` with 6 instrument rows + metadata.
- Markdown summary at `docs/research/h1-allocation-baseline-2026-06-03.md`.
- Regression test passes.
- Safe lane: 243 → 244 (G4 adds one, F6 adds one, H1 adds one — total 245 if the same plan); each phase's commit grows the count.
- No live execution touched, no portfolio.md changes.
