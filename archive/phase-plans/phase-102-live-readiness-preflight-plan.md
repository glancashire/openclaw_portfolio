# Phase 102 — Live Readiness Preflight and Monday-Execution Truth

_Last updated: 2026-05-10 11:58 UTC_

## Goal

Create one canonical preflight surface that answers whether the active ETF portfolio is truly ready for live execution at the next market window.

This phase closes the most dangerous current gap: ambiguity between user intent, trade-log state, dashboard/reporting summaries, broker readiness, and execution policy.

## Why this phase first

Current repo state shows:
- broker readiness can be unhealthy while other repo checks still pass
- dashboard/trade state can disagree with operator expectations about what is approved
- there is no single green/red preflight bundle for “can we safely execute Monday at market open?”

Before adding more automation power, the system needs a single trustworthy readiness truth.

## Scope

Implement a canonical preflight layer that:
1. evaluates broker readiness
2. evaluates execution policy mode
3. inspects executable / approved trade rows
4. detects approval-state mismatch conditions
5. enforces approval freshness / expiry
6. reports whether the portfolio is armed for the next market-open window
7. returns one clear JSON result usable by dashboard/reporting/cron/chat surfaces

## Intended outputs

- one reusable module in `src/execution/` for preflight evaluation
- one CLI entrypoint in `scripts/`
- focused tests covering green/red paths
- dashboard/reporting integration only if needed for this phase’s truth surface

## Non-goals

- do not enable live transmitted trading by default
- do not widen execution permissions
- do not silently auto-approve trades
- do not change ETF-only / CHF-first / confirmation-first safety posture

## Design outline

### Canonical output shape
The preflight result should include at least:
- `ok`
- `portfolio`
- `generatedAt`
- `executionMode`
- `armedForMarketOpen`
- `armExpiresAt`
- `brokerReadiness`
- `marketWindow`
- `approvalState`
- `rows`
- `blockers`
- `warnings`
- `recommendedNextAction`

### Approval truth rules
- If there are only `proposed` rows and no approved rows, the result is not ready.
- If dashboard/reporting suggest approvals exist but trade rows do not, emit an explicit mismatch blocker or warning.
- If approvals are stale beyond the configured freshness window, block live readiness.
- If execution mode is not explicitly armed for live execution, block live readiness.

### Safety truth rules
- Broker readiness must be healthy enough for the intended mode.
- Delayed-only or degraded readiness must block live transmitted execution.
- Missing executable rows must block readiness.
- Approval ambiguity must block readiness.

## Verification plan

Run at minimum:
- new focused preflight unit/integration tests
- existing live-gating tests
- existing market-open policy tests
- existing writable acceptance / transmitted gating tests where relevant

## Done criteria

This phase is done when:
- there is one canonical preflight command that returns a stable JSON result
- it clearly reports the current ETF portfolio is not Monday-ready when blockers exist
- it detects approval-state truth from actual trade rows
- tests pass and prove the blocking logic
