# Phase 4 — OpenClaw maintainer contract

Date: 2026-06-03
Status: ACTIVE
Source: `CURRENT_PLAN.md` Phase 4

## Objectives

1. Write a canonical OpenClaw host/config/delivery contract that lives in one place.
2. Tighten responsibilities across `AGENTS.md`, `TOOLS.md`, `playbook.md`, and setup docs.
3. Add one clear matrix for channels, sandboxing, cron delivery, restarts, and approvals.

## Why this matters

Operator-relevant invariants are scattered across:

- `TOOLS.md` (cron sandbox-off invariant, IBKR native gateway recovery, reporting stabilization)
- `docs/operations/cron.md` (canonical cron rules)
- `docs/operations/active-cron-jobs.md` (gated cron snapshot)
- `docs/operations/repo-map.md` (orientation)
- `playbook.md` (project conventions)
- `AGENTS.md` (session/memory rules)

A new operator landing in this repo needs a single matrix that says: "for each
moving part — channels, sandbox, cron delivery, restarts, approvals — here's
the contract on this host." Today they have to assemble that mental model from
six files.

## Deliverable

Add `docs/operations/openclaw-host-contract.md` with:

1. A one-screen contract matrix.
2. Cross-links into the deeper docs that own each row.
3. A short "if this changes, update X" tail per row.

Then add tight "see openclaw-host-contract for the canonical matrix" pointers
from `TOOLS.md`, `AGENTS.md`, `playbook.md`, and `docs/operations/repo-map.md`.

## Risks

- **Drift.** A new doc can become stale fast. Mitigation: each row points to the
  living owning doc instead of duplicating its content.
- **Doc proliferation.** This adds another file. Mitigation: it's a contract
  matrix, not a tutorial. Keep it short.

## Actionable checklist

- [ ] Write `docs/operations/openclaw-host-contract.md`.
- [ ] Add a "see openclaw-host-contract" pointer near the top of:
   - `TOOLS.md`
   - `AGENTS.md`
   - `playbook.md`
   - `docs/operations/repo-map.md`
- [ ] Add a regression test that asserts the contract matrix exists and contains
   each of the named rows (channels, sandbox, cron delivery, restarts, approvals).
- [ ] Update `CURRENT_PLAN.md` Phase 4 to mark items closed.

## Acceptance criteria

- `docs/operations/openclaw-host-contract.md` exists, is short, has a matrix.
- `TOOLS.md`, `AGENTS.md`, `playbook.md`, `docs/operations/repo-map.md` all
  point at the contract matrix.
- A test asserts the matrix has the five named rows.
- `npm test` and `npm run test:safe` stay green.
