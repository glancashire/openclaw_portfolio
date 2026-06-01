# Phase Cleanup-1C — Dashboard truth for degraded broker posture

**Date:** 2026-06-01 21:15 UTC
**Tranche:** 1

## Objectives

Distinguish three broker-readiness outcomes for dashboard wording, instead of conflating two of them:

1. **Healthy live** — current "live/realtime" message.
2. **Reachable but quote posture undetermined** — broker socket/auth/read all healthy, posture detection didn't yield a usable classification within budget. Today this is rendered as "readiness timed out" which is misleading because the broker is up.
3. **Truly timed out / unreachable** — the existing timeout/auth-failure message.

## Risks / dependencies

- Touches `getInteractiveBrokersReadinessBounded()` — used by `dashboardGenerator.regenerateDashboard()` and downstream operator surfaces.
- Behaviour for genuinely-unreachable broker must not regress.
- Existing readiness shape is consumed by `recommendedActions`, `bestNextStep`, `pendingOperatorActions`, and several legacy test stubs. Schema must stay backward-compatible.

## Approach

Split the single 10-second `Promise.race` wrapper into two stages:

- **Auth stage** — bounded ~5 seconds. If it times out or fails, emit the existing "readiness timed out / not reachable" fallback.
- **Posture stage** — runs only if auth succeeded. Bounded ~7 seconds. If it times out, emit a new "reachable, posture undetermined" fallback with `reason: 'posture_detection_timeout'` + a non-misleading message.

The "reachable + degraded" path keeps `fallbackRequired: true` so live submission stays blocked, but the dashboard wording reads accurately.

## Actionable checklist

- [ ] Refactor `getInteractiveBrokersReadinessBounded()` in `src/brokers/interactive-brokers/readiness.js` into a two-stage bounded path.
- [ ] Add a new internal helper `getInteractiveBrokersReadinessStaged()` callable for tests.
- [ ] Add a `posture_detection_timeout` operator state alongside the existing `ibkr_readiness_timeout`.
- [ ] Add `scripts/test-readiness-bounded-stages.js` covering:
  - auth timeout → existing `readinessTimeoutFallback` shape (regression).
  - posture timeout → new `posture_detection_timeout` reason, message says "reachable" not "timed out".
  - happy path → existing live-ready shape unchanged.
- [ ] Update `scripts/test-open-phases-card.js` if it depends on dashboard wording (it doesn't, but verify).
- [ ] Verify all existing safe-lane tests still pass (effective-config, execution-authority, trading-guards, repo-cleanliness, gitignore-policy, regenerate-dashboard-cli, multi-portfolio-overview).

## Acceptance criteria

- New posture-timeout path returns `fallbackRequired: true`, `reason: 'posture_detection_timeout'`, `marketDataMode: 'unknown'`, and message stating broker is reachable but posture is degraded/undetermined.
- Existing auth-timeout path unchanged in shape/wording.
- Live-ready path unchanged.
- All existing tests pass.
- New `test-readiness-bounded-stages.js` passes.
