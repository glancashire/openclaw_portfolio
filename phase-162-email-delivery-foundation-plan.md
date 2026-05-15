# Phase 162 — Email delivery foundation and policy integration

## Goal
Create a canonical, testable email-delivery foundation for this repo that upgrades the current local-only reporting posture into an explicit opt-in email-capable delivery lane for dashboard overviews and order-fill confirmations, while preserving safety gates and keeping external delivery disabled unless configuration is complete and intentional.

## Why this phase
The repo already contains older Mailgun-based email helpers and trade-fill notification scripts, but they are disconnected from the current `src/reporting/*` delivery posture, the canonical `trade.js` surfaces, and the repo delivery policy. Right now report generation only writes local artifacts and does not represent a real outbound email capability. Before enabling email, the codebase needs one canonical email transport + policy layer so delivery state is truthful and auditable.

## Scope
- Inspect and stabilize existing Mailgun/email helpers for reuse.
- Add a canonical email transport module/interface for outbound delivery.
- Extend delivery policy to support an explicit email mode with recipient configuration while remaining safe by default.
- Add readiness/diagnostic logic that distinguishes:
  - local-only mode
  - email-configured but disabled
  - email-enabled and ready
  - email-enabled but blocked by missing configuration or pending delivery issues
- Add focused tests for policy resolution and readiness classification.
- Keep actual live sends opt-in and separately verified.

## Non-goals
- No hidden automatic sending without explicit config.
- No SMTP/provider sprawl; reuse the existing Mailgun path unless that proves broken.
- No broker execution behavior changes in this phase.
- No broad scheduling/cron wiring in this phase.

## Design notes
- Treat email delivery as a policy-controlled external side effect.
- Keep the default policy non-sending for safety and testability.
- Centralize recipient resolution instead of hard-coding `lancashire@swift.ch` across scripts.
- Ensure diagnostics explain exactly why email is or is not ready.

## Verification plan
- Add focused tests for policy parsing and readiness classification.
- Re-run existing delivery/reporting regression checks.
- Confirm local-only remains default-safe.
