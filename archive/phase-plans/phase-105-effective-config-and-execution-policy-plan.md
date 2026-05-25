# Phase 105 — Effective Config and Execution Authority Surface

_Last updated: 2026-05-10 13:31 UTC_

## Goal

Create one explicit effective-config / execution-authority diagnostic surface so operator truth is not split across environment variables, Markdown policy, runtime assumptions, and script-specific defaults.

## Why this phase matters

The audit identified scattered config and execution-policy interpretation as a real operational risk.
The system now has stronger preflight and reporting truth, but it still lacks one canonical answer to questions like:
- what execution mode is actually in force?
- what first-trade / first-purchase / sales approval rules apply?
- what broker account reference is active?
- what broker/environment posture is configured?
- what runtime pauses or live arms are active?

This phase creates that diagnostic surface without widening permissions.

## Scope

1. Build an effective-config / execution-authority service surface.
2. Add a canonical CLI command to expose it.
3. Include portfolio policy, broker posture, runtime pause state, and live-arm state.
4. Keep outputs human-readable and JSON-capable.
5. Add focused tests and verify the repo.

## Non-goals

- do not change live execution permissions
- do not replace the broader OpenClaw gateway config system
- do not redesign Markdown contracts yet

## Intended outputs

- a reusable effective execution authority summary in code
- a canonical CLI surface, likely under `trade.js`
- focused tests for effective-config truth
- documentation alignment with the canonical operator surface

## Done criteria

This phase is done when:
- one command gives a trustworthy execution-authority/effective-config summary
- the output includes runtime arm/pause state and key portfolio execution gates
- tests pass
- repo verification still passes
