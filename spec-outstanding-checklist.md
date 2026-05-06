# Specification Outstanding Checklist

Use this checklist to track progress toward full completion of `SPECIFICATION.md`.

## Status key
- [ ] not complete
- [~] partially complete / needs hardening
- [x] complete

## 1. Live execution lane
- [~] Implement explicitly writable-mode order submission path
- [~] Implement durable order status tracking after submission
- [~] Implement robust cancel flow in writable mode
- [x] Preserve confirmation workflow before any real buy/sell
- [~] Handle partial fills / failed submissions / retries safely
- [~] Strengthen broker-write logging and audit trail

## 2. Approval-gated execution workflow
- [~] Implement proposal -> approval -> submission state transitions
- [~] Define and enforce `trades.md` update rules for approvals and executions
- [x] Implement first-purchase approval handling
- [x] Implement sales approval handling
- [x] Implement blocked-state behavior for unresolved strategy questions
- [~] Add clear operator actions for approve / reject / cancel / resync

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
- [ ] Submit one order in writable mode end-to-end
- [ ] Reconcile fill / cancel / failure end-to-end in transmitted writable mode
- [x] Update holdings / history / dashboard / trades end-to-end
- [x] Generate weekly / monthly / quarterly reports end-to-end
- [x] Verify safety blocks prevent bad trades end-to-end

## Working summary
- Acceptance closure is complete for the in-scope read-only + dry-run MVP.
- Biggest remaining risk is no longer broad MVP incompleteness; it is the separate writable-live lane between staged broker orders and fully safe transmitted submission / terminal reconciliation.
- Current state: read-only IBKR connectivity, holdings sync, dry-run proposal generation, staged live broker orders, approval/rejection flows, duplicate-submission guards, partial-fill inference, resync hardening, dashboard/report generation, core safety controls, and acceptance-sweep closure are all in place.
- Suggested follow-up order:
  1. writable submission completion + terminal reconciliation consistency
  2. operator-action/live-path audit hardening
  3. transmitted writable-mode end-to-end drills
