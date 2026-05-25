# Phase 167 — Live fill-delivery observability and state-surface unification

## Goal
Tighten the live email operating posture by making fill-notification status easier to audit across CLI, health, and reporting surfaces, while removing remaining duplicate fill-state readers so all operator-facing views report the same underlying truth.

## Scope
- Replace remaining ad-hoc fill-notification state readers with the canonical shared helper.
- Extend CLI/status surfaces to show acknowledged backfills alongside notified and pending-backfill fills.
- Add focused tests for CLI/state output shape and shared-state loading.
- Re-run delivery/health/dashboard regressions to confirm the unified state model stays consistent.
- Optionally run a live status surface command for evidence if it materially validates the phase.

## Non-goals
- No new scheduler rollout.
- No bulk historical resends.
- No broker execution behavior changes.

## Verification plan
- Add tests covering shared fill-state reporting across CLI/health/reporting surfaces.
- Re-run focused delivery/health/dashboard regressions.
- Run one real status/reporting command to confirm operator-facing output matches the canonical state.
