# Phase 117 — Trading Workflow Documentation Alignment

_Last updated: 2026-05-10 21:59 UTC_

## Goal

Align `docs/trading-workflow.md` with the current canonical diagnostic and execution command surface so the main operator workflow doc reflects the real guarded path used by the repo.

## Why this phase matters

`docs/trading-workflow.md` is the highest-level operator workflow guide, but it still emphasizes older entrypoints and does not yet center the canonical diagnostics (`trade preflight`, `trade authority`, `trade config`, `trade delivery`) before action.

That creates a gap between the repo’s actual fail-closed control model and the doc most likely to shape operator behavior.

## Scope

1. Audit `docs/trading-workflow.md` against the current `trade.js` command surface and operator guardrails.
2. Update the workflow doc to put canonical diagnostics and guarded queue/requeue/status semantics first.
3. Add a focused contract test for the workflow doc.
4. Add the test to repo verification.

## Non-goals

- no execution behavior changes
- no policy changes
- no new live-trading capability

## Done criteria

This phase is done when:
- `docs/trading-workflow.md` reflects the current canonical workflow and diagnostics
- a focused contract test enforces that doc surface
- full repo verification passes
