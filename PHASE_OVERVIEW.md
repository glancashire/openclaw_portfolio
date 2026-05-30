# Phase Overview — 2026-05-30

> Generated from current repo state. Completed phases are summarized; only non-complete items are detailed below.

---

## Visual Roadmap

### Stabilization Track (S-series)

| Phase | Summary | Status |
|-------|---------|--------|
| S1 | Repo truth & test gates | ✅ `62f32fc` |
| S2 | Carry-over bug closeout | ✅ `3e3b11c` |
| S3 | Cron + delivery hardening | ✅ `590e204` |
| S4 | Runtime + doc hygiene | ✅ `b242bd0` |
| S5 | Soak prep | ✅ `bd4620e` |

### Post-Soak Track (A–H series)

| Phase | Summary | Status |
|-------|---------|--------|
| A | Live-order guard + idempotency | ✅ `81a1cfe` |
| B | Rebalance analyzer + cash scenarios | ✅ `bf74514` |
| C | Daily monitoring digest + AI assessment | ✅ `29b93f4` |
| D | Code-level approval gate (safe-word + PIN) | ✅ `4085fbc` |
| E | Approve-and-execute wrapper | ✅ `1a8f8b1` |
| F | Mailgun inbound handler (code-only) | ✅ `0ba3238` |
| G | Cron-jobs TTL cache | ✅ `cb271ea` |
| H | OpenClaw CLI as model provider | ✅ `b82b37f` |

### Wave Closeout Track (W1–W10)

| Phase | Summary | Status |
|-------|---------|--------|
| W1 | Doc archive + Roll-up B/F closeout | ✅ `20b2916` |
| W2 | Cron policy consolidation + Roll-up C | ✅ `4de339d` |
| W3 | Health trend synthesis + Roll-up D | ✅ `33c4f0b` |
| W4 | Runtime hash-gating + Roll-up E | ✅ `6ec4036` |
| W5 | Broker-only cancel (Spec §1) | ✅ `512fd15` |
| W6 | Native contract intelligence + ISIN | ✅ `2dc91a5` |
| W7 | Portfolio health model + self-heal | ✅ `ee2ae5c` |
| W8 | Approval lifecycle UX | ✅ `1966e24` |
| W9 | Recovery playbooks | ✅ `12ead31` |
| W10 | Automated verification lanes | ✅ `b8a72e7` |

### Execution Hardening Track

| Phase | Summary | Status |
|-------|---------|--------|
| R6 | Terminal-order evidence fallback | ✅ `5dc2723` |
| next-1 | UBSPX retry: stabilize proposal + timing fixes | ✅ `8f0dfce` |
| next-2 | Reconciliation & audit-trail hardening | ✅ `b398c85` |
| next-3 | Session-aware retry ergonomics | 🟡 verifying closeout |
| 4 | Summary artifact stability | ✅ verified resolved |
| 5 | Explicit retry preparation surface | ✅ `2159330` |

### Follow-ups

| # | Summary | Status |
|---|---------|--------|
| 1 | test-multi-portfolio-overview slow (28s→15s) | 🟡 partially resolved (acceptable) |
| 2 | Mailgun inbound route infra setup | 🔴 open (code ready, infra not) |
| 3 | Session safe-word enforcement | ✅ resolved |
| 4 | ib_insync tzdata traceback | ✅ resolved |

### Spec Outstanding Checklist

| Section | Status |
|---------|--------|
| §1 Live execution lane | 🟡 verifying final closeout |
| §2 Approval-gated execution | ✅ |
| §3 Order lifecycle hardening | ✅ |
| §4 Strategy validation & blocking | ✅ |
| §5 ETF suggestion workflow | ✅ |
| §6 Portfolio creation | ✅ |
| §7 History & dashboard refresh | ✅ |
| §8 Rebalancing engine | ✅ |
| §9 Reporting completeness | ✅ |
| §10 Scheduling / automation | ✅ |
| §11 Broker adapter | ✅ |
| §12 End-to-end acceptance | ✅ |
| §13 Expanded roadmap/reporting | ✅ |

---

## Detailed Open Work

### 🟡 next-3 — Session-Aware Retry Ergonomics

**File:** `plans/phase-next-3-session-aware-retry-ergonomics.md`  
**Status:** Verifying closeout  
**Effort:** S

#### Completed
- [x] Shared order-preparation helper extracted
- [x] Diagnostics path reuses helper
- [x] Market-open submission path reuses helper
- [x] Focused tests added and currently green

#### In progress
- [x] Safe-lane rerun in progress
- [x] Full `npm test` rerun in progress
- [x] Phase docs being reconciled with git truth

#### Remaining
- [ ] Capture final safe-lane result
- [ ] Capture final `npm test` result
- [ ] If green, commit/push closeout and mark phase complete

### 🟡 Roll-up D — Auto-Remediation Decision

**Status:** Deferred pending soak evidence

#### Open item
- [ ] Decide whether any safe auto-remediation steps should move from guidance to explicit operator-approved automation

### 🔴 Follow-up #2 — Mailgun Inbound Route (Infra)

**Status:** Code ready, infra not set up

#### Remaining
- [ ] Create Mailgun receiving route
- [ ] Set `mailgun.inboundWebhookSecret` in gateway config
- [ ] Expose public webhook endpoint/tunnel
- [ ] Run signed inbound integration test

### 🟡 Spec §1 — Live Execution Lane

**Status:** Partially complete

#### Remaining
- [ ] Finish next-3 verification closeout
- [ ] Confirm overview/docs now match git truth
- [ ] Mark §1 closed if broader verification remains green

### 🟡 FX Cash Reconciliation (WIP — Graham's branch)

**Status:** parked / not in autonomous scope
