# Delivery & Alerting Status

- Generated at: 2026-05-17T08:13:30.111Z
- Portfolios: 2
- All ready: no

## Per-Portfolio Delivery Posture

### acceptance-closure
- Delivery mode: email_and_repo
- Channels: repo_artifacts, email
- External delivery: enabled
- Failure alert mode: local_operator_review
- Alert targets: dashboard, markdown_report, report_cycle_json
- Policy override loaded: yes
- Ready: no
- Pending actions:
  - Dashboard/report freshness is stale relative to source state.

### etf
- Delivery mode: email_and_repo
- Channels: repo_artifacts, email
- External delivery: enabled
- Failure alert mode: local_operator_review
- Alert targets: dashboard, markdown_report, report_cycle_json
- Policy override loaded: yes
- Ready: yes
- Pending actions:
  - None
- Broker block context:
  - Count: 1
  - Top block: [quote_unavailable] CH0032912732 — UBS SLI ETF (SMI gleichgewichtet)
  - Reason: No broker quote was available during market-open execution.
  - Next action: Restore broker pricing and rerun the market-open submission path.
