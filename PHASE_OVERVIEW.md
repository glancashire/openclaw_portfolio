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
| I/J/K/L | Quote fallback, identity, account P&L, explicit overrides, IBKR accounting snapshot | ✅ `67229ae`, `dc1eb42` |
| N | Truth reconciliation | 🚧 in progress |

### Audit / Roadmap Track

| Phase | Summary | Status |
|-------|---------|--------|
| 1 | Safe hygiene and truth maintenance | ✅ `3d8a58f` |
| 2 | Configuration and environment hardening | 🟡 ready |
| 3 | CLI and orchestration refactor | ⚪ queued |
| 4 | Test governance and coverage transparency | 🟡 ready |
| 5 | Artifact hygiene and dead-code retirement | ⚪ queued |
| 6 | Operator UX and support simplification | ⚪ queued |
| 7 | Reliability and self-heal realism | 🟡 ready |
| 8 | Product and usage reporting | ⚪ queued |

### Follow-ups / External lanes

| # | Summary | Status |
|---|---------|--------|
| 2 | Mailgun inbound route infra setup | 🔴 open (code ready, infra not) |
| UI | Control UI direct embedding | 🔴 blocked on source access |
| FX | FX cash reconciliation | 🟡 parked (Graham WIP) |

---

## Detailed Open Work

### 🟡 Phase 2 — Configuration and environment hardening

**Status:** ready

#### Remaining
- [ ] centralize IBKR host/port/baseUrl defaults and document them once
- [ ] reconcile Phase 2 checklist/docs with the now-landed env/config work

### 🟡 Phase 4 — Test governance and coverage transparency

**Status:** complete (2026-06-01)

#### Delivered
- [x] generated `docs/operations/test-coverage-by-domain.json` from discovered tests
- [x] promoted `docs/operations/test-lanes.md` as the canonical governance doc
- [x] moved quarantine/override policy to versioned `config/test-discovery-policy.json`
- [x] tightened manifest drift tests to validate policy + domain-summary linkage
- [ ] evaluate a generated-artifact idempotence lane

### 🟡 Phase 7 — Reliability and guided-remediation realism

**Status:** ready

#### Remaining
- [ ] add cron-fetch degradation visibility to overview/reporting artifacts
- [ ] add a cron-health self-check lane/job
- [ ] keep remediation surfaces conservative and truthful
- [ ] clarify “self-heal” wording if actual automated healing remains intentionally narrow

### ⚪ Phase 5 — Artifact hygiene and dead-code retirement

**Status:** queued after the ready hardening phases

#### Remaining
- [x] classify obvious debug scripts into keep/move/remove and move diagnostic probes under `scripts/diagnostics/` with compatibility wrappers
- [ ] determine whether obsolete compatibility helpers can be retired
- [x] separate supported operator helpers from debug-only tooling more cleanly
- [ ] improve generated/live artifact hygiene boundaries

### 🔴 Follow-up #2 — Mailgun Inbound Route (Infra)

**Status:** code ready, infra not set up

#### Remaining
- [ ] Create Mailgun receiving route
- [ ] Set `mailgun.inboundWebhookSecret` in gateway config
- [ ] Expose public webhook endpoint/tunnel
- [ ] Run signed inbound integration test

### 🔴 Follow-up — Control UI Direct Embedding

**Status:** blocked on editable app source

#### Remaining
- [ ] Locate the actual editable `openclaw-control-ui` source/worktree
- [ ] If found, add a plan in that repo before implementation
- [ ] Port the already-landed open-phases card into the real dashboard surface
- [ ] Run that repo's build/test gates

### 🟡 FX Cash Reconciliation (WIP — Graham's branch)

**Status:** parked / not in autonomous scope
