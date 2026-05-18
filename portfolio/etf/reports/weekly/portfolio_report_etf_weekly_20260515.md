# Portfolio Report: etf

## Period
- Report type: weekly
- Period start: 2026-05-15
- Period end: 2026-05-15
- Generated: 2026-05-15T11:02:55.004Z

## Decision View

### Executive Summary
Latest snapshot: CHF 5327.0300003 total and CHF 116.64 cash. No in-flight execution states are currently pending. Dashboard freshness is current against the tracked source files. Broker readiness is degraded: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. Rendering required a fallback: render mode rendered Reporting delivery posture needs operator attention (2 pending item(s)).

### Incident / Blocker Summary
- Broker readiness degraded: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions.

### What Changed Since Last Report
- Portfolio value change since previous report: CHF 5327.03
- Cash change since previous report: CHF -4883.36
- Proposed trade delta: -6
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
| Start value CHF | 5327.0300003 |
| End value CHF | 5327.0300003 |
| Change CHF | 0 |
| Change % | 0 |

### Allocation Review
| Asset class | Start % | End % | Target % | Drift % |
|---|---:|---:|---:|---:|
| Global equities | 0 | 33.67 | 60 | -26.33 |
| Swiss equities | 0 | 0 | 20 | -20 |
| Bonds / cash-like | 0 | 2.19 | 20 | -17.81 |

### Trades During Period
| Date | Action | Instrument | Amount CHF | Reason |
|---|---|---|---:|---|
| 2026-05-13 16:31:40 | hold | CHF cash balance | 116.64 | Keep this portion in CHF cash to satisfy the defensive sleeve without placing an order.; allocation before 2.19%; target 20%; allocation after 4.38%; drift before -17.81%; drift after -15.62%; drift corrected 2.19%; expected cost CHF 116.64; funding source cash; Planning entry only; no broker order required for the cash sleeve. |
| 2026-05-13 14:27:32 | buy | UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc | 1899.6 | Deploy available cash toward underweight Global equities using UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc. Whole-share sizing leaves CHF 34.20 unallocated for this leg.; Market-open live submission attempted.; Execution reconciliation: broker status Filled, order id 9115, filled 50, remaining 0, avg fill 39.575, last fill 39.575, exec id 00020f63.6a048cf3.01.01, executed at 2026-05-13T14:29:17+00:00 |
| 2026-05-13 13:57:43 | buy | UBS SLI ETF (SMI gleichgewichtet) | 1273.44 | Deploy available cash toward underweight Swiss equities using UBS SLI ETF (SMI gleichgewichtet). Live broker-priced order for 8 shares at ask-derived limit 159.2 CHF. Broker acknowledged live submitted order permId 1431009902.; Execution reconciliation: broker status Filled, order id 9113, filled 8, remaining 0, avg fill 159.2, last fill 159.2, exec id 00028f0a.6a040521.01.01, executed at 2026-05-13T14:07:17+00:00 |
| 2026-05-13 13:57:43 | buy | UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc | 909.65 | Deploy available cash toward underweight Global equities using UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc. Live broker-priced order for 23 shares at ask-derived limit 39.52 EUR. Broker acknowledged live submitted order permId 1431009903.; Execution reconciliation: broker status Submitted, order id 9114, filled 0, remaining 23; Execution reconciliation: broker status Filled, order id 9114, filled 23, remaining 0, avg fill 39.52, last fill 39.52, exec id 00028f0a.6a04052d.01.01, executed at 2026-05-13T14:12:10+00:00 |
| 2026-05-13 13:57:43 | buy | State Street SPDR S&P 500 UCITS ETF USD Unhedged (Acc) | 1793.79 | Deploy available cash toward underweight Global equities using State Street SPDR S&P 500 UCITS ETF USD Unhedged (Acc).; allocation before 20.36%; target 40%; allocation after 55.65%; drift before -39.64%; drift after 15.65%; drift corrected 23.99%; expected cost CHF 1793.79; funding source cash; Dry-run instrument proposal only; No draft price available yet. |

### Strategy Compliance
- On strategy: yes, draft state matches approved dry-run plan
- Rebalance needed: yes
- Risk limits breached: no
- Broker readiness: Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions.
- In-flight orders: no

### Freshness
- Dashboard stale: no
- Dashboard file present: yes
- Newest source file: portfolio/etf/history.md

### Delivery Status
- Delivery mode: local_only
- Intended channels: repo_artifacts
- External delivery enabled: no
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
- Proposed: 1
- Approved: 0
- Rejected: 0
- Staged: 0
- Submitted: 0
- Partially filled: 0
- Filled: 2
- Cancelled: 0
- Failed: 0
- Rows with broker order id: 2

### Execution Plan
- IE000XZSV718: action buy, quantity 0, limit 0, executable CHF 1793.79, target 0%
- CASH-CHF: action hold, quantity 0, limit 0, executable CHF 116.64, target 20%
- Totals: executable CHF 1910.43, intended CHF 1910.43, gap CHF 0

### What Worked
- The dry-run portfolio state, trade log, dashboard, and execution lifecycle summary are consistent enough to review as one workflow.

### What Did Not Work
- Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions.
