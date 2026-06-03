# Phase plans archived 2026-06-03

This folder collects phase plans for work that completed between 2026-06-02 and 2026-06-03.
Live work is tracked in `CURRENT_PLAN.md` at the repo root.

## Contents

| Plan | Status | Notes |
|---|---|---|
| `phase-2-artifact-hygiene.md` | ✅ DONE 2026-06-03 | Wrappers/shims doc + execute-trades shim contract; idempotence lane deferred |
| `phase-3-usage-counters.md` | ✅ DONE 2026-06-03 | Operator-facing usage KPIs; Operations card in digest |
| `phase-4-maintainer-contract.md` | ✅ DONE 2026-06-03 | Host contract matrix + cross-links + regression test |
| `dashboard-email-themeforest-redesign-plan.md` | ✅ DONE 2026-06-03 | Light/dark adaptive design (later forced light-only after auto-invert issues) |
| `email-dashboard-light-dark-spec.md` | ✅ DONE 2026-06-03 | Token spec; superseded by light-only forcing |

## Why archived together

All five plans concluded within the same 24h window. Their outcomes are reflected in:

- `src/reporting/emailHtml.js` (forced light theme, class hooks, AA-contrast pills)
- `src/reporting/reportEmail.js` (Net deposited hero + Total return vs deposits strip)
- `src/reporting/usageCounters.js`, `src/reporting/usageKpiArtifact.js`, `src/reporting/dashboardDigest.js` (Operations KPI card)
- `docs/operations/openclaw-host-contract.md` (single-page host matrix)
- `docs/operations/wrappers-and-shims.md` (blessed compatibility surfaces)
- 7 new regression tests
