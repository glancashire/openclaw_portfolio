# Consolidated Roadmap Checklist

A phased execution plan that consolidates the remaining open work from `spec-outstanding-checklist.md` into a tighter implementation sequence.

## Status key
- [ ] not started
- [~] in progress / partially complete
- [x] complete

## Phase 1 — Writable execution completion
Goal: make live submission safe end-to-end.

- [x] Complete explicitly writable-mode order submission path
- [x] Make post-submission tracking durable
- [x] Finish cancel flow in writable mode
- [x] Keep staged broker orders anchored across submit / resync / cancel
- [x] Reconcile terminal states consistently for submitted / partially-filled / cancelled / filled orders
- [x] Strengthen broker-write logging and audit trail
- [x] Add focused end-to-end writable submission verification

## Phase 2 — Lifecycle reconciliation consistency
Goal: keep Markdown state and broker state aligned without duplicate or stale transitions.

- [x] Sync broker execution results back into Markdown state
- [x] Make resync idempotent after restart / crash
- [x] Prevent stale proposals from becoming actionable
- [x] Keep partial fills, failures, cancels, and retries consistent
- [x] Ensure terminal rows stay terminal
- [x] Verify reconciliation behavior against staged broker orders in all terminal paths

## Phase 3 — Trade blocking and safety hardening
Goal: stop bad live trades before they reach broker state.

- [x] Block trading when unresolved strategy questions remain
- [x] Validate approved instruments vs excluded instruments consistency
- [x] Block stale price data
- [x] Tighten broker/account mismatch or uncertain broker-state blocking
- [x] Tighten risk-limit breach blocking before proposal / execution
- [x] Preserve confirmation workflow before any real buy / sell
- [x] Enforce first-purchase approval handling
- [x] Enforce sales approval handling

## Phase 4 — Operator actions and state transitions
Goal: make human-controlled execution paths predictable and safe.

- [x] Implement proposal -> approval -> submission state transitions
- [x] Define and enforce `trades.md` update rules for approvals and executions
- [x] Add clear operator actions for approve / reject / cancel / resync
- [x] Prevent duplicate submission
- [x] Guard approval transitions to valid proposal states only
- [x] Reject approval of stale proposal eras
- [x] Guard staged orders from proposal-transition flows

## Phase 5 — History, dashboard, and reporting freshness
Goal: keep output artifacts trustworthy after material events.

- [x] Guarantee `history.md` snapshots on schedule
- [x] Guarantee `history.md` snapshots after material events
- [x] Regenerate dashboard after holdings sync
- [x] Regenerate dashboard after trade execution
- [x] Regenerate dashboard after rebalance analysis
- [x] Regenerate dashboard before report generation
- [x] Detect and report stale dashboard state
- [x] Ensure reports reflect latest holdings / trades / history
- [x] Ensure weekly / monthly / quarterly reports include all required sections
- [x] Verify report narrative quality and consistency
- [x] Surface report generation failures clearly

## Phase 6 — Rebalancing hardening
Goal: improve proposal quality and reduce avoidable churn.

- [x] Enforce absolute drift thresholds
- [x] Enforce relative drift thresholds
- [x] Enforce min/max allocation breach handling
- [x] Enforce cash-drag checks
- [x] Prefer new cash before selling
- [x] Suppress tiny trades below minimum trade size
- [x] Avoid excessive turnover
- [x] Include explicit rationale for each rebalance proposal

## Phase 7 — ETF suggestion workflow
Goal: finish shortlist generation and approval gating.

- [x] Implement ETF search + shortlist workflow
- [x] Filter by asset class
- [x] Filter by geography
- [x] Filter by currency
- [x] Filter by exchange availability
- [x] Filter by liquidity
- [x] Filter by total expense ratio
- [x] Filter by fund size
- [x] Filter by replication method
- [x] Filter by domicile
- [x] Filter by distribution vs accumulation
- [x] Filter by broker availability
- [x] Filter by spread where available
- [x] Require approval before adding to Approved Instruments

## Phase 8 — Portfolio creation workflow
Goal: make initial setup clean and safe.

- [x] Implement guided question flow for required inputs
- [x] Generate all required files for a new portfolio
- [x] Capture open questions before activation
- [x] Enforce clean draft -> active transition rules

## Phase 9 — Scheduling and operational reliability
Goal: make automation robust and restart-safe.

