# Phase 112 — Operator Incident Verification Hardening

_Last updated: 2026-05-10 14:02 UTC_

## Goal

Promote operator incident and recovery surfaces into the canonical repo verification path so runbook-oriented operational outputs are tested as first-class artifacts.

## Why this phase matters

The repo already contains useful operator-facing incident surfaces:
- `docs/operator-runbooks.md`
- `scripts/operator-incident-summary.js`
- per-portfolio recovery checklist artifacts

But the current repo verification path still focuses mainly on execution, reporting, and policy contracts. That leaves a small but real QA blind spot: operator incident/recovery tools can drift without failing `npm test`.

## Scope

1. Verify the operator incident summary CLI as part of repo-level verification.
2. Add a lightweight contract test for the operator runbook document.
3. Keep verification deterministic and safe in the current blocked/non-live posture.
4. Avoid widening permissions or changing live execution behavior.

## Non-goals

- no live execution changes
- no broker config changes
- no runbook redesign beyond what is needed for a stable contract
- no artifact strategy migration

## Intended outputs

- focused runbook contract test
- operator incident summary included in canonical repo verification
- full repo verification still passing

## Done criteria

This phase is done when:
- repo verification exercises the operator incident summary surface
- repo verification enforces a minimal operator runbook contract
- all tests pass in the current safe posture
