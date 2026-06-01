# Project Improvement Roadmap

## Goal
Turn the current portfolio-manager codebase into a cleaner, more reliable, easier-to-operate system with stronger testing governance, clearer documentation, and a better foundation for future domain expansion.

## Phase 1 — Safe hygiene and truth maintenance
**Status:** started on 2026-05-30

### Scope
- remove stale naming/wording drift
- eliminate unsafe fixed temp-file shortcuts
- align config/policy prose with actual behavior
- produce a canonical audit/spec/improvement-plan package

### Delivered in this phase
- Mailgun test wording cleanup
- temp-file wrapper for `apply:answers`
- delivery-policy note correction
- this audit + roadmap package

## Phase 2 — Configuration and environment hardening
### Objectives
- centralize configuration contracts
- reduce hidden hard-coded defaults
- separate pure config loading from global environment mutation
- document the full config matrix

### Delivered / remaining
Delivered already:
- `docs/config-matrix.md` added
- pure `readWorkspaceEnv()` introduced alongside mutating `loadWorkspaceEnv()`
- tests proving loopback-only TLS relaxations do not apply to non-local hosts

Remaining closeout:
- centralize IBKR host/port/baseUrl defaults and document them once
- keep config docs/checklists aligned with the actual loader behavior

## Phase 3 — CLI and orchestration refactor
### Objectives
- split `scripts/trade.js` into smaller command modules
- push subprocess spawning to the edge
- make JSON contracts first-class and human rendering secondary

### Candidate work
- create `src/cli/` or `scripts/trade/` command handlers
- add shared output helpers (`printJson`, `printTable`, `exitWithError`)
- refactor basket lifecycle integration points away from shell round-trips where possible

## Phase 4 — Test governance and coverage transparency
### Objectives
- make the default verification gate easier to trust
- show which domains are covered by `npm test`
- externalize lane/quarantine policy

### Delivered / remaining
Delivered in Phase 4B:
- generated `docs/operations/test-coverage-by-domain.json` from discovered tests
- moved skip/override/quarantine policy into `config/test-discovery-policy.json`
- tightened manifest drift validation to cover policy + domain-summary artifacts
- promoted `docs/operations/test-lanes.md` as the canonical human-facing governance doc

Remaining evaluation:
- decide later whether generated-artifact idempotence deserves its own named lane or should remain covered by targeted artifact/reporting tests

## Phase 5 — Artifact hygiene and dead-code retirement
### Objectives
- reduce noise in the repo
- clarify supported vs debug-only tools
- retire obsolete compatibility surfaces

### Candidate work
- confirm whether `scripts/execute-trades.js` can be removed
- classify current debug scripts into keep/move/remove
- move stable operator helpers into a supported namespace
- separate golden fixtures from live/generated report artifacts more cleanly

## Phase 6 — Operator UX and support simplification
### Objectives
- define a canonical top-10 operator command set
- simplify support playbooks
- stabilize machine-readable output contracts

### Candidate work
- create `docs/operator-golden-path.md`
- add per-command JSON schema notes
- reduce duplicate/overlapping helper commands where possible

## Phase 7 — Reliability and self-heal realism
### Objectives
- make degraded states more visible
- add explicit cron/health self-checking
- keep self-heal conservative and truthful

### Candidate work
- add cron-health status to overview artifacts when fetches fail
- add a cron health job that validates critical jobs, recent runs, and delivery posture
- add bounded self-heal actions only where they are safe and reversible
- rename “self-heal” surfaces to “guided remediation” if actual automated healing remains intentionally narrow

## Phase 8 — Product and usage reporting
### Objectives
- understand how the system is used
- measure friction and degraded behavior
- turn reporting into decision support, not just artifact generation

### Candidate work
- usage counters for report sends, failures, approval latency, readiness failures, broker degradation, reconciliation lag
- trend summaries in dashboard/health outputs
- operator KPI card in overview artifacts

## Phase 9 — OpenClaw maintainer experience
### Objectives
- reduce fragmented OpenClaw host knowledge
- improve `.md` configuration files and maintainer ergonomics

### Candidate work
- create `docs/openclaw-host-contract.md`
- tighten `AGENTS.md` / `TOOLS.md` / playbook responsibilities
- add a clear matrix for channels, sandboxing, cron delivery caveats, restart semantics, and approval boundaries

## Phase 10 — Spitex exploration track
### Objectives
- assess whether the current workflow primitives can support a future care-operations product
- separate reusable orchestration patterns from trading-specific implementation

### Candidate work
- write a domain translation spec: portfolio → patient/case/visit/staff/billing
- define privacy, role, and audit requirements for care operations
- sketch owner/manager/nurse dashboards and lifecycle states

## Recommended next implementation batch
1. Phase 2 — configuration/environment hardening
2. Phase 4 — test governance and coverage transparency
3. Phase 7 — cron health + truthful guided remediation
4. Phase 5 — artifact hygiene and dead-code retirement
