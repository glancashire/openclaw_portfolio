# Phase 113 — Effective Config Diagnostic Surface

_Last updated: 2026-05-10 21:00 UTC_

## Goal

Add one canonical operator-facing effective-config diagnostic surface for Interactive Brokers and portfolio execution policy, then verify it through the repo test path.

## Why this phase matters

The repo already has:
- Interactive Brokers config loading/validation helpers
- readiness checks
- execution-authority evaluation
- system policy documentation

But operators still lack one compact, machine-readable diagnostic that answers:
- what broker mode/config is effectively loaded?
- is config structurally valid?
- what execution posture and account reference are in effect?
- what live-execution policy constraints apply right now?

This phase closes that small but important observability gap without changing any live permissions.

## Scope

1. Add a canonical effective-config diagnostic module/surface.
2. Include broker config status, redacted broker config, execution mode, account reference, and execution authority summary.
3. Add a focused test for the effective-config surface.
4. Add the test to canonical repo verification.

## Non-goals

- no broker permission widening
- no secret exposure
- no live execution enablement
- no gateway/OpenClaw config mutation

## Intended outputs

- effective-config diagnostic helper/module
- CLI or command-facing diagnostic surface
- focused verification test
- repo verification coverage

## Done criteria

This phase is done when:
- the repo has one stable effective-config diagnostic surface
- the surface redacts secrets and reports structural config truth
- focused tests pass
- full repo verification passes
