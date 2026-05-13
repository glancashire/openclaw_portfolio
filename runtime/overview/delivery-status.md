# Delivery & Alerting Status

- Generated at: 2026-05-13T13:20:15.794Z
- Portfolios: 2
- All ready: no

## Per-Portfolio Delivery Posture

### acceptance-closure
- Delivery mode: local_only
- Channels: repo_artifacts
- External delivery: disabled
- Failure alert mode: local_operator_review
- Alert targets: dashboard, markdown_report, report_cycle_json
- Policy override loaded: yes
- Ready: no
- Pending actions:
  - Dashboard/report freshness is stale relative to source state.
  - 1 reconciled fill(s) still need notification backfill review.

### etf
- Delivery mode: local_only
- Channels: repo_artifacts
- External delivery: disabled
- Failure alert mode: local_operator_review
- Alert targets: dashboard, markdown_report, report_cycle_json
- Policy override loaded: yes
- Ready: no
- Pending actions:
  - Dashboard/report freshness is stale relative to source state.
  - 1 reconciled fill(s) still need notification backfill review.
- Broker block context:
  - Count: 1
  - Top block: [quote_unavailable] CH0032912732 — UBS SLI ETF (SMI gleichgewichtet)
  - Reason: No broker quote was available during market-open execution.
  - Next action: Restore broker pricing and rerun the market-open submission path.
