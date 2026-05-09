# Phase 51: Trade Submission Open-Hours Incident Fix Plan

## Problem
Trades were not submitted/executed during open hours because the execution path was blocked by multiple safety and readiness gates, not by market timing alone.

## What likely stopped submission
1. **Broker readiness was not healthy**
   - IBKR was reported as not ready / not authenticated / not reachable in several runs.
   - The system fell back to draft assumptions instead of live pricing.

2. **Execution mode required confirmation**
   - `require_confirmation` blocked live execution until explicit approval.
   - Some paths also required a special transmitted-live acknowledgement string.

3. **Portfolio safety gates were still open**
   - Open questions remained.
   - Some portfolios had stale or simulated pricing.
   - Some risk limits were missing or unresolved.
   - Some holdings exceeded allocation limits.

4. **Approval backlog was unresolved**
   - Proposed trades were still pending user approval.
   - The queued trades never advanced to submission.

5. **Instrument and broker constraints blocked specific orders**
   - Some instruments were not approved.
   - Some broker/account references were unresolved.
   - Some execution paths were explicitly blocked for live trading.

## Fix plan

### 1) Make the stop reason explicit
- Record a single primary block reason per trade attempt.
- Surface it in the dashboard, approvals queue, and trade logs.
- Distinguish between:
  - broker readiness
  - missing approval
  - risk gate failure
  - execution-mode restriction
  - instrument not approved

### 2) Add a pre-open readiness check
- Before market open, validate:
  - broker auth/reachability
  - account selection
  - holdings freshness
  - price freshness
  - pending approvals
  - execution mode
- Fail fast with a clear operator action.

### 3) Gate open-hours submission on a single “ready to submit” state
- Only submit when all are true:
  - broker ready
  - approvals complete
  - risk limits satisfied
  - instrument approved
  - execution mode permits submission
- If any fail, keep the order in a visible blocked state.

### 4) Improve scheduling around market open
- Trigger a pre-open sync and validation window.
- Trigger submission only after validation succeeds.
- Add a retry window with bounded retries for transient broker issues.

### 5) Tighten observability
- Log every blocked submission with:
  - portfolio
  - order id / proposal id
  - exact block reason
  - timestamp
  - next recommended action
- Add a daily incident summary for unresolved blocks.

### 6) Add regression tests
- Broker not ready blocks submission.
- Pending approval blocks submission.
- Missing risk limit blocks submission.
- Stale pricing blocks submission.
- Unapproved instrument blocks submission.
- Successful open-hours submission proceeds end-to-end.

## Done when
- Open-hours trades either submit successfully or fail with one clear, actionable reason.
- No trade silently stalls in a pending state.
- Operators can see exactly what to fix before the next market open.
