# Portfolio Report: etf

## Period
- Report type: monthly
- Period start: 2026-05-01
- Period end: 2026-05-22
- Generated: 2026-05-22T10:15:24.745Z

## Decision View

### Executive Summary
Latest snapshot: CHF 9886.91 total and CHF 20841.44 cash. No in-flight execution states are currently pending. Dashboard freshness is current against the tracked source files. Broker readiness is Interactive Brokers read-only connectivity and live/realtime market data are available.. Rendering required a fallback: render mode rendered Reporting delivery posture needs operator attention (1 pending item(s)).

### Incident / Blocker Summary
- No active incidents or blockers are currently surfaced.

### What Changed Since Last Report
- Portfolio value change since previous report: CHF 9886.91
- Cash change since previous report: CHF 20841.44
- Proposed trade delta: +5
- Approved trade delta: +0
- In-flight execution delta: +0
- Queue item delta: +1
- Blocking item delta: +0

### Recommendation Urgency
- Current urgency: MEDIUM

### Recommended Changes
- [MEDIUM] Recommendation: Clear the reporting pending-action list or explicitly accept the degraded local-only posture before wider operational use.

### Next Actions
- [MEDIUM] Next action: Approve or revise the current dry-run order set, then validate live read-only broker connectivity.

## Audit Detail

### Performance
| Metric | Value |
|---|---:|
| Start value CHF | 9886.91 |
| End value CHF | 9886.91 |
| Change CHF | 0 |
| Change % | 0 |

### Allocation Review
| Asset class | Start % | End % | Target % | Drift % |
|---|---:|---:|---:|---:|
| Global equities | 0 | 152.78 | 60 | 92.78 |
| Swiss equities | 0 | 9.82 | 20 | -10.18 |
| Bonds / cash-like | 0 | 20.47 | 20 | 0.47 |

### Trades During Period
| Date | Action | Instrument | Amount CHF | Reason |
|---|---|---|---:|---|
| 2026-05-22 08:41:00 | buy | UBS SPI Mid ETF (SPI ohne SMI) | 2441.5 | Rebalance using broker cash as part of the portfolio; live-priced sizing against the combined portfolio, preserving Swiss split. |
| 2026-05-22 08:41:00 | buy | UBS SLI ETF (SMI gleichgewichtet) | 971.04 | Rebalance using broker cash as part of the portfolio; live-priced sizing against the combined portfolio, preserving Swiss split. |
| 2026-05-22 08:41:00 | buy | UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc | 234.89 | Rebalance using broker cash as part of the portfolio; live-priced sizing against the combined portfolio, preserving Swiss split. |
| 2026-05-22 08:41:00 | buy | iShares Core S&P 500 UCITS ETF USD (Acc) | 10635.57 | Rebalance using broker cash as part of the portfolio; live-priced sizing against the combined portfolio, preserving Swiss split. |
| 2026-05-21 14:41:06 | buy | iShares Core S&P 500 UCITS ETF USD (Acc) | 1322.4 | Scoped retry attempt for SXR8 after operator reported IBKR permissions enabled; retry allowed only for non-fill, non-policy failure if route validates cleanly.; Market-open live submission attempted.; Execution reconciliation: broker status Filled, order id 9123, filled 2, remaining 0, avg fill 687.18, last fill 687.18, exec id 00020f63.6a0ef76c.01.01, executed at 2026-05-21T14:43:59+00:00 |

### Strategy Compliance
- On strategy: yes, draft state matches approved dry-run plan
- Rebalance needed: yes
- Risk limits breached: no
- Broker readiness: Interactive Brokers read-only connectivity and live/realtime market data are available.
- In-flight orders: no

### Freshness
- Dashboard stale: no
- Dashboard file present: yes
- Newest source file: portfolio/etf/trades.md

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
- Proposed: 5
- Approved: 0
- Rejected: 0
- Staged: 0
- Submitted: 0
- Partially filled: 0
- Filled: 0
- Cancelled: 0
- Failed: 0
- Rows with broker order id: 1

### Execution Plan
- CH0032912732: action buy, quantity 6, limit 161.84, executable CHF 971.04, target 12%
- CASH-CHF: action hold, quantity 0, limit 0, executable CHF 2024.13, target 20%
- IE000XZSV718: action buy, quantity 0, limit 0, executable CHF 1793.79, target 0%
- LU0950668870: action buy, quantity 6, limit 40.78, executable CHF 234.89, target 20%
- IE00B5BMR087: action buy, quantity 16, limit 692.42, executable CHF 10635.57, target 40%
- CH0130595124: action buy, quantity 19, limit 128.5, executable CHF 2441.5, target 8%
- Totals: executable CHF 18100.92, intended CHF 18100.92, gap CHF 0

### What Worked
- The dry-run portfolio state, trade log, dashboard, and execution lifecycle summary are consistent enough to review as one workflow.

### What Did Not Work
- Report rendering required fallback handling: render mode rendered
