# Portfolio Report: etf

## Period
- Report type: weekly
- Period start: 2026-07-24
- Period end: 2026-07-24
- Generated: 2026-07-24T17:20:12.679Z

## Decision View

### Executive Summary
Latest snapshot: CHF 151827.73128482996 total and CHF 150000 cash. No in-flight execution states are currently pending. Dashboard freshness is current against the tracked source files. Broker readiness is degraded: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. Detail: connect ECONNREFUSED 127.0.0.1:4001 Rendering required a fallback: render mode rendered Reporting delivery posture needs operator attention (1 pending item(s)).

### Incident / Blocker Summary
- Broker readiness degraded: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. Detail: connect ECONNREFUSED 127.0.0.1:4001

### What Changed Since Last Report
- Portfolio value change since previous report: CHF 151827.73
- Cash change since previous report: CHF 0.00
- Proposed trade delta: +0
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
| Start value CHF | 151827.73128482996 |
| End value CHF | 151827.73128482996 |
| Change CHF | 0 |
| Change % | 0 |

### Allocation Review
| Asset class | Start % | End % | Target % | Drift % |
|---|---:|---:|---:|---:|
| Global equities | 0 | 0 | 60 | -60 |
| Swiss equities | 0 | 0 | 20 | -20 |
| Bonds / cash-like | 0 | 1.33 | 20 | -18.67 |

### Trades During Period
| Date | Action | Instrument | Amount CHF | Reason |
|---|---|---|---:|---|
| 2026-06-15 11:43:57 | buy | SPDR Russell 2000 US Small Cap UCITS ETF | 2084.48 | Portfolio-approved transmitted live broker order submitted.; funding source available_cash; Transmitted live order path used; confirm broker acknowledgement and reconcile status promptly.; Execution reconciliation: broker status Filled, order 9173, 32 @ 65.1357, execId 00015269.6a2fbcef.01.01. |
| 2026-06-15 11:35:27 | buy | SPDR Russell 2000 US Small Cap UCITS ETF | 2085.44 | Portfolio-approved transmitted live broker order submitted.; funding source available_cash; Transmitted live order path used; confirm broker acknowledgement and reconcile status promptly.; Broker order acknowledged but marked Inactive. The price does not conform to the minimum price variation for this contract. |
| 2026-06-05 08:56:30 | buy | iShares Global Clean Energy Transition UCITS ETF | 1643.02 | Portfolio-approved transmitted live broker order submitted.; Transmitted live order path used; confirm broker acknowledgement and reconcile status promptly.; Execution reconciliation: broker status Filled, order id 9171, filled 57, remaining 0, avg fill 28.825, last fill 28.825, exec id 00020f63.6a228760.01.01, executed at 2026-06-05T08:56:30+00:00; Broker order acknowledged but marked Inactive. The price does not conform to the minimum price variation for this contract. |
| 2026-06-05 08:56:28 | buy | VanEck Uranium and Nuclear Technologies UCITS ETF | 2990.3 | Portfolio-approved transmitted live broker order submitted.; Transmitted live order path used; confirm broker acknowledgement and reconcile status promptly.; Execution reconciliation: broker status Filled, order id 9170, filled 63, remaining 0, avg fill 47.465, last fill 47.465, exec id 00020f63.6a22875a.01.01, executed at 2026-06-05T08:56:28+00:00; Broker order acknowledged but marked Inactive. The price does not conform to the minimum price variation for this contract. |
| 2026-06-05 08:56:26 | buy | Xtrackers MSCI World Energy UCITS ETF 1C | 4936.8 | Portfolio-approved transmitted live broker order submitted.; Transmitted live order path used; confirm broker acknowledgement and reconcile status promptly.; Execution reconciliation: broker status Filled, order id 9169, filled 80, remaining 0, avg fill 61.69, last fill 61.69, exec id 00020f63.6a228754.01.01, executed at 2026-06-05T08:56:26+00:00; Broker order acknowledged but marked Inactive. The price does not conform to the minimum price variation for this contract. |

### Strategy Compliance
- On strategy: yes, draft state matches approved dry-run plan
- Rebalance needed: no
- Risk limits breached: no
- Broker readiness: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. Detail: connect ECONNREFUSED 127.0.0.1:4001
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
- Filled: 1
- Cancelled: 0
- Failed: 0
- Rows with broker order id: 21

### Execution Plan
- CASH-CHF: action hold, quantity 0, limit 0, executable CHF 2024.13, target 3%
- Totals: executable CHF 2024.13, intended CHF 2024.13, gap CHF 0

### What Worked
- The dry-run portfolio state, trade log, dashboard, and execution lifecycle summary are consistent enough to review as one workflow.

### What Did Not Work
- Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. Detail: connect ECONNREFUSED 127.0.0.1:4001
