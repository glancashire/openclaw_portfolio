# Phase 163 — Email delivery execution for summaries and fill confirmations

## Goal
Wire the new canonical email-delivery policy layer into the actual reporting and trading surfaces so dashboard overviews and order-fill confirmations can be sent through one governed path when — and only when — email delivery is explicitly enabled and ready.

## Scope
- Add canonical report-email composition helpers for dashboard/summary delivery.
- Add a reusable delivery executor that can:
  - skip safely when policy is local-only,
  - explain why email is blocked when config/readiness is incomplete,
  - send report emails when email delivery is ready.
- Integrate report-cycle / summary-generation surfaces with the canonical email executor.
- Reconnect trade-fill notification email to the canonical policy/transport layer instead of ad-hoc recipient defaults.
- Add focused CLI and integration tests for:
  - local-only no-send behavior,
  - email-ready send path using stubs,
  - fill notification path using policy-driven recipients.

## Non-goals
- No automatic broad cron/scheduler rollout in this phase.
- No silent enabling of email in repo config.
- No live broker execution changes.

## Safety notes
- Real email remains opt-in and policy-gated.
- Tests should stub outbound sending and prove behavior without external network dependency.
- The implementation should surface delivery outcomes in machine-readable results for auditability.

## Verification plan
- Add unit/integration tests around the canonical email executor.
- Re-run delivery/reporting CLI tests and structured artifact checks.
- Verify trade notification path respects policy-driven recipients and skip/send behavior.
