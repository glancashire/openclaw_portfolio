# Post-MVP Roadmap

This roadmap starts after the accepted read-only + dry-run MVP closure. Those explicit post-MVP phases are now complete; this file remains as the canonical record of that roadmap rather than an active todo list.

## Status key
- [ ] not started
- [~] in progress / partially complete
- [x] complete

## Current state
- [x] All explicitly tracked post-MVP roadmap phases below are complete
- [x] Remaining work, if any, should be defined as a new roadmap expansion rather than inferred from this closed list
- [x] Real transmitted live execution remains guarded and environment-dependent despite roadmap completion

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

- [x] Centralize structured runtime logging guidance/artifacts
- [x] Strengthen deeper risk-limit enforcement visibility and operator-facing diagnostics
- [x] Add targeted failure-drill coverage for live-path edge cases that can be safely simulated
- [x] Improve observability docs around broker degradation, stale data, and blocked trading states
- [x] Update verification bundles and status docs to reflect the stronger observability posture

## Execution order used
1. Phase 24 — Transmitted live execution hardening
2. Phase 25 — Operator runbooks and incident handling
3. Phase 26 — Production reporting and delivery polish
4. Phase 27 — Risk, logging, and observability hardening

## Closure note
The explicit post-MVP roadmap is complete. Any additional work should be tracked as a fresh phase expansion with its own plan/checklist instead of reopening these phases implicitly.

## Roadmap expansion candidates after live ETF closure

These are the most sensible next features for the system as a whole now that the active ETF lane is working end-to-end:

- [ ] **Portfolio health model + bounded self-healing**
  - first-class `trade health` / `trade self-heal --dry-run` surfaces
  - explicit retry budgets, cooldowns, and escalation states
  - read-only heartbeat automation for reconciliation and stale-state detection

- [ ] **Approval lifecycle UX hardening**
  - dedicated stale-approval refresh command
  - grouped approval queue for regenerated plans vs legacy rows
  - operator-facing explanation of why a row is excluded or needs reapproval

- [ ] **Native contract intelligence**
  - cache and normalize native `contractDetails` for ISIN/symbol lookups
  - preserve conid, symbol, localSymbol, primaryExch, currency, and venue variants
  - prefer validated native contract metadata over browser-session heuristics

- [ ] **Recovery playbooks as executable guidance**
  - convert postmortem learnings into next-action suggestions emitted by runtime/report artifacts
  - explain the safe recovery ladder for broker down, quote unavailable, stale approval, and fill reconciliation cases

- [ ] **Automated verification lanes**
  - keep `verify-repo.js` as the curated repo gate
  - add a discovered `test:all` suite for broad regression coverage
  - add explicit future lanes for `live-smoke` and `external-integrations` so real-network tests stay separate from safe CI-style coverage

- [ ] **Broader portfolio/product polish**
  - multi-portfolio operational views with stronger health rollups
  - richer report delivery / alert routing
  - operator drill surfaces for incident review and audit export
