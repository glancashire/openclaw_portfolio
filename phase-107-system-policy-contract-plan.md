# Phase 107 — System Policy Contract

_Last updated: 2026-05-10 13:35 UTC_

## Goal

Create one explicit repo-local system policy contract for instruction authority, execution boundaries, messaging behavior, and automation limits.

## Why this phase matters

A lot of the project’s safety posture already exists in code, plans, and habits, but it is still too distributed.

Right now, important operational rules are spread across:
- specification language
- phase plans
- config notes
- script behavior
- implicit operator expectations

That makes the system safer than average in practice, but less durable than it should be. A clear policy contract will make the repo easier to operate, review, audit, and eventually surface in a real control UI.

## Scope

1. Add a canonical `system-policy.md` document.
2. Cover instruction sources, execution authority, automation boundaries, notification rules, and live-execution prerequisites.
3. Align repo-local config notes and operator command docs with that policy.
4. Add a lightweight verification test so the contract is treated as a maintained artifact.

## Non-goals

- no live permission expansion
- no gateway config mutation
- no control-UI redesign
- no replacement of existing code-level gates

## Intended outputs

- `system-policy.md`
- linked policy references from existing docs
- a focused policy-contract test
- repo verification coverage for policy presence/required sections

## Done criteria

This phase is done when:
- the repo contains one clear system policy contract
- the policy explicitly documents the current fail-closed execution posture
- key docs reference the policy instead of re-inventing it
- repo verification enforces the contract’s required sections
