# Phase 147 — Reporting Consumes Broker Block Truth

## Goal
Ensure dashboard/status/reporting surfaces consume the new broker-derived block code/reason/next-action fields so operator-visible truth prioritizes actionable submit failures instead of only raw lifecycle labels.

## Checklist
- [ ] Inspect reporting/summary surfaces that read trade rows.
- [ ] Prefer broker block next-actions when present on latest actionable rows.
- [ ] Add focused regression coverage for operator-visible prioritization of broker submit failures.
- [ ] Re-run phase 146 tests plus reporting tests.
- [ ] Commit and push once green.

## Verification
- Existing dashboard/summary prioritization tests where relevant.
- New focused reporting test for broker-derived block truth.
- Phase 146 classification tests remain green.

## Non-goals
- No UX redesign.
- No execution policy changes.
- No historical row rewriting beyond existing reconciliation behavior.
