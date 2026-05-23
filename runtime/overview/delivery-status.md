# Delivery & Alerting Status

- Generated at: 2026-05-23T16:50:33.157Z
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
  - Count: 6
  - Top block: [contract_resolution_failed] CH0032912732 — CH0032912732
  - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
  - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.
