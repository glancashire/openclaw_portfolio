# Delivery & Alerting Status

- Generated at: 2026-06-15T12:08:37.002Z
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
  - Count: 21
  - Top block: [contract_resolution_failed] CH0032912732 — UBS SLI ETF (SMI gleichgewichtet)
  - Reason: Broker rejected the order because the contract identity or venue resolution was not accepted.
  - Next action: Verify conid, symbol, exchange, and primary exchange before retrying.

## Host delivery posture

- Telegram chat channel has no chat-id target on this host; cron `announce` delivery always reports `no route, will fail-closed`.
- All cron jobs carry `bestEffort:true`, so this delivery failure does **not** corrupt cron state.
- **Email is the working operator channel.** Reports and digests reach Graham via Mailgun (`lancashire@swift.ch`).
- Reference: `docs/operations/cron.md`.
