# Phase 102 — Actionable Checklist

## Live readiness preflight
- [ ] Create canonical preflight evaluator in `src/execution/`
- [ ] Add CLI entrypoint in `scripts/` that prints JSON and human-readable summary
- [ ] Include broker readiness in preflight result
- [ ] Include execution mode in preflight result
- [ ] Include trade-row approval state in preflight result
- [ ] Include market-window / next-open information in preflight result
- [ ] Include approval freshness / expiry evaluation
- [ ] Include explicit approval-state mismatch detection
- [ ] Include clear blockers and recommended next action

## Safety and truth rules
- [ ] Fail closed when broker readiness is degraded or delayed-only
- [ ] Fail closed when no approved executable rows exist
- [ ] Fail closed when approval state is ambiguous or stale
- [ ] Fail closed when execution mode is not armed for live execution
- [ ] Keep live transmitted execution disabled by default

## Verification
- [ ] Add focused tests for green path
- [ ] Add focused tests for broker-unready path
- [ ] Add focused tests for approval mismatch path
- [ ] Add focused tests for stale/expired approval path
- [ ] Add focused tests for market-open readiness / timing path
- [ ] Run all relevant existing safety / gating / writable acceptance tests
- [ ] Verify dashboard or operator summary reflects the canonical result if integrated
