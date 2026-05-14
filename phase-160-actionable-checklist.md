# Phase 160 — Actionable checklist

- [ ] Inspect current native contract normalization, ETF search normalization, and conid resolution selection logic.
- [ ] Introduce a shared native contract intelligence normalizer/helper module.
- [ ] Preserve `localSymbol`, `primaryExch`, `exchange`, `currency`, `secType`, `isin`, and a reusable venue identity field.
- [ ] Reuse the shared normalizer in native client contract-details normalization.
- [ ] Reuse the shared normalizer in ETF instrument search normalization.
- [ ] Harden best-match selection in `resolve-interactive-brokers-conids.js` with explicit ranking.
- [ ] Add focused regression tests for normalization + selection.
- [ ] Run focused tests, fix failures, and rerun until green.
- [ ] Commit Phase 160 implementation.
- [ ] Push Phase 160.
