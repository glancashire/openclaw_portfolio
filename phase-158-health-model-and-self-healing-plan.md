# Phase 158 — Portfolio health model and bounded self-healing plan

## Goal
Add a truthful execution-health model and a bounded self-healing surface so operators can see whether a portfolio is healthy, degraded, paused, or blocked, and get a safe dry-run remediation plan without bypassing approval or broker safety controls.

## Scope
- Add a first-class execution health classifier built from current broker readiness, stale approvals, open-runner retry state, delivery backlog, and broker-error pause state.
- Add a dry-run self-heal planner that only recommends safe next steps; it must not auto-submit or mutate broker state.
- Surface the health state in CLI/reporting so the operator can see the current posture and next safe action.
- Keep execution safety explicit: no self-heal path may refresh approvals silently or submit orders without the existing approval/transmit gates.

## Non-goals
- No automatic live trading.
- No hidden mutation of trades.md beyond existing explicit commands.
- No resurrection of browser-session / Client Portal fallback as a hidden recovery path.

## Deliverables
1. `src/execution/portfolioHealth.js`
   - classify portfolio execution health
   - emit canonical status, severity, blockers, and recommended actions
2. `scripts/trade.js`
   - add `health` command
   - add `self-heal --dry-run` command
3. reporting integration
   - include health summary / self-heal recommendations in generated portfolio summaries and dashboards
4. focused regression tests
   - health classification
   - self-heal plan generation
   - CLI surface / docs contract

## Verification
- focused tests for new health classifier and self-heal plan
- existing reporting / dashboard tests updated if output contracts move
- `npm run verify`

## Safety gates
- self-heal remains dry-run only in this phase
- live execution still requires existing approval and transmitted-live controls
- any suggested action must map to an existing safe repo command or explicit operator step
