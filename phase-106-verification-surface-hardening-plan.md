# Phase 106 — Verification Surface Hardening

_Last updated: 2026-05-10 13:33 UTC_

## Goal

Expand the canonical verification surface so repo-level checks explicitly cover the newer operator-facing command surfaces, not just underlying helper scripts.

## Why this phase matters

The project now has a stronger canonical CLI around `trade.js`, plus newer readiness and execution-authority surfaces. But `npm test` / `verify-repo.js` still leans mostly on lower-level checks and does not yet treat those newer operator entrypoints as first-class verification targets.

That creates a QA blind spot: a canonical command can drift or regress while the lower-level checks still pass.

## Scope

1. Add focused verification for canonical trade CLI surfaces.
2. Add focused verification for execution-authority output.
3. Ensure repo-level verification calls those checks.
4. Keep verification deterministic and safe in the current blocked/non-live posture.

## Non-goals

- no live trading changes
- no broker permission widening
- no major migration to a new test framework yet

## Intended outputs

- stronger verify-repo coverage for `trade.js` operator surfaces
- updated test harness inclusion for authority/readiness command checks
- confirmation that canonical CLI outputs remain truthful under current ETF state

## Done criteria

This phase is done when:
- repo verification exercises canonical trade CLI surface tests
- repo verification exercises execution-authority verification
- all tests pass in the current blocked posture
- the repo verification output clearly reflects the expanded checks
