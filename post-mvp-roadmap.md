# Post-MVP Roadmap

This roadmap starts after the accepted read-only + dry-run MVP closure. It defines the next implementation phases explicitly instead of treating the repo as fully finished.

## Status key
- [ ] not started
- [~] in progress / partially complete
- [x] complete

## Phase 24 — Transmitted live execution hardening
Goal: introduce an explicitly opt-in transmitted live-order path with fail-closed safety boundaries, operator confirmation checkpoints, and auditable broker-write behavior.

- [x] Define the transmitted-live scope and activation prerequisites in docs/config
- [x] Add explicit mode boundaries between staged writable flow and transmitted live flow
- [x] Require stronger readiness checks before transmitted submission
- [x] Harden broker-write audit logging for transmitted actions
- [x] Add explicit operator-facing warnings/notes for transmitted mode
- [x] Add focused regression tests for transmitted-mode gating
- [x] Add a verification command or bundle entry covering transmitted-mode safeguards

## Phase 25 — Operator runbooks and incident handling
Goal: make the system operable during degraded broker conditions, stale state, and execution incidents without relying on tribal knowledge.

- [x] Write operator runbooks for approve / reject / resync / cancel / broker-error pause / recovery
- [x] Document expected state transitions and failure cases with examples
- [x] Add CLI/helpful script surfaces where operator recovery is awkward today
- [x] Add verification for documented recovery workflows where practical
- [x] Tighten audit-trail visibility in Markdown/report artifacts for operator actions

## Phase 26 — Production reporting and delivery polish
Goal: make scheduled outputs more production-ready for real operator use.

- [x] Define report delivery policy and failure-alert policy
- [x] Harden scheduled report/digest metadata for operator consumption
- [x] Improve dashboard/report surfacing for freshness, failure, and pending-action state
- [x] Add verification for delivery-policy/readiness behavior that does not require external side effects
- [x] Update docs for production reporting operations and limits

## Phase 27 — Risk, logging, and observability hardening
Goal: improve trust in real operations through stronger runtime evidence, risk-limit visibility, and failure diagnosis.

- [ ] Centralize structured runtime logging guidance/artifacts
- [ ] Strengthen deeper risk-limit enforcement visibility and operator-facing diagnostics
- [ ] Add targeted failure-drill coverage for live-path edge cases that can be safely simulated
- [ ] Improve observability docs around broker degradation, stale data, and blocked trading states
- [ ] Update verification bundles and status docs to reflect the stronger observability posture

## Suggested execution order
1. Phase 24 — Transmitted live execution hardening
2. Phase 25 — Operator runbooks and incident handling
3. Phase 26 — Production reporting and delivery polish
4. Phase 27 — Risk, logging, and observability hardening
