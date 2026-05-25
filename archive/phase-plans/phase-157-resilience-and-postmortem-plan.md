# Phase 157 — Postmortem and resilience follow-through

## Goal
Turn the 2026-05-13 live recovery arc into explicit prevention work: fewer silent divergences, clearer operator guidance, and safer recovery defaults when IBKR/native/live state drifts.

## Postmortem threads
1. Portal session state and native socket state diverged and made lookup behavior confusing.
2. Native handshake/order-id assumptions were too implicit.
3. Planner and holdings parsing let stale or contradictory state survive too long.
4. CLI/docs drifted from implemented reconciliation capabilities.
5. Recovery required too much manual sequence knowledge.

## Immediate hardening targets
- [x] Add an operator-facing postmortem summary document.
- [x] Add a first-class readiness/status surface that reports native-vs-portal divergence explicitly.
- [x] Add tests around that divergence reporting.
- [x] Tighten recovery docs / next-action messaging so the system suggests native raw contract lookup before portal login when appropriate.
- [x] Verify the new resilience slice with focused tests.

## Next features that now make sense
- [ ] Portfolio health model + bounded self-healing (`155E`) as first-class CLI/artifact surfaces.
- [ ] Automatic stale-approval refresh workflow with explicit operator reapproval UX.
- [ ] Native contract-resolution cache / normalization for repeated ISIN-to-conid lookups across venues.
- [ ] Recovery playbooks that can auto-suggest the next safe command from current broker/trade state.
- [ ] Multi-portfolio scheduler/heartbeat hooks for read-only reconciliation and alerting.
- [ ] Separate automated test lanes: `safe/full`, `live-smoke`, and `external-integrations`.
