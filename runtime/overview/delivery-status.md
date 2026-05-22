# Delivery & Alerting Status

- Generated at: 2026-05-22T10:23:16.350Z
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
  - Top block: [broker_submit_rejected] IE00B5BMR087 — iShares Core S&P 500 UCITS ETF USD (Acc)
  - Reason: Broker rejected or inactivated the order: Order rejected - reason:Not allowed to open a position: no trading permission. You may need to add the appropriate trading permission <br>through Client Portal.
  - Next action: Review the broker rejection reason and correct the order before retrying.
