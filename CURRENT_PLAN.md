# Current Plan

**Date:** 2026-06-03
**Status:** clean — all autonomous Phase A/C work complete; Phase B remains operator-blocked; Phase D parked
**Repo head:** see `git log -1 --oneline` for the exact head

## Goal

Keep one short, truthful doc that captures **only the work that is still open or waiting**. Completed phases live in `archive/phase-plans/`. Historical roadmaps live in `archive/docs/`.

When Graham says "go", an autonomous run can pick up from this file alone.

---

## Visual roadmap

```text
Phase B  External unblockers and operator-owned gates  [WAITING]   ███░░░░░░░
Phase D  Parked product and domain explorations         [PARKED]    █░░░░░░░░░
```

Phases A and C are fully complete; their plans archived under
`archive/phase-plans/2026-06-03-phase-a-c/`. See that folder's README for
the implementation map.

Filtered out (completed earlier in this session):

- Phase 1 — Operator surface cleanup ✅ 2026-06-02
- Phase 2 — Artifact hygiene and legacy surface retirement ✅ 2026-06-03
- Phase 3 — Usage and decision-support reporting ✅ 2026-06-03
- Phase 4 — OpenClaw maintainer contract ✅ 2026-06-03
- Email redesign (light-only) ✅ 2026-06-03
- **Phase A1 — `history.md` Net deposited column** ✅ 2026-06-03
- **Phase A2 — IBKR XLS deposit auto-import CLI** ✅ 2026-06-03
- **Phase A3 — Withdrawal display in digest** ✅ 2026-06-03
- **Phase C — Counter freshness wiring** ✅ 2026-06-03

Archive index: `archive/phase-plans/2026-06-03-completed/` (earlier batch),
`archive/phase-plans/2026-06-03-phase-a-c/` (this batch).

---

## Phase B — External unblockers and operator-owned gates
**Status:** WAITING (operator-side actions; not autonomous)

### Completed
- [x] IBKR readonly reporting and holdings-sync paths are stable for normal read/report operations.
- [x] Recovery guidance lives in `docs/operations/ibkr-recovery.md`.
- [x] Quote-posture failure narrowed to subscription/data-farm/operator-side diagnosis (not a generic read-path outage).

### Still open
- [ ] **Operator action:** complete IBKR runbook Step 6 and verify quote posture moves out of `unknown`.
- [ ] **Operator action:** re-test live order submission only after quote posture is healthy.
- [ ] **Decision (locked, parked):** Control UI direct embedding stays parked until editable source becomes available.

---

## Phase D — Parked product and domain explorations
**Status:** PARKED (kept-parked decision locked 2026-06-03)

### Items parked
- [ ] **PARKED.** FX cash reconciliation: documented root cause; no fix staged. Reactivate only if live operator use becomes materially confused.
- [ ] **PARKED.** Control UI direct embedding: target identified, editable source not yet available.
- ~~Spitex transfer themes~~ — out of scope for this repo (separate surface).

---

## Recommended next action when Graham says go

The autonomous engineering surface is currently empty. Real next steps:

1. **Operator** completes IBKR Step 6 (Phase B) — only real blocker for live trading.
2. After Step 6 lands, autonomous lane resumes live-trade verification.
3. Otherwise, repo is in maintenance mode until a new piece of work is requested.

## Decision audit trail

All decisions opened on 2026-06-03 10:54 UTC are resolved:

1. ✅ Investor email headline alignment — accepted (auto-aligned via shared builder).
2. ✅ Auto-import CLI — accepted, shipped (Phase A2).
3. ✅ Counter freshness — option (a) accepted, shipped (Phase C).
4. ✅ Parked items kept parked. Spitex removed (out of scope).
5. ✅ IBKR runbook Step 6 — operator handles separately.
