# Phase 160 — Actionable checklist

- [x] Inspect current native contract normalization, ETF search normalization, and conid resolution selection logic.
- [x] Introduce a shared native contract intelligence normalizer/helper module.
- [x] Preserve `localSymbol`, `primaryExch`, `exchange`, `currency`, `secType`, `isin`, and a reusable venue identity field.
- [x] Reuse the shared normalizer in native client contract-details normalization.
- [x] Reuse the shared normalizer in ETF instrument search normalization.
- [x] Harden best-match selection in `resolve-interactive-brokers-conids.js` with explicit ranking.
- [x] Add focused regression tests for normalization + selection.
- [x] Run focused tests, fix failures, and rerun until green.
- [x] Commit Phase 160 implementation.
- [x] Push Phase 160.
