# Phase 1 Plan — Writable Execution Completion

Source checklist: `consolidated-roadmap-checklist.md`

## Goal
Finish the writable execution lane so live submission, post-submission tracking, cancel, resync, and terminal reconciliation behave safely and consistently around staged broker orders.

## Scope
This phase covers the remaining open work in roadmap Phase 1 and the tightly-coupled parts of Phase 2.

Primary targets:
1. complete explicitly writable-mode order submission path
2. make post-submission tracking durable
3. finish cancel flow in writable mode
4. keep staged broker orders anchored across submit / resync / cancel
5. reconcile terminal states consistently
6. strengthen broker-write logging / audit trail
7. add focused end-to-end writable submission verification

## Non-goals
- ETF shortlist workflow
- broad rebalancing improvements
- portfolio creation workflow
- reporting polish beyond what is required to verify execution state transitions

## Current known progress
Already landed in recent commits:
- staged broker orders tracked as first-class lifecycle state
- staged orders aligned with submitted lifecycle
- staged order cancel reconciliation hardening
- resync chooses latest broker row
- resync open-order filtering hardened
- cancel fallback by `brokerOrderId`
- approval/rejection/stale-proposal guards
- partial-fill inference

## Open risks to close
- live submission may still leave gaps between staged records and submitted records
- broker-linked terminal transitions may still produce duplicate lifecycle rows in edge cases
- write-path logging may be incomplete for audit/debugging
- end-to-end writable verification is not yet explicit enough

## Execution sequence

### Step 1 — Inspect current writable path behavior
- [x] map current writable submission/staging/resync/cancel code paths
- [x] identify exact remaining gaps from tests and current lifecycle model
- [x] prefer the smallest code changes that close real inconsistencies

Verification:
- [x] direct code inspection
- [x] run current execution verification bundle

### Step 2 — Close submission anchoring gaps
- [x] ensure a staged broker order transitions cleanly into submitted/live tracking
- [x] ensure broker order identifiers and lifecycle states remain stable across submit/resync
- [x] prevent duplicate or conflicting rows during the staged -> submitted handoff

Verification:
- [x] add/extend focused regression tests for staged -> submitted transition
- [x] run execution verification bundle

### Step 3 — Close terminal reconciliation gaps
- [x] ensure filled/cancelled/failed states reconcile onto the correct broker-linked row
- [x] ensure terminal rows are not duplicated by selector drift or resync order
- [x] ensure retries/failures preserve safe operator visibility

Verification:
- [x] add/extend terminal reconciliation regression tests
- [x] run execution verification bundle

### Step 4 — Strengthen broker-write audit logging
- [x] verify write-path events leave enough state in Markdown/log surfaces for later diagnosis
- [x] improve audit trail only where there is real ambiguity today

Verification:
- [x] focused regression tests or direct file-surface inspection
- [x] run execution verification bundle

### Step 5 — Add explicit end-to-end writable verification
- [x] create a focused writable execution scenario test that exercises:
  - [x] staged order creation
  - [x] live submission handoff
  - [x] status/resync transition
  - [x] cancel or terminal reconciliation path
- [x] fold it into the standard verification surface if stable

Verification:
- [x] run the new end-to-end writable scenario test
- [x] run execution verification bundle

## Commit policy
- commit each passing sub-phase separately with a narrow message
- push after each successful committed sub-phase when appropriate
- do not commit probes, scratch files, or local runtime artifacts

## Success criteria
This phase is complete when:
- writable submission path is explicit and test-covered
- staged broker orders remain consistently anchored through submit/resync/cancel
- terminal reconciliation is idempotent and broker-linked
- write-path auditability is materially improved
- focused end-to-end writable verification passes

## Current findings from Step 1
- The repo’s writable path intentionally remains a guarded non-transmitted staging lane (`revocableOnly`, `transmit: false`) rather than true unsafe auto-transmit.
- The core handoff from staged -> submitted/filled is already implemented through broker-status reconciliation, and the writable-live acceptance path now has explicit end-to-end proof.
- The most credible closure for this phase is guarded implementation + tests proving durable staged/live handoff and terminal reconciliation, not relaxing the repo’s safety posture.

## Verified outcomes
- Added an explicit writable-live acceptance scenario covering staged creation, broker-status handoff to submitted, terminal cancellation reconciliation, broker-order-id continuity, and history snapshots across the lane.
- Folded the writable-live acceptance scenario into `scripts/verify-execution-surface.js` so the standard execution verification bundle now proves the live lane explicitly.
- Verified the existing staged/fill/cancel/not-found regressions continue to pass without duplicate lifecycle rows.
- Closed the roadmap acceptance items by proving the guarded writable lane end-to-end rather than introducing unsafe auto-transmit behavior.

## Expected leftovers to ignore unless promoted intentionally
- `.learnings/`
- `runtime/`
- one-off probe scripts unless converted into stable regression tests
