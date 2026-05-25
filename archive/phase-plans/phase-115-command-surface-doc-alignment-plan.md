# Phase 115 — Command Surface Documentation Alignment

_Last updated: 2026-05-10 21:35 UTC_

## Goal

Align the operator-facing execution command documentation with the current canonical `trade.js` diagnostic surfaces so operators and future agents can discover the real command surface from docs alone.

## Why this phase matters

The repo now has canonical operator diagnostics for:
- live preflight
- execution authority
- effective config
- delivery posture

But `docs/execution-command-surface.md` still does not reflect the full current diagnostic surface. That creates avoidable operator confusion and increases the chance that newer truth surfaces drift out of discoverability.

## Scope

1. Audit `docs/execution-command-surface.md` against current `scripts/trade.js` help and behavior.
2. Update the doc to include all current canonical diagnostic commands.
3. Add a focused contract test for the documented command surface.
4. Add that test to repo verification.

## Non-goals

- no command behavior changes beyond what documentation/testing requires
- no new execution capabilities
- no changes to live-execution policy

## Done criteria

This phase is done when:
- `docs/execution-command-surface.md` reflects the canonical diagnostic commands
- a focused contract test enforces the documentation surface
- full repo verification passes
