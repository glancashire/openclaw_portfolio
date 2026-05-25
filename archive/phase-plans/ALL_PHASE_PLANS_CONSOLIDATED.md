# Consolidated Phase Plans

This file consolidates the portfolio-manager implementation plans into one view.

## A. Original implementation arc

### Completed implementation phases
1. Repo scaffolding
2. Template portfolio files
3. Markdown parser/generator foundation
4. Portfolio-folder contract validation
5. Draft bootstrap helper for portfolio creation from structured input
6. Strategy validation for status, execution modes, allocations, placeholders, and broker/base-currency constraints
7. Interactive draft workflow helpers for applying answers and asking next questions
8. Dry-run Interactive Brokers adapter/auth/holdings scaffolding
9. Holdings sync simulation plus generated-state checks
10. Dashboard regeneration
11. Trade proposal and trade-log writing helpers
12. History snapshot writing
13. Weekly/monthly/quarterly Markdown report generation with PDF placeholder export
14. Safety-control checks for draft/live-readiness review
15. Interactive Brokers-only repo narrowing and holdings-sync decoupling from the removed IG path
16. Native Interactive Brokers read-only connectivity, live holdings sync, and live-priced dry-run proposal refresh for the ETF portfolio
17. ETF portfolio moved from draft to active while remaining confirmation-gated and read-only
18. Portfolio-aware execution gating and staged-order scaffolding
19. Trade lifecycle reconciliation into Markdown state (`approved/submitted/partially_filled/filled/cancelled/failed`)
20. Post-fill holdings refresh hook, broker error pause state, and completed-order status fallback
21. Typed execution history snapshots, dashboard execution lifecycle visibility, bundled execution verification, safe demo execution flow, and fail-closed pre-trade safety hardening for unresolved questions / stale data / excluded-instrument conflicts
23. End-to-end acceptance closure

### Detailed closure plans captured during the implementation arc
- `phase-1-writable-execution-plan.md`
- `phase-2-execution-reconciliation-plan.md`
- `phase-3-trade-blocking-safety-plan.md`
- `phase-4-history-dashboard-report-freshness-plan.md`
- `phase-4-operator-actions-state-transitions-plan.md`
- `phase-5-rebalancing-hardening-plan.md`
- `phase-6-etf-suggestion-hardening-plan.md`
- `phase-7-etf-suggestion-completion-plan.md`
- `phase-7-portfolio-creation-hardening-plan.md`
- `phase-8-portfolio-guided-intake-plan.md`
- `phase-8-reporting-completeness-plan.md`
- `phase-9-scheduling-ops-reliability-plan.md`
- `phase-10-broker-adapter-completeness-plan.md`
- `phase-11-execution-safety-closure-plan.md`
- `phase-12-rebalancing-closure-plan.md`
- `phase-23-end-to-end-acceptance-closure-plan.md`

## B. Post-MVP implementation arc

### Phase 24 — Transmitted live execution hardening
Status: complete
Plan file: `phase-24-transmitted-live-execution-hardening-plan.md`

Checklist summary:
- [x] Define transmitted-live scope and activation prerequisites
- [x] Add explicit mode boundaries between staged writable and transmitted-live flow
- [x] Require stronger readiness checks before transmitted submission
- [x] Harden broker-write audit logging for transmitted actions
- [x] Add operator-facing transmitted-mode warnings/notes
- [x] Add focused regression tests for transmitted-mode gating
- [x] Add verification coverage for transmitted-mode safeguards

### Phase 25 — Operator runbooks and incident handling
Status: complete
Plan file: `phase-25-operator-runbooks-incident-handling-plan.md`

Checklist summary:
- [x] Write operator runbooks for approve / reject / resync / cancel / broker-error pause / recovery
- [x] Document expected state transitions and failure cases with examples
- [x] Add CLI/helpful script surfaces where operator recovery was awkward
- [x] Add verification for documented recovery workflows where practical
- [x] Tighten audit-trail visibility in Markdown/report artifacts for operator actions

### Phase 26 — Production reporting and delivery polish
Status: complete
Plan file: `phase-26-production-reporting-delivery-polish-plan.md`

Checklist summary:
- [x] Define report delivery policy and failure-alert policy
- [x] Harden scheduled report/digest metadata for operator consumption
- [x] Improve dashboard/report surfacing for freshness, failure, and pending-action state
- [x] Add verification for delivery-policy/readiness behavior without external side effects
- [x] Update docs for production reporting operations and limits

### Phase 27 — Risk, logging, and observability hardening
Status: complete
Plan file: `phase-27-risk-logging-observability-hardening-plan.md`

Checklist summary:
- [x] Centralize structured runtime logging artifacts
- [x] Strengthen deeper risk-limit visibility and operator-facing diagnostics
- [x] Add targeted failure-drill coverage for safely simulated live-path edge cases
- [x] Improve observability docs around broker degradation, stale data, and blocked trading states
- [x] Update verification bundles and status docs to reflect stronger observability posture

## C. Later expanded and hardening arcs

### Expanded follow-on roadmap through Phase 42
Status: complete

Summary coverage:
- operator command-center/dashboard uplift
- structured summary artifacts and multi-portfolio overview surfaces
- unified operator queue and decision-oriented reporting
- onboarding/workflow polish, static summary pages, and recovery/incident views
- approvals queue cleanup, daily summary, report history, and delivery/alerting status surfaces

### Later reporting/verification/hardening phases through Phase 120
Status: complete

Summary coverage:
- overview/reporting contract hardening through the later Phase 60-100 lane
- canonical live readiness preflight and execution command rationalization
- canonical execution-authority, effective-config, and delivery-posture diagnostics
- transmitted-live acceptance coverage and operator incident verification
- documentation/contract alignment across execution, observability, workflow, and transmitted-live operator surfaces
- progress and master-roadmap reconciliation through Phase 120

## D. Tracking / overview documents
- `IMPLEMENTATION_PLAN.md`
- `consolidated-roadmap-checklist.md`
- `spec-outstanding-checklist.md`
- `SPEC_PROGRESS.md`
- `PROGRESS_REPORT.md`
- `post-mvp-roadmap.md`

## E. Current closure state
- Original implementation roadmap: closed
- Post-MVP roadmap through Phase 27: closed
- Expanded follow-on roadmap through Phase 42: closed
- Later reporting/verification/hardening phases through Phase 120: closed
- Remaining explicit phases in tracked docs: none

## F. Quick file index
- Strategy / master overview: `IMPLEMENTATION_PLAN.md`
- Post-MVP forward roadmap: `post-mvp-roadmap.md`
- Detailed phase plans: `phase-*-plan.md`
- Progress/status synthesis: `SPEC_PROGRESS.md`, `PROGRESS_REPORT.md`
- Checklist views: `consolidated-roadmap-checklist.md`, `spec-outstanding-checklist.md`
