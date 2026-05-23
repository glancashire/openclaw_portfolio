# Portfolio Report: etf

## Period
- Report type: weekly
- Period start: 2026-05-23
- Period end: 2026-05-23
- Generated: 2026-05-23T00:57:53.800Z

## Decision View

### Executive Summary
Latest snapshot: CHF 22209.4831212 total and CHF 0 cash. No in-flight execution states are currently pending. Dashboard freshness is current against the tracked source files. Broker readiness is degraded: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. Detail: connect ECONNREFUSED 127.0.0.1:4001 Rendering required a fallback: render mode rendered Reporting delivery posture needs operator attention (1 pending item(s)).

### Incident / Blocker Summary
- Broker readiness degraded: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. Detail: connect ECONNREFUSED 127.0.0.1:4001

### What Changed Since Last Report
- Portfolio value change since previous report: CHF 22209.48
- Cash change since previous report: CHF -116.64
- Proposed trade delta: -1
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
| Start value CHF | 22209.4831212 |
| End value CHF | 22209.4831212 |
| Change CHF | 0 |
| Change % | 0 |

### Allocation Review
| Asset class | Start % | End % | Target % | Drift % |
|---|---:|---:|---:|---:|
| Global equities | 0 | 0 | 60 | -60 |
| Swiss equities | 0 | 0 | 20 | -20 |
| Bonds / cash-like | 0 | 9.11 | 20 | -10.89 |

### Trades During Period
| Date | Action | Instrument | Amount CHF | Reason |
|---|---|---|---:|---|
| 2026-05-22 12:59:21 | buy | UBS SPI Mid ETF (SPI ohne SMI) | 2427.44 | Portfolio-approved transmitted live broker order submitted.; funding source available_cash; Transmitted live order path used; confirm broker acknowledgement and reconcile status promptly.; Broker order acknowledged but marked Inactive. The price does not conform to the minimum price variation for this contract. |
| 2026-05-22 12:38:13 | buy | UBS SPI Mid ETF (SPI ohne SMI) | 2441.5 | Portfolio-approved transmitted live broker order submitted.; Transmitted live order path used; confirm broker acknowledgement and reconcile status promptly.; Broker order acknowledged but marked Inactive. Order rejected - reason:Available settled cash converted to base: 9381.22 CHF Cash needed for this order and other pending orders: <br>11268.94 CHF; Broker order acknowledged but marked Inactive. The price does not conform to the minimum price variation for this contract. |
| 2026-05-22 11:00:07 | buy | CH0032912732 | 0 | basket fill; Broker order acknowledged but marked Inactive. Order rejected - reason:Available settled cash converted to base: 9381.22 CHF Cash needed for this order and other pending orders: <br>11268.94 CHF; Broker order acknowledged but marked Inactive. The price does not conform to the minimum price variation for this contract. |
| 2026-05-22 11:00:07 | buy | LU0950668870 | 0 | basket fill; Broker order acknowledged but marked Inactive. Order rejected - reason:Available settled cash converted to base: 9381.22 CHF Cash needed for this order and other pending orders: <br>11268.94 CHF; Broker order acknowledged but marked Inactive. The price does not conform to the minimum price variation for this contract. |
| 2026-05-22 11:00:07 | buy | IE00B5BMR087 | 0 | basket fill; Broker order acknowledged but marked Inactive. Order rejected - reason:Available settled cash converted to base: 9381.22 CHF Cash needed for this order and other pending orders: <br>11268.94 CHF; Broker order acknowledged but marked Inactive. The price does not conform to the minimum price variation for this contract. |

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
- Filled: 0
- Cancelled: 0
- Failed: 0
- Rows with broker order id: 6

### Execution Plan
- CASH-CHF: action hold, quantity 0, limit 0, executable CHF 2024.13, target 20%
- Totals: executable CHF 2024.13, intended CHF 2024.13, gap CHF 0

### What Worked
- The dry-run portfolio state, trade log, dashboard, and execution lifecycle summary are consistent enough to review as one workflow.

### What Did Not Work
- Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. Detail: connect ECONNREFUSED 127.0.0.1:4001
