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
- [ ] Implement blocked-state behavior for unresolved strategy questions
- [~] Add clear operator actions for approve / reject / cancel / resync

## 3. Order lifecycle hardening and reconciliation
- [x] Add reconciliation for submitted / open / filled / cancelled orders
- [x] Sync broker execution results back into Markdown state
- [x] Prevent duplicate submission
- [x] Prevent execution of stale proposals
- [x] Make resync idempotent after restart/crash
- [x] Block repeated trade attempts after uncertain broker/API failures without human review

## 4. Strategy validation and trade blocking
- [ ] Block trading when unresolved questions remain
- [ ] Validate approved instruments / excluded instruments consistency
- [~] Detect and block on unmatched holdings
- [ ] Detect and block on stale price data
- [~] Detect and block on risk-limit breaches before proposal/execution
- [~] Detect and block on broker/account mismatch or uncertain broker state

## 5. ETF suggestion workflow
- [ ] Implement ETF search + shortlist workflow
- [ ] Filter by asset class
- [ ] Filter by geography
- [ ] Filter by currency
- [ ] Filter by exchange availability
- [ ] Filter by liquidity
- [ ] Filter by total expense ratio
- [ ] Filter by fund size
- [ ] Filter by replication method
- [ ] Filter by domicile
- [ ] Filter by distribution vs accumulation
- [ ] Filter by broker availability
- [ ] Filter by spread where available
- [~] Require approval before adding to Approved Instruments

## 6. Portfolio creation workflow
- [ ] Implement guided question flow for required inputs
- [~] Generate all required files for a new portfolio
- [~] Capture open questions before activation
- [~] Enforce clean draft -> active transition rules

## 7. History and dashboard refresh orchestration
- [~] Guarantee `history.md` snapshots on schedule
- [ ] Guarantee `history.md` snapshots after material events
- [x] Regenerate dashboard after holdings sync
- [ ] Regenerate dashboard after trade execution
- [x] Regenerate dashboard after rebalance analysis
- [x] Regenerate dashboard before report generation
- [ ] Detect and report stale dashboard state

## 8. Rebalancing engine hardening
- [ ] Enforce absolute drift thresholds
- [ ] Enforce relative drift thresholds
- [ ] Enforce min/max allocation breach handling
- [~] Enforce cash-drag checks
- [~] Prefer new cash before selling
- [ ] Suppress tiny trades below minimum trade size
- [ ] Avoid excessive turnover
- [~] Include explicit rationale for each rebalance proposal

## 9. Reporting completeness and polish
- [~] Ensure weekly reports include all required sections
- [~] Ensure monthly reports include all required sections
- [~] Ensure quarterly reports include all required sections
- [ ] Verify report narrative quality and consistency
- [~] Ensure reports reflect latest holdings/trades/history
- [ ] Surface report generation failures clearly
- [~] Verify filename pattern and schedule behavior

## 10. Scheduling / automation reliability
- [~] Verify daily workflow matches spec
- [~] Verify weekly workflow matches spec
- [~] Verify monthly workflow matches spec
- [~] Verify quarterly workflow matches spec
- [ ] Add failure alerts / observability for broken runs
- [ ] Ensure safe resume behavior after restart
- [~] Preserve separation between read-only automation and write-enabled automation

## 11. Broker adapter completeness audit
- [~] Verify `authenticate()` completeness
- [~] Verify `list_accounts()` completeness
- [~] Verify `select_account()` completeness
- [~] Verify `get_cash_balances()` completeness
- [~] Verify `get_holdings()` completeness
- [~] Verify `get_instrument_details()` completeness
- [ ] Verify `search_instruments()` completeness
- [~] Verify `get_latest_price()` completeness
- [~] Verify `get_order_quote()` completeness
- [~] Verify `place_order()` completeness
- [~] Verify `get_order_status()` completeness
- [~] Verify `cancel_order()` completeness
- [~] Verify normalization helper completeness

## 12. End-to-end acceptance testing
- [ ] Create a new draft portfolio end-to-end
- [ ] Approve instruments end-to-end
- [x] Sync empty holdings from broker end-to-end
- [~] Generate staged buy plan end-to-end
- [~] Produce dry-run orders end-to-end
- [ ] Approve one order end-to-end
- [ ] Submit one order in writable mode end-to-end
- [ ] Reconcile fill / cancel / failure end-to-end
- [~] Update holdings / history / dashboard / trades end-to-end
- [~] Generate weekly / monthly / quarterly reports end-to-end
- [x] Verify safety blocks prevent bad trades end-to-end

## Working summary
- Biggest remaining risk: closing the final gap between staged broker orders and fully safe live submission / terminal reconciliation.
- Current state: read-only IBKR connectivity, holdings sync, dry-run proposal generation, staged live broker orders, approval/rejection flows, duplicate-submission guards, partial-fill inference, resync hardening, dashboard/report generation, and core safety controls are all substantially in place; fully finished writable execution and end-to-end reconciliation remain the main gaps.
- Suggested implementation order:
  1. writable submission completion + terminal reconciliation consistency
  2. unresolved-strategy / stale-data / broker-state trade blocking hardening
  3. history/dashboard/report orchestration review
  4. rebalancing hardening
  5. ETF suggestion workflow
  6. portfolio creation workflow verification
  7. scheduling/alerts/ops hardening
  8. broker interface completeness audit
  9. end-to-end acceptance testing
