# Phase 104 — Operator Readiness Surface Reconciliation

_Last updated: 2026-05-10 13:22 UTC_

## Goal

Make operator-facing dashboard and overview/reporting surfaces reflect the canonical live-readiness preflight truth so there is one consistent answer to:
- are we ready for the next market window?
- is live execution armed?
- what exact blockers remain?
- what should the operator do next?

## Why this phase matters

Phase 102 added a canonical preflight layer.
Phase 103 made `scripts/trade.js` the canonical operator CLI surface.
But the generated dashboard and overview surfaces still do not expose the new arm/preflight truth explicitly. That leaves room for operational ambiguity.

This phase closes that gap by flowing preflight truth into the derived operator surfaces.

## Scope

1. Add a reusable reporting-facing readiness summary built from the canonical preflight result.
2. Surface readiness state and arm state in generated dashboard output.
3. Include readiness/action signals in overview artifacts where appropriate.
4. Ensure current real portfolio output truthfully shows not-ready status and why.
5. Add focused tests for dashboard/overview integration.

## Non-goals

- do not widen live execution permissions
- do not change approval policy
- do not redesign the full investor UX yet
- do not remove existing dashboard sections unless replaced cleanly

## Intended outputs

- dashboard includes explicit live readiness section/details
- overview output includes explicit readiness/arm status for portfolios
- tests cover blocker/arm propagation into reporting
- operator-facing derived surfaces match the canonical preflight truth

## Done criteria

This phase is done when:
- dashboard output includes explicit readiness + arm visibility
- overview output surfaces readiness status without reimplementing policy
- focused tests pass
- repo verification still passes
