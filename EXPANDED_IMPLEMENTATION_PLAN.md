# Expanded Portfolio Manager Implementation Plan

_Last updated: 2026-05-06_

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

### Needs more work to be truly useful/user-friendly
- [ ] Dashboard should become a real operator command center
- [ ] Reports should better separate summary vs audit detail
- [ ] A top-level multi-portfolio overview is missing
- [ ] A unified pending-actions / approvals queue is missing
- [ ] Structured UI-ready summary artifacts are missing
- [ ] Workflow guidance still feels script-centric rather than product-like
- [ ] Next-step recommendations should be more consistently surfaced

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

- [~] Build portfolio index aggregation across all portfolio folders
- [ ] Show total value / last sync / health / drift / blockers / pending approvals per portfolio
- [ ] Add a recommended-action summary across portfolios
- [ ] Generate Markdown and/or HTML multi-portfolio overview output
- [ ] Add tests for aggregation and missing-data edge cases

### Phase 31 — Unified approvals and pending-actions queue
Goal: make pending work obvious and reviewable.

- [ ] Unify ETF approvals, trade approvals, pause recoveries, and report-delivery blockers into one queue
- [ ] Add severity and status classification
- [ ] Add plain-English operator action text per item
- [ ] Add queue surfacing in dashboard/report/overview artifacts
- [ ] Add verification coverage for queue generation and ordering

### Phase 32 — Decision-oriented reporting uplift
Goal: make reports faster to read and better for real decisions.

- [ ] Separate executive summary vs audit detail sections clearly
- [ ] Add “what changed since last report” section
- [ ] Add clearer recommendation urgency labels
- [ ] Add stronger incident / blocker summary in reports
- [ ] Add tests for report structure and required sections

### Phase 33 — Guided workflow and onboarding polish
Goal: make the product feel more guided and less script-centric.

- [ ] Restructure onboarding into staged workflow sections
- [ ] Add activation-readiness review output
- [ ] Add clearer guided answers / next-step suggestions
- [ ] Improve approval/recovery workflow prompts
- [ ] Add regression coverage for workflow UX outputs

## Suggested execution order
1. Phase 28 — Portfolio command-center dashboard
2. Phase 29 — Structured UI summary artifacts
3. Phase 30 — Multi-portfolio overview board
4. Phase 31 — Unified approvals and pending-actions queue
5. Phase 32 — Decision-oriented reporting uplift
6. Phase 33 — Guided workflow and onboarding polish

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

If choosing only one next phase, start with **Phase 28 — Portfolio command-center dashboard**.

Why:
- it creates the fastest visible usability improvement
- it will force clearer modeling of blockers, approvals, health, and next steps
- it lays the foundation for the multi-portfolio board and action queue
- it makes the current system feel substantially more like a product and less like a toolchain
