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
- map current writable submission/staging/resync/cancel code paths
- identify exact remaining gaps from tests and current lifecycle model
- prefer the smallest code changes that close real inconsistencies

Verification:
- direct code inspection
- run current execution verification bundle

### Step 2 — Close submission anchoring gaps
- ensure a staged broker order transitions cleanly into submitted/live tracking
- ensure broker order identifiers and lifecycle states remain stable across submit/resync
- prevent duplicate or conflicting rows during the staged -> submitted handoff

Verification:
- add/extend focused regression tests for staged -> submitted transition
- run execution verification bundle

### Step 3 — Close terminal reconciliation gaps
- ensure filled/cancelled/failed states reconcile onto the correct broker-linked row
- ensure terminal rows are not duplicated by selector drift or resync order
- ensure retries/failures preserve safe operator visibility

Verification:
- add/extend terminal reconciliation regression tests
- run execution verification bundle

### Step 4 — Strengthen broker-write audit logging
- verify write-path events leave enough state in Markdown/log surfaces for later diagnosis
- improve audit trail only where there is real ambiguity today

Verification:
- focused regression tests or direct file-surface inspection
- run execution verification bundle

### Step 5 — Add explicit end-to-end writable verification
- create a focused writable execution scenario test that exercises:
  - staged order creation
  - live submission handoff
  - status/resync transition
  - cancel or terminal reconciliation path
- fold it into the standard verification surface if stable

Verification:
- run the new end-to-end writable scenario test
- run execution verification bundle

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

## Expected leftovers to ignore unless promoted intentionally
- `.learnings/`
- `runtime/`
- one-off probe scripts unless converted into stable regression tests
