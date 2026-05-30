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
| next-3 | Session-aware retry ergonomics | ✅ `135c6c2` |
| 4 | Summary artifact stability | ✅ verified resolved |
| 5 | Explicit retry preparation surface | ✅ `2159330` |

### Reporting / Closeout Track

| Phase | Summary | Status |
|-------|---------|--------|
| F | Market-hours-aware broker wording | ✅ `fd21fd9` |
| G | Fallback quote + unrealized P/L consistency | ✅ `c37090b` |

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
| §1 Live execution lane | 🟡 decision-ready closeout |
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

**Status:** Decision-ready closeout

#### Remaining
- [ ] Decide whether engineering scope is now complete
- [ ] If yes, update canonical spec-tracking surfaces to mark §1 closed
- [ ] If no, name the non-engineering closure criteria explicitly

#### Engineering truth as of 2026-05-30
- Session-aware retry ergonomics and reporting consistency work are landed.
- Remaining uncertainty is no longer implementation depth; it is whether surrounding non-engineering expectations are being bundled into §1 closure.

### 🔴 Follow-up — Control UI Direct Embedding

**Status:** blocked on editable app source

#### Remaining
- [ ] Locate the actual editable `openclaw-control-ui` source/worktree
- [ ] If found, add a plan in that repo before implementation
- [ ] Port the already-landed open-phases card into the real dashboard surface
- [ ] Run that repo's build/test gates

### 🟡 FX Cash Reconciliation (WIP — Graham's branch)

**Status:** parked / not in autonomous scope
