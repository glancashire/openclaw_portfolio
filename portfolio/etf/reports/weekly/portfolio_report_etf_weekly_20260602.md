# Portfolio Report: etf

## Period
- Report type: weekly
- Period start: 2026-06-02
- Period end: 2026-06-02
- Generated: 2026-06-02T09:31:13.458Z

## Decision View

### Executive Summary
Latest snapshot: CHF 100973.85858176001 total and CHF 0 cash. No in-flight execution states are currently pending. Dashboard freshness is current against the tracked source files. Broker readiness is Interactive Brokers read-only connectivity and live/realtime market data are available.. Rendering required a fallback: render mode rendered Reporting delivery posture needs operator attention (1 pending item(s)).

### Incident / Blocker Summary
- No active incidents or blockers are currently surfaced.

### What Changed Since Last Report
- Portfolio value change since previous report: CHF 100973.86
- Cash change since previous report: CHF 0.00
- Proposed trade delta: +0
- Approved trade delta: +0
- In-flight execution delta: +0
- Queue item delta: +0
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
| Start value CHF | 100973.85858176001 |
| End value CHF | 100973.85858176001 |
| Change CHF | 0 |
| Change % | 0 |

### Allocation Review
| Asset class | Start % | End % | Target % | Drift % |
|---|---:|---:|---:|---:|
| Global equities | 0 | 0 | 60 | -60 |
| Swiss equities | 0 | 0 | 20 | -20 |
| Bonds / cash-like | 0 | 2 | 20 | -18 |

### Trades During Period
| Date | Action | Instrument | Amount CHF | Reason |
|---|---|---|---:|---|
| 2026-06-02 07:08:36 | buy | iShares MSCI Global Semiconductors UCITS ETF USD (Acc) | 1001.16 | Portfolio-approved transmitted live broker order submitted.; funding source available_cash; Transmitted live order path used; confirm broker acknowledgement and reconcile status promptly.; Operator resync refreshed open broker order state. |
| 2026-06-02 07:08:34 | buy | UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc | 1859.17 | Portfolio-approved transmitted live broker order submitted.; funding source available_cash; Transmitted live order path used; confirm broker acknowledgement and reconcile status promptly.; Operator resync refreshed open broker order state. |
| 2026-06-02 07:08:22 | buy | iShares Core S&P 500 UCITS ETF USD (Acc) | 2103.9 | Portfolio-approved transmitted live broker order submitted.; funding source available_cash; Transmitted live order path used; confirm broker acknowledgement and reconcile status promptly.; Operator resync refreshed open broker order state. |
| 2026-06-02 07:08:20 | buy | Xtrackers Artificial Intelligence & Big Data UCITS ETF 1C | 5049.65 | Portfolio-approved transmitted live broker order submitted.; funding source available_cash; Transmitted live order path used; confirm broker acknowledgement and reconcile status promptly.; Operator resync refreshed open broker order state. |
| 2026-06-02 07:08:18 | buy | iShares AI Infrastructure UCITS ETF USD (Acc) | 5195.32 | Portfolio-approved transmitted live broker order submitted.; funding source available_cash; Transmitted live order path used; confirm broker acknowledgement and reconcile status promptly.; Operator resync refreshed open broker order state. |

### Strategy Compliance
- On strategy: yes, draft state matches approved dry-run plan
- Rebalance needed: no
- Risk limits breached: no
- Broker readiness: Interactive Brokers read-only connectivity and live/realtime market data are available.
- In-flight orders: no

### Freshness
- Dashboard stale: no
- Dashboard file present: yes
- Newest source file: /home/ubuntu/.openclaw/workspace/portfolio/etf/holdings.md

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
- Filled: 7
- Cancelled: 0
- Failed: 0
- Rows with broker order id: 13

### Execution Plan
- CASH-CHF: action hold, quantity 0, limit 0, executable CHF 2024.13, target 5%
- Totals: executable CHF 2024.13, intended CHF 2024.13, gap CHF 0

### What Worked
- The dry-run portfolio state, trade log, dashboard, and execution lifecycle summary are consistent enough to review as one workflow.

### What Did Not Work
- Report rendering required fallback handling: render mode rendered
