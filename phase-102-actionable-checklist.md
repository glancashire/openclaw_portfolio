# Phase 102 — Actionable Checklist

## Live readiness preflight
- [x] Create canonical preflight evaluator in `src/execution/`
- [x] Add CLI entrypoint in `scripts/` that prints JSON and human-readable summary
- [x] Include broker readiness in preflight result
- [x] Include execution mode in preflight result
- [x] Include trade-row approval state in preflight result
- [x] Include market-window / next-open information in preflight result
- [x] Include approval freshness / expiry evaluation
- [x] Include explicit approval-state mismatch detection
- [x] Include clear blockers and recommended next action

## Safety and truth rules
- [x] Fail closed when broker readiness is degraded or delayed-only
- [x] Fail closed when no approved executable rows exist
- [x] Fail closed when approval state is ambiguous or stale
- [x] Fail closed when execution mode is not armed for live execution
- [x] Keep live transmitted execution disabled by default

## Verification
- [x] Add focused tests for green path
- [x] Add focused tests for broker-unready path
- [x] Add focused tests for approval mismatch path
- [x] Add focused tests for stale/expired approval path
- [x] Add focused tests for market-open readiness / timing path
- [x] Run all relevant existing safety / gating / writable acceptance tests
- [x] Verify dashboard or operator summary reflects the canonical result if integrated