- [x] Verify daily workflow matches spec
- [x] Verify weekly workflow matches spec
- [x] Verify monthly workflow matches spec
- [x] Verify quarterly workflow matches spec
- [x] Add failure alerts / observability for broken runs
- [x] Ensure safe resume behavior after restart
- [x] Preserve separation between read-only automation and write-enabled automation

## Phase 10 — Broker adapter completeness audit
Goal: finish the broker integration surface area.

- [x] Verify `authenticate()` completeness
- [x] Verify `list_accounts()` completeness
- [x] Verify `select_account()` completeness
- [x] Verify `get_cash_balances()` completeness
- [x] Verify `get_holdings()` completeness
- [x] Verify `get_instrument_details()` completeness
- [x] Verify `search_instruments()` completeness
- [x] Verify `get_latest_price()` completeness
- [x] Verify `get_order_quote()` completeness
- [x] Verify `place_order()` completeness
- [x] Verify `get_order_status()` completeness
- [x] Verify `cancel_order()` completeness
- [x] Verify normalization helper completeness

## Phase 11 — End-to-end acceptance
Goal: prove the full workflow works under realistic conditions for the accepted read-only + dry-run MVP.

- [x] Create a new draft portfolio end-to-end
- [x] Approve instruments end-to-end (approval-gated shortlist surface verified end-to-end)
- [x] Sync empty holdings from broker end-to-end
- [x] Generate staged buy plan end-to-end
- [x] Produce dry-run orders end-to-end
- [x] Approve one order end-to-end (covered by execution workflow verification bundle)
- [x] Submit one order in writable mode end-to-end
- [x] Reconcile fill / cancel / failure end-to-end in transmitted writable mode
- [x] Update holdings / history / dashboard / trades end-to-end
- [x] Generate weekly / monthly / quarterly reports end-to-end
- [x] Verify safety blocks prevent bad trades end-to-end

## Recommended follow-up order beyond acceptance closure
1. Phase 24 — Transmitted live execution hardening
2. Phase 25 — Operator runbooks and incident handling
3. Phase 26 — Production reporting and delivery polish
4. Phase 27 — Risk, logging, and observability hardening

## Expanded roadmap follow-on phases

### Phase 28 — Portfolio command-center dashboard
Goal: turn the per-portfolio dashboard into a clearer operator command center.

- [x] Add explicit health snapshot section
- [x] Add broker health, execution posture, and delivery posture summary
- [x] Add clearer pending approvals / active blockers sections
- [x] Add recent material events timeline summary
- [x] Add one explicit recommended next step section
- [x] Improve severity/status labels for skimmability
- [x] Add focused dashboard UX verification tests

### Phase 29 — Structured UI summary artifacts
Goal: generate machine-readable artifacts for future UI and compact digest surfaces.

- [x] Generate `portfolio/<name>/summary.json`
- [x] Generate `runtime/overview/portfolio-index.json`
- [x] Generate `runtime/overview/pending-actions.json`
- [x] Define stable schemas for these artifacts
- [x] Ensure artifacts stay aligned with Markdown/dashboard state
- [x] Add focused artifact/schema verification tests

### Phase 30 — Multi-portfolio overview board
Goal: provide one top-level operational view across portfolios.

- [x] Build portfolio index aggregation across all portfolio folders
- [x] Show total value / last sync / health / drift / blockers / pending approvals per portfolio
- [x] Add a recommended-action summary across portfolios
- [x] Generate Markdown and/or HTML multi-portfolio overview output
- [x] Add tests for aggregation and missing-data edge cases

### Current focus
- Expanded follow-on roadmap is no longer sitting at Phase 30; the repo’s tracked implementation and test history now extends through Phase 100.
- Phases 31-42 are closed across unified queue surfacing, decision-oriented reporting, onboarding/workflow polish, static summary pages, recovery/incident views, approvals queue cleanup, daily summary, better explanations, report history, report polish, operator cockpit, and delivery/alerting status.
- Phases 60-100 are also closed in the repo’s later reporting/overview lane, covering open-runner visibility, runtime-event/reporting alignment, overview artifact surfacing, and contract hardening through `runtime/overview/pending-actions.json`.
- Remaining intentionally incomplete area is explicit transmitted live broker execution hardening, which is outside the accepted read-only + dry-run MVP closure unless we choose to open that lane.
