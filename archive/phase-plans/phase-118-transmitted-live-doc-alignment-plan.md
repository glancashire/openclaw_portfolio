# Phase 118 — Transmitted Live Operations Doc Alignment

_Last updated: 2026-05-10 22:02 UTC_

## Goal

Align `docs/transmitted-live-operations.md` with the current canonical diagnostic command family so the highest-risk operator workflow starts from the repo’s decisive truth surfaces.

## Why this phase matters

The transmitted-live operations doc governs the most sensitive execution lane, but it still emphasizes older readiness checks rather than the canonical `trade.js` diagnostics that now define readiness, authority, effective config, and delivery posture.

For the riskiest lane, that drift is exactly what we don’t want.

## Scope

1. Audit `docs/transmitted-live-operations.md` against the current canonical diagnostic and fail-closed live-execution model.
2. Update the doc so operators start with canonical diagnostics before any transmitted-live attempt.
3. Add a focused contract test for the doc.
4. Add the test to repo verification.

## Non-goals

- no live-execution behavior changes
- no policy widening
- no broker config changes

## Done criteria

This phase is done when:
- transmitted-live ops docs reference the canonical diagnostics clearly
- the doc still preserves explicit transmitted-live acknowledgement and fail-closed semantics
- focused contract coverage prevents drift
- full repo verification passes
