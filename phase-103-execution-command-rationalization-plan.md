# Phase 103 — Execution Command Rationalization and Canonical Operator Surface

_Last updated: 2026-05-10 12:01 UTC_

## Goal

Reduce operational ambiguity by consolidating the execution-related command surface into a small set of canonical, well-documented operator entrypoints.

## Why this phase matters

The repo now has strong execution logic, but many overlapping scripts still exist:
- preflight/readiness checks
- approval/rejection flows
- staging/submission flows
- sync/resync flows
- cancel flows
- open-runner / market-open flows
- debug/diagnostic scripts

That sprawl makes it harder to know which command is authoritative, which one is compatibility-only, and which one should be used in production.

## Scope

Create a canonical operator command model for execution workflows that:
1. identifies canonical vs compatibility vs debug scripts
2. adds a top-level operator entrypoint for execution actions
3. documents the expected command families
4. reduces confusion around which command should be used for live readiness, approval, staging, submit, cancel, and resync
5. preserves safety gates and explicit approvals

## Non-goals

- do not remove compatibility scripts yet unless the canonical path fully replaces them
- do not change execution safety policy
- do not add new live execution power

## Intended outputs

- a small canonical command surface
- explicit repo docs for command families
- compatibility/deprecation notes for obsolete scripts
- tests verifying canonical commands route correctly

## Done criteria

This phase is done when:
- there is one clearly documented canonical operator command family for execution actions
- obsolete/compat/debug commands are classified
- tests or direct inspection prove the canonical surface exists and works
