# Phase 116 — Operator Diagnostic Doc Alignment

_Last updated: 2026-05-10 21:56 UTC_

## Goal

Align the operator-facing runbook and observability docs with the current canonical diagnostic command family so operators can reliably find the decisive truth surfaces for readiness, authority, effective config, and delivery posture.

## Why this phase matters

The repo now has multiple canonical diagnostics under `trade.js`, but operator-facing docs still lean on older or partial command references. That creates avoidable drift between the real control surface and the docs operators are likely to read during incidents or readiness review.

## Scope

1. Audit `docs/operator-runbooks.md` and `docs/observability.md` against the current canonical `trade.js` diagnostics.
2. Update those docs to explicitly reference the canonical diagnostic commands and how to use them.
3. Add focused contract coverage so those references do not drift again.
4. Add the new test(s) to repo verification.

## Non-goals

- no new execution behavior
- no policy changes
- no new outbound messaging or broker actions

## Done criteria

This phase is done when:
- operator docs reference the canonical diagnostics for readiness, authority, config, and delivery posture
- focused contract tests enforce that alignment
- full repo verification passes
