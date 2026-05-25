# Expanded Portfolio Manager Implementation Plan

_Last updated: 2026-05-10_

This plan translates `EXPANDED_PORTFOLIO_SPECIFICATION.md` into an implementation sequence focused on usefulness, operator UX, and UI-ready artifacts.

## Status key
- [ ] not started
- [~] in progress / partially complete
- [x] complete

## Current assessment summary

### Already complete or strong
- [x] Portfolio Markdown contract and validation foundation
- [x] Portfolio creation helpers and guided intake base
- [x] ETF shortlist generation and approval gating base
- [x] IBKR read-only sync and broker safety surfaces
- [x] Dry-run / staged / guarded transmitted execution policy surfaces
- [x] Trade lifecycle reconciliation into Markdown state
- [x] Dashboard/report generation with freshness metadata
- [x] Local-only report delivery readiness posture
- [x] Operator runbooks and incident-summary tooling
- [x] Local structured runtime-event logging and observability surfaces
- [x] Command-center dashboard, structured summary artifacts, and multi-portfolio overview surfaces
- [x] Unified approvals / pending-actions queue across dashboard, report, summary, and overview outputs
- [x] Decision-oriented reporting split with incident/change/urgency views
- [x] Workflow guidance, recovery checklists, approvals queue, daily summary, report history, cockpit, and delivery-status pages
- [x] Overview artifact contract hardening through Phase 100

### Needs more work to be truly useful/user-friendly
- [x] Dashboard should become a real operator command center
- [x] Reports should better separate summary vs audit detail
- [x] A top-level multi-portfolio overview is missing
- [x] A unified pending-actions / approvals queue is missing
- [x] Structured UI-ready summary artifacts are missing
- [x] Workflow guidance still feels script-centric rather than product-like
- [x] Next-step recommendations should be more consistently surfaced
- [~] Remaining meaningful work is now mostly optional product expansion or explicitly opt-in live broker execution hardening, not core operator UX gaps

## Next implementation phases

### Phase 28 — Portfolio command-center dashboard
Goal: turn the portfolio dashboard into a clearer operator command center.

- [ ] Add explicit health snapshot section
- [ ] Add broker health, execution posture, and delivery posture summary
- [ ] Add clearer pending approvals / active blockers sections
- [ ] Add recent material events timeline summary
- [ ] Add one explicit “recommended next step” section
- [ ] Improve severity/status labels for skimmability
- [ ] Add focused dashboard UX verification tests

### Phase 29 — Structured UI summary artifacts
Goal: generate machine-readable artifacts that can power a future UI or compact digests.

- [x] Generate `portfolio/<name>/summary.json`
- [x] Generate `runtime/overview/portfolio-index.json`
- [x] Generate `runtime/overview/pending-actions.json`
- [x] Define stable schemas for these artifacts
- [x] Ensure artifacts stay aligned with Markdown/dashboard state
- [x] Add focused artifact/schema verification tests

### Phase 30 — Multi-portfolio overview board
Goal: provide one top-level operational overview across portfolios.

- [x] Build portfolio index aggregation across all portfolio folders
- [x] Show total value / last sync / health / drift / blockers / pending approvals per portfolio
- [x] Add a recommended-action summary across portfolios
- [x] Generate Markdown and/or HTML multi-portfolio overview output
- [x] Add tests for aggregation and missing-data edge cases

### Phase 31 — Unified approvals and pending-actions queue
Goal: make pending work obvious and reviewable.

- [x] Unify ETF approvals, trade approvals, pause recoveries, and report-delivery blockers into one queue
- [x] Add severity and status classification
- [x] Add plain-English operator action text per item
- [x] Add queue surfacing in dashboard/report/overview artifacts
- [x] Add verification coverage for queue generation and ordering

### Phase 32 — Decision-oriented reporting uplift
Goal: make reports faster to read and better for real decisions.

- [x] Separate executive summary vs audit detail sections clearly
- [x] Add “what changed since last report” section
- [x] Add clearer recommendation urgency labels
- [x] Add stronger incident / blocker summary in reports
- [x] Add tests for report structure and required sections

### Phase 33 — Guided workflow and onboarding polish
Goal: make the product feel more guided and less script-centric.

- [x] Restructure onboarding into staged workflow sections
- [x] Add activation-readiness review output
- [x] Add clearer guided answers / next-step suggestions
- [x] Improve approval/recovery workflow prompts
- [x] Add regression coverage for workflow UX outputs

## Expanded phase completion status
1. Phase 28 — Portfolio command-center dashboard ✅
2. Phase 29 — Structured UI summary artifacts ✅
3. Phase 30 — Multi-portfolio overview board ✅
4. Phase 31 — Unified approvals and pending-actions queue ✅
5. Phase 32 — Decision-oriented reporting uplift ✅
6. Phase 33 — Guided workflow and onboarding polish ✅
7. Phase 34 — Control-UI portfolio summary page ✅
8. Phase 35 — Recovery / incident checklist view ✅
9. Phase 36 — Clean approvals queue ✅
10. Phase 37 — Daily summary page ✅
11. Phase 38 — Better why explanations ✅
12. Phase 39 — Report history & navigation ✅
13. Phase 40 — More beautiful reports ✅
14. Phase 41 — Operator cockpit landing page ✅
15. Phase 42 — Delivery / alerting status page ✅
16. Phases 43–59 — execution/runbook/reporting/broker hardening sequence tracked in repo plans and implemented selectively where current runtime/spec work required it
17. Phases 60–100 — open-runner visibility, runtime-event/reporting alignment, overview artifact surfacing, and contract-hardening sequence ✅

## Verification strategy

Each phase should be considered complete only when it includes:
- focused tests for new outputs or schemas
- direct inspection of generated artifacts
- updated docs/status trackers
- no regression in existing execution/reporting/safety verification bundles

## Deliverables from this planning cycle
- `EXPANDED_PORTFOLIO_SPECIFICATION.md`
- `EXPANDED_IMPLEMENTATION_PLAN.md`

## Practical recommendation

The original expanded operator-UX sequence is now complete. The next sensible planning decision is no longer "which UX phase first"; it is choosing between:
- explicit live-broker execution hardening beyond the accepted read-only/dry-run posture, or
- a new product-expansion roadmap beyond the current specification.
