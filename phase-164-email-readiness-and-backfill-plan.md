# Phase 164 — Email readiness hardening and fill-backfill operator controls

## Goal
Harden the repo’s email-ready posture by turning reconciled fill-notification backlog into an explicit operator workflow with state transitions, CLI support, and truthful readiness reporting, so real email can be enabled without ambiguity or repeated/manual drift.

## Why this phase
Current delivery readiness is blocked by `runtime/fill-notifications-state.json` containing unresolved `reconciledUnnotifiedFills`. The repo can now route email through the canonical policy layer, but it still lacks a clean operator mechanism to resolve historical or manually handled fill notifications. Without that, “email ready” would be misleading.

## Scope
- Extend fill-notification state to distinguish:
  - notified fills,
  - reconciled-unnotified fills awaiting review,
  - manually acknowledged/backfilled fills.
- Add a CLI to review/acknowledge backfilled fills explicitly.
- Update delivery readiness/diagnostics to reflect acknowledged backfills truthfully.
- Add focused tests for state transitions and readiness clearing.
- Apply the workflow to the current repo state if safe and deterministic.

## Non-goals
- No hidden automatic mutation of historical delivery records beyond the explicit operator action/CLI.
- No silent enabling of email mode in this phase unless readiness is truly clear and config supports it.
- No broad scheduler rollout yet.

## Verification plan
- Add tests for backfill acknowledgement state transitions.
- Re-run delivery readiness and dashboard dedupe checks.
- Verify readiness clears when the backlog is explicitly acknowledged.
