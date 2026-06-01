# Phase Cleanup-1E — Dashboard delta truth under unknown posture

**Date:** 2026-06-01 22:25 UTC
**Tranche:** 2

## Objectives

When broker quote posture is `unknown` / degraded, the dashboard's "Daily move" and "Since last report" fields currently silently render `+0.00` and `+0.00%`, suggesting a flat market. Replace this with `unknown` so the operator (and `show-dashboard.js`) can distinguish "no movement" from "we don't know".

## Risks / dependencies

- Downstream parsers (notably `scripts/show-dashboard.js`, weekly/monthly reports) read `Daily move CHF` etc. via regex; they tolerate `unknown` strings since the `num()` coercer already returns `null` for non-numeric values.
- Tests that assert "0" outputs for these fields would break — none found in the safe-lane sweep, but verify.
- `show-dashboard.js` `signed()` already prints `'-'` when value is non-numeric, so degraded posture will render as `-` (not zero).

## Approach

In `dashboardGenerator.js#generateDashboard()`:

- Determine `quotePostureUnknown = brokerReadiness?.fallbackRequired === true` AND (`marketDataMode` ∈ {`unknown`, `unpriced`} OR `reason === 'posture_detection_timeout'`).
- When `quotePostureUnknown` is true and `latestSnapshot?.dailyChange` is missing / zero, emit `unknown` for `Daily move CHF`, `Daily move %`, `Since last report CHF`, `Since last report %`.
- Otherwise current behaviour (use `latestSnapshot.dailyChange` or `0`).

## Actionable checklist

- [ ] Add `quotePostureUnknown(readiness)` helper in `dashboardGenerator.js`.
- [ ] Use the helper to derive a `dailyDeltaIsKnown` flag for the four "daily/since" fields.
- [ ] When unknown, emit literal `unknown` (string) for both CHF and % fields.
- [ ] Update `scripts/show-dashboard.js` to render `—` (em dash) for non-numeric daily/weekly fields with a small caveat row.
- [ ] Add `scripts/test-dashboard-delta-truth.js` covering:
  - degraded posture → `unknown` strings in dashboard.
  - `posture_detection_timeout` → `unknown` strings.
  - live posture with positive snapshot → numeric value (regression).
  - live posture with no snapshot → `0` (regression for backward-compat).
- [ ] Run safe-lane regression sweep.

## Acceptance criteria

- Generated dashboard under degraded posture contains `Daily move CHF: unknown`, etc.
- Live posture path unchanged.
- `show-dashboard.js` renders `Today  — CHF (—)` instead of `+0.00 CHF (+0.00%)` when posture is unknown.
- New regression test passes.
- All safe-lane tests stay green.
