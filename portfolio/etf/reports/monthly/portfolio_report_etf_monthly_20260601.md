# Portfolio Report: etf

## Period
- Report type: monthly
- Period start: 2026-06-01
- Period end: 2026-06-01
- Generated: 2026-06-01T17:35:42.754Z

## Decision View

### Executive Summary
Latest snapshot: CHF 100687.59790025001 total and CHF 0 cash. No in-flight execution states are currently pending. Dashboard freshness is current against the tracked source files. Broker readiness is degraded: Interactive Brokers connectivity is available, but broker-backed pricing is not yet yielding a usable live/delayed quote posture. Rendering required a fallback: render mode rendered Reporting delivery posture needs operator attention (1 pending item(s)).

### Incident / Blocker Summary
- Broker readiness degraded: Interactive Brokers connectivity is available, but broker-backed pricing is not yet yielding a usable live/delayed quote posture.

### What Changed Since Last Report
- Portfolio value change since previous report: CHF 100687.60
- Cash change since previous report: CHF -20841.44
- Proposed trade delta: -5
- Approved trade delta: +0
- In-flight execution delta: +0
- Queue item delta: +0
- Blocking item delta: +0

### Recommendation Urgency
- Current urgency: CRITICAL

### Recommended Changes
- [CRITICAL] Recommendation: Restore Interactive Brokers connectivity, then resolve contract ids and re-run live-priced dry-run proposals.

### Next Actions
- [CRITICAL] Next action: Validate Interactive Brokers gateway/session reachability before treating any proposal as broker-backed.

## Audit Detail

### Performance
| Metric | Value |
|---|---:|
| Start value CHF | 100687.59790025001 |
| End value CHF | 100687.59790025001 |
| Change CHF | 0 |
| Change % | 0 |

### Allocation Review
| Asset class | Start % | End % | Target % | Drift % |
|---|---:|---:|---:|---:|
| Global equities | 0 | 0 | 60 | -60 |
| Swiss equities | 0 | 0 | 20 | -20 |
| Bonds / cash-like | 0 | 2.01 | 20 | -17.99 |

### Trades During Period
| Date | Action | Instrument | Amount CHF | Reason |
|---|---|---|---:|---|
| 2026-05-29 12:15:33 | buy | UBS SLI ETF (SMI gleichgewichtet) | 4908 | Portfolio-approved transmitted live broker order submitted.; funding source available_cash; Transmitted live order path used; confirm broker acknowledgement and reconcile status promptly.; Operator resync refreshed open broker order state. |
| 2026-05-29 12:15:32 | buy | iShares MSCI EM Asia UCITS ETF (Acc) | 7700.95 | Portfolio-approved transmitted live broker order submitted.; funding source available_cash; Transmitted live order path used; confirm broker acknowledgement and reconcile status promptly.; Operator resync refreshed open broker order state. |
| 2026-05-29 10:13:12 | buy | UBS SLI ETF (SMI gleichgewichtet) | 4912.2 | Portfolio-approved transmitted live broker order submitted.; funding source available_cash; Transmitted live order path used; confirm broker acknowledgement and reconcile status promptly.; Broker order acknowledged but marked Inactive. The price does not conform to the minimum price variation for this contract. |
| 2026-05-29 10:13:10 | buy | iShares MSCI EM Asia UCITS ETF (Acc) | 7706.75 | Portfolio-approved transmitted live broker order submitted.; funding source available_cash; Transmitted live order path used; confirm broker acknowledgement and reconcile status promptly.; Broker order acknowledged but marked Inactive. The price does not conform to the minimum price variation for this contract. |
| 2026-05-29 10:07:44 | buy | HSBC MSCI China UCITS ETF USD | 5299.56 | Portfolio-approved transmitted live broker order submitted.; Transmitted live order path used; confirm broker acknowledgement and reconcile status promptly.; Operator resync refreshed open broker order state.; Broker order acknowledged but marked Inactive. The price does not conform to the minimum price variation for this contract. |

### Strategy Compliance
- On strategy: yes, draft state matches approved dry-run plan
- Rebalance needed: no
- Risk limits breached: no
- Broker readiness: Interactive Brokers connectivity is available, but broker-backed pricing is not yet yielding a usable live/delayed quote posture.
- In-flight orders: no

### Freshness
- Dashboard stale: no
- Dashboard file present: yes
- Newest source file: portfolio/etf/history.md

### Delivery Status
- Delivery mode: email_and_repo
- Intended channels: repo_artifacts, email
- External delivery enabled: yes
- Failure alert mode: local_operator_review
- Failure alert targets: dashboard, markdown_report, report_cycle_json
- Policy override loaded: yes
- Delivery readiness: needs_operator_attention

### Operator Queue Summary
- Total queue items: 1
- Blocking items: 0
- Approval items: 0
- Fresh actionable approvals: 0
- Stale approvals needing reapproval: 0
- Execution items: 0
- Open-runner first handoffs: 0
- Open-runner retries: 0
- Recovery items: 0
- Delivery items: 0
- Data items: 0
- Warning items: 0
- Workflow items: 1

### Pending Operator Actions
1. [workflow/pending/low] Report rendering used fallback handling (render mode rendered).

### Operator State
- Broker automation paused: no
- Consecutive broker errors: 0
- Last broker error reason: none

### Generation Status
- Markdown written: yes
- PDF mode: rendered
- PDF written: yes
- HTML fallback written: yes
- Render warning: render mode rendered

### Execution Lifecycle
- Proposed: 0
- Approved: 0
- Rejected: 0
- Staged: 0
- Submitted: 0
- Partially filled: 0
- Filled: 2
- Cancelled: 0
- Failed: 0
- Rows with broker order id: 11

### Execution Plan
- CASH-CHF: action hold, quantity 0, limit 0, executable CHF 2024.13, target 5%
- Totals: executable CHF 2024.13, intended CHF 2024.13, gap CHF 0

### What Worked
- The dry-run portfolio state, trade log, dashboard, and execution lifecycle summary are consistent enough to review as one workflow.

### What Did Not Work
- Interactive Brokers connectivity is available, but broker-backed pricing is not yet yielding a usable live/delayed quote posture.
