# Open Phases Overview — 2026-05-30 18:40 UTC

> Filtered to **non-fully-complete** work only.
> Rebuilt from **git history + current verification state** so the open-work view matches the actual repo truth.

---

## Visual roadmap

```text
Done engineering backlog ───────────────────────────────────────────────────┐
                                                                            │
Open now                                                                    ▼

Phase 2 config/env hardening            [READY]      ██████████
Phase 4 test governance                 [READY]      ██████████
Phase 7 cron/remediation realism        [READY]      ██████████
Phase 5 artifact hygiene                [READY]      ██████████
Retired email-reply approval lane        [DROPPED]    ██░░░░░░░░
Control UI direct embedding             [BLOCKED]    ██████░░░░
FX cash reconciliation (Graham WIP)     [PARKED]     ██░░░░░░░░
```

Legend:
- `READY` = active autonomous implementation lane from the roadmap
- `WAITING` = blocked on external access
- `PARKED` = intentionally not taken over
- `BLOCKED` = implementation target exists conceptually, but the editable surface is unavailable

---

## Executive summary

### Latest closeout update
- **Reporting/accounting/quote hardening is complete in git.**
  - Phase G cross-surface unrealized P/L consistency: `c37090b`
  - Phase H open-work doc closeout: `b8381c9`
  - Phase I/J/K/L reporting lane closeout across explicit quote overrides, account-vs-holdings P/L, and read-only IBKR accounting snapshot support: `67229ae` + `dc1eb42`
- EMUAA now resolves through the explicit `external_quote_symbol` override path (`EMUAA.SW`) and uses the conservative Yahoo last-close fallback when available.
- Dashboard/reporting surfaces now distinguish:
  - **Holdings unrealized P/L**
  - **Account P/L vs deposited capital**

### Spec truth
- **Spec §1 engineering scope is complete.** Canonical spec trackers (`SPEC_PROGRESS.md`, `spec-outstanding-checklist.md`) already mark the live execution lane as complete.
- Remaining open work is now **roadmap hardening / operational follow-through**, not unfinished core execution/reporting engineering.

### Actual remaining non-complete items
1. **Phase 2 — Configuration and environment hardening**
2. **Phase 4 — Test governance and coverage transparency**
3. **Phase 7 — Cron health / guided remediation realism**
4. **Phase 5 — Artifact hygiene and dead-code retirement**
5. **Retired email-reply approval lane** (removed from the live repo later)
6. **Control UI direct embedding** (blocked until editable app source is available)
7. **FX cash reconciliation** remains Graham-owned WIP and untouched

---

## Detailed open-phase checklist

### Phase 2 — Configuration and environment hardening
**Status:** READY FOR IMPLEMENTATION

#### Objectives
- centralize configuration contracts
- reduce hidden hard-coded defaults
- separate pure config loading from mutating environment bootstrap
- document the config matrix once

#### Still open
- [ ] add `docs/config-matrix.md`
- [ ] introduce pure env-read helper beside mutating loader
- [ ] add loopback-only TLS-relaxation guard coverage
- [ ] centralize and document IBKR connection defaults

---

### Phase 4 — Test governance and coverage transparency
**Status:** READY FOR IMPLEMENTATION

#### Status update
- [x] generated coverage-by-domain manifest from discovered tests
- [x] kept `docs/operations/test-lanes.md` as the canonical governance doc
- [x] externalized lane/quarantine policy into versioned data
- [ ] consider generated-artifact idempotence lane

---

### Phase 7 — Cron health / guided remediation realism
**Status:** READY FOR IMPLEMENTATION

#### Still open
- [ ] surface cron-fetch degradation explicitly in overview/reporting artifacts
- [ ] add a cron-health self-check lane/job
- [ ] keep self-heal guidance conservative and truthful
- [ ] rename or clarify “self-heal” wording if automation stays intentionally narrow

---

### Phase 5 — Artifact hygiene and dead-code retirement
**Status:** READY AFTER PHASES 2/4/7

#### Still open
- [x] classify obvious debug scripts into keep/move/remove and move diagnostic probes under `scripts/diagnostics/` with compatibility wrappers
- [ ] determine whether legacy helpers like `scripts/execute-trades.js` can be retired
- [x] separate supported operator helpers from debug-only tooling more clearly
- [ ] improve generated/live artifact hygiene boundaries

---

### Follow-up #2 — Retired email-reply approval lane
**Status:** DROPPED FROM LIVE REPO

#### Historical note
- [x] This follow-up was later removed from the live repo during the inbound email retirement pass.

---

### Follow-up — Control UI direct embedding
**Status:** BLOCKED ON EDITABLE APP SOURCE

#### Still open
- [ ] Locate the actual editable `openclaw-control-ui` source/worktree
- [ ] If found, port the already-landed open-phases card into the real dashboard surface
- [ ] Run that repo's build/test gates

---

### FX cash reconciliation (Graham WIP)
**Status:** PARKED / NOT IN AUTONOMOUS SCOPE

#### Still open
- [ ] Graham-owned changes remain untouched
