# Phase 108 — Source vs Derived Artifact Hygiene

_Last updated: 2026-05-10 13:38 UTC_

## Goal

Reduce operational ambiguity around versioned source files versus regenerated/runtime artifacts, and make that distinction explicit and verifiable.

## Why this phase matters

The audit repeatedly found dirty-tree churn from generated summaries, overview artifacts, runtime state, and event files.
That churn makes it harder to:
- review real source changes
- create clean commits
- understand what is intentionally versioned
- detect accidental drift or noisy updates

The project already benefits from some generated artifacts being committed for operator visibility, so the answer is not simply “ignore everything.”
The right move is to document the contract and verify it lightly.

## Scope

1. Add a repo-local artifact policy document.
2. Classify key artifact families as source, derived-versioned, or runtime-ephemeral.
3. Add a lightweight verification test for the artifact policy contract.
4. Keep behavior aligned with current repo practice rather than forcing a large artifact strategy migration.

## Non-goals

- no mass `.gitignore` rewrite yet
- no deletion of current generated artifacts
- no large restructuring of reporting outputs

## Intended outputs

- an artifact policy document
- explicit classification for portfolio summaries, overview outputs, runtime state, and event logs
- a focused verification test
- repo verification coverage for the artifact policy contract

## Done criteria

This phase is done when:
- the repo clearly documents source vs derived vs runtime artifact intent
- the policy reflects current committed/generated behavior honestly
- repo verification enforces the presence of the artifact contract
