# Specification Outstanding Checklist

Use this checklist to track progress toward full completion of `SPECIFICATION.md`.

## Status key
- [ ] not complete
- [~] partially complete / needs hardening
- [x] complete

## 1. Live execution lane
- [x] Implement explicitly writable-mode order submission path
- [x] Implement durable order status tracking after submission
- [x] Implement robust cancel flow in writable mode (W5: `cancel-portfolio-order --broker-only` fallback ships cross-client cancel support)
- [x] Preserve confirmation workflow before any real buy/sell
- [x] Handle partial fills / failed submissions / retries safely
- [x] Strengthen broker-write logging and audit trail

## 2. Approval-gated execution workflow
- [x] Implement proposal -> approval -> submission state transitions
- [x] Define and enforce `trades.md` update rules for approvals and executions
- [x] Implement first-purchase approval handling
- [x] Implement sales approval handling
- [x] Implement blocked-state behavior for unresolved strategy questions
- [x] Add clear operator actions for approve / reject / cancel / resync

## 3. Order lifecycle hardening and reconciliation
- [x] Add reconciliation for submitted / open / filled / cancelled orders
- [x] Sync broker execution results back into Markdown state
- [x] Prevent duplicate submission
- [x] Prevent execution of stale proposals
- [x] Make resync idempotent after restart/crash
- [x] Block repeated trade attempts after uncertain broker/API failures without human review

## 4. Strategy validation and trade blocking
- [x] Block trading when unresolved questions remain
- [x] Validate approved instruments / excluded instruments consistency
- [x] Detect and block on unmatched holdings
- [x] Detect and block on stale price data
- [x] Detect and block on risk-limit breaches before proposal/execution
- [x] Detect and block on broker/account mismatch or uncertain broker state

## 5. ETF suggestion workflow
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

## 6. Portfolio creation workflow
- [x] Implement guided question flow for required inputs
- [x] Generate all required files for a new portfolio
- [x] Capture open questions before activation
- [x] Enforce clean draft -> active transition rules

## 7. History and dashboard refresh orchestration
- [x] Guarantee `history.md` snapshots on schedule
- [x] Guarantee `history.md` snapshots after material events
- [x] Regenerate dashboard after holdings sync
- [x] Regenerate dashboard after trade execution
- [x] Regenerate dashboard after rebalance analysis
- [x] Regenerate dashboard before report generation
- [x] Detect and report stale dashboard state

## 8. Rebalancing engine hardening
- [x] Enforce absolute drift thresholds
- [x] Enforce relative drift thresholds
- [x] Enforce min/max allocation breach handling
- [x] Enforce cash-drag checks
- [x] Prefer new cash before selling
- [x] Suppress tiny trades below minimum trade size
- [x] Avoid excessive turnover
- [x] Include explicit rationale for each rebalance proposal

## 9. Reporting completeness and polish
- [x] Ensure weekly reports include all required sections
- [x] Ensure monthly reports include all required sections
- [x] Ensure quarterly reports include all required sections
- [x] Verify report narrative quality and consistency
- [x] Ensure reports reflect latest holdings/trades/history
- [x] Surface report generation failures clearly
- [x] Verify filename pattern and schedule behavior

## 10. Scheduling / automation reliability
- [x] Verify daily workflow matches spec
- [x] Verify weekly workflow matches spec
- [x] Verify monthly workflow matches spec
- [x] Verify quarterly workflow matches spec
- [x] Add failure alerts / observability for broken runs
- [x] Ensure safe resume behavior after restart
- [x] Preserve separation between read-only automation and write-enabled automation

## 11. Broker adapter completeness audit
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

## 12. End-to-end acceptance testing
- [x] Create a new draft portfolio end-to-end
- [x] Approve instruments end-to-end (approval-gated shortlist surface verified)
- [x] Sync empty holdings from broker end-to-end
- [x] Generate staged buy plan end-to-end
- [x] Produce dry-run orders end-to-end
- [x] Approve one order end-to-end (via execution workflow verification bundle)
- [x] Submit one order in writable mode end-to-end
- [x] Reconcile fill / cancel / failure end-to-end in transmitted writable mode
- [x] Update holdings / history / dashboard / trades end-to-end
- [x] Generate weekly / monthly / quarterly reports end-to-end
- [x] Verify safety blocks prevent bad trades end-to-end

## 13. Expanded roadmap and overview/reporting hardening
- [x] Complete command-center dashboard uplift (Phase 28)
- [x] Complete structured UI summary artifacts (Phase 29)
- [x] Complete multi-portfolio overview board (Phase 30)
- [x] Complete unified pending-actions queue surfacing (Phase 31)
- [x] Complete decision-oriented reporting uplift (Phase 32)
- [x] Complete guided onboarding/workflow polish (Phase 33)
- [x] Complete per-portfolio static summary page generation (Phase 34)
- [x] Complete Phases 35-42 operator UX follow-ons tracked in repo plans
- [x] Complete later reporting/overview hardening through Phase 100, including open-runner visibility, runtime-event/reporting alignment, overview artifact surfacing, and pending-actions contract assertions

## Working summary
- Acceptance closure is complete for the implemented engineering scope.
- Biggest remaining risks are operational: native IBKR login/2FA dependency, external delivery/infra setup, and decisions about how far bounded self-heal guidance should be promoted.
- Current state: writable-mode order submission, durable reconciliation/status tracking, guarded live broker operations, approval/rejection flows, duplicate-submission guards, partial-fill inference, resync hardening, dashboard/report generation, and core safety controls are all in place.
- Suggested follow-up order:
  1. explicit closeout decisions on remaining decision-only lanes
  2. blocked external infra work once access exists
  3. operator runbooks, delivery polish, and observability follow-through where real usage still shows friction
