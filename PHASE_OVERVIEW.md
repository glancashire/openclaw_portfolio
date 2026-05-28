# Phase Overview — 2026-05-28

> Generated automatically. Shows all phases with status; completed phases are one-liners in the roadmap, open phases get detailed checklists below.

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

### Roll-up Outstanding Items

| Item | Summary | Status |
|------|---------|--------|
| A | Market-calendar intelligence | ✅ fully closed |
| B | Documentation truth | ✅ closed W1 |
| C | Delivery & cron hardening | ✅ closed W2 |
| D | Health / self-heal maturity | 🟡 1 deferred decision |
| E | Runtime artifact hygiene | ✅ closed W4 |
| F | Historical cleanup | ✅ closed W1 |

### Execution Hardening Track (plans/phase-2..5 + phase-next)

| Phase | Summary | Status |
|-------|---------|--------|
| next-1 | UBSPX retry: stabilize proposal + timing fixes | 🔴 open |
| next-2 | Reconciliation & audit-trail hardening | 🔴 open |
| next-3 | Session-aware retry ergonomics | 🔴 open |
| 4 | Summary artifact stability | ✅ verified resolved |
| 5 | Explicit retry preparation surface | 🔴 open |

### Follow-ups (plans/follow-ups.md)

| # | Summary | Status |
|---|---------|--------|
| 1 | test-multi-portfolio-overview slow (28s→15s) | 🟡 partially resolved (Phase G) |
| 2 | Mailgun inbound route infra setup | 🔴 open (code ready, infra not) |
| 3 | Session safe-word enforcement | ✅ resolved (Phase D+E) |
| 4 | ib_insync tzdata traceback | ✅ resolved (Phase A) |

### Spec Outstanding Checklist

| Section | Status |
|---------|--------|
| §1 Live execution lane | 🟡 2 partial items remain |
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

### Recent Bug-Fix Commits (not in a named phase)

| Commit | What | Date |
|--------|------|------|
| `b489a8e` | Dashboard cash visibility fix | 2026-05-28 |
| `aaeb8c0` | Plan: FX cash reconciliation (WIP, Graham) | 2026-05-27 |
| `2a376ef` | Replace Japan ETF (IE→LU) | 2026-05-27 |
| `f1fbb9f` | Fix 4 quarantined tests | 2026-05-27 |
| `e209ed2` | gitignore email-locks | 2026-05-27 |
| `a56e7d2` | Fix duplicate emails (idempotency guard) | 2026-05-27 |

---

## Detailed Open Work

---

### 🔴 UBSPX Retry Hardening — Phase next-1

**File:** `plans/phase-next-ubspx-retry-hardening.md` (Phase 1 section)  
**Status:** Not started  
**Effort:** M

#### Checklist
- [ ] Review changed source/test files, remove dead test artifacts — **S**
- [ ] Proposal-distribution regression: UBSPX gets buy when EMUAA overweight — **S**
- [ ] Target-gap deployment regression: doesn't overspend cash — **S**
- [ ] Timing-field forwarding regression: native client forwards outsideRth/goodAfterTime/goodTillDate — **S**
- [ ] Execution timing-policy regression: UBSPX/IBIS gets DAY + goodAfterTime + outsideRth=false — **S**
- [ ] Run focused tests until green — **S**
- [ ] Commit + push — **S**

#### 🤖 Autonomous next actions
- Could be executed entirely by agent. Pure test + assertion work, no broker interaction.

---

### 🔴 Reconciliation & Audit-Trail Hardening — Phase next-2 / Phase 2

**Files:** `plans/phase-next-ubspx-retry-hardening.md` (Phase 2 section), `plans/phase-2-reconciliation-audit-hardening.md`  
**Status:** Not started  
**Effort:** M

#### Checklist
- [ ] Inspect `syncPortfolioOrderStatus` not-found fallback + hint matching — **S**
- [ ] Regression test: ambiguous order-id reuse / weak hint correlation — **M**
- [ ] Regression test: legitimate probable-cancelled with strong evidence — **S**
- [ ] Patch: require stronger symbol/instrument/quantity alignment — **M**
- [ ] Run targeted reconciliation tests — **S**
- [ ] Run broader regression suite — **S**
- [ ] Commit + push — **S**

#### 🤖 Autonomous next actions
- Could be executed entirely by agent. Source/test only, no live order interaction.

---

### 🔴 Session-Aware Retry Ergonomics — Phase next-3 / Phase 3

**File:** `plans/phase-3-session-aware-retry-ergonomics.md`  
**Status:** Not started  
**Effort:** M

#### Checklist
- [ ] Extract reusable execution-timing helper module — **M**
- [ ] Unit tests: default pass-through behavior — **S**
- [ ] Unit tests: UBSPX/IBIS session-aware retry defaults — **S**
- [ ] Integration test: `stagePortfolioOrder` sends timing fields in dry-run — **M**
- [ ] Preserve dry-run no-write behavior — **S**
- [ ] Run focused + broader tests — **S**
- [ ] Commit + push — **S**

#### 🤖 Autonomous next actions
- Could be executed entirely by agent. Refactor + tests, no side effects.

---

### 🟢 Summary Artifact Stability — Phase 4 (VERIFIED RESOLVED)

**File:** `plans/phase-4-summary-artifact-stability.md`  
**Status:** ✅ Already resolved — `test-structured-summary-artifacts.js` passes cleanly (verified 2026-05-28)  
**Action:** Close plan, no work needed.

---

### 🔴 Explicit Retry Preparation Surface — Phase 5

**File:** `plans/phase-5-retry-preparation-surface.md`  
**Status:** Not started  
**Effort:** M

#### Checklist
- [ ] Introduce prepare-order helper (merge instrument metadata + timing policy) — **M**
- [ ] Unit coverage: metadata/timing preparation — **S**
- [ ] Integration staging coverage — **M**
- [ ] Verify no new writes or gate bypasses — **S**
- [ ] Run focused + full verification — **S**
- [ ] Commit + push — **S**

#### 🤖 Autonomous next actions
- Could be executed entirely by agent. Pure refactor + test work.

---

### 🟡 Roll-up D — Auto-Remediation Decision

**File:** `ROLLUP_OUTSTANDING_PLAN.md` → Section D  
**Status:** Deferred pending soak evidence  
**Effort:** S (decision), M (implementation if yes)

#### Open item
- [ ] Decide whether any safe auto-remediation steps should move from guidance to explicit operator-approved automation

#### 🔑 Decision required
Should any self-heal actions (e.g., auto-restart stale market-data subscriptions, auto-retry known-transient broker disconnects) be promoted from "guidance" to "automated with operator approval"? Needs real operational evidence of repeated manual interventions to justify.

---

### 🟡 Follow-up #1 — Slow Multi-Portfolio Overview Test

**File:** `plans/follow-ups.md` → Item 1  
**Status:** Partially resolved (28s → 15s via Phase G TTL cache)  
**Effort:** S

#### Remaining
- [ ] Remaining 11s is legitimate filesystem work — only act if `npm test` becomes a mandatory pre-push gate

#### 🤖 Autonomous: No action needed unless npm test becomes gated.

---

### 🔴 Follow-up #2 — Mailgun Inbound Route (Infra)

**File:** `plans/follow-ups.md` → Item 2  
**Status:** Code ready (`lib/mailgunInbound.js`, 41 assertions), infra NOT set up  
**Effort:** S (infra, needs Mailgun dashboard access)

#### Checklist
- [ ] Create Mailgun receiving route: `match_recipient("c3po@mailgun.swift.ch")` → forward to webhook URL
- [ ] Set `mailgun.inboundWebhookSecret` in gateway config
- [ ] Integration test: POST signed inbound payload → gateway parses

#### 🔑 Decision required
Graham needs to do the Mailgun dashboard step (requires account access). The webhook endpoint also needs a publicly routable URL or tunnel.

---

### 🟡 Spec §1 — Live Execution Lane (2 partial items)

**File:** `spec-outstanding-checklist.md` → Section 1  
**Status:** Partially complete  

#### Remaining items
- [~] Implement explicitly writable-mode order submission path
- [~] Implement durable order status tracking after submission

These are marked partial because the basic paths exist and work (orders have been placed and filled via IBKR), but hardening around edge cases (retry after uncertain failure, session recovery) is what phases 2-5 above address.

---

### 🟡 FX Cash Reconciliation (WIP — Graham's branch)

**Commit:** `aaeb8c0` (Plan: fix holdings FX cash reconciliation)  
**Status:** WIP, uncommitted changes in `src/brokers/shared/holdingsSnapshot.js` + untracked test scripts  
**Owner:** Graham  

**Not in autonomous scope** — do not touch.

---

## Decisions Required

All 🔑 items consolidated for quick scanning:

| # | Decision | Context | Impact |
|---|----------|---------|--------|
| 1 | **Auto-remediation promotion?** | Roll-up D: should any self-heal guidance become automated? | Low urgency. Need soak evidence of repeated manual intervention to justify. Defer until at least 2026-06-01 soak checkpoint. |
| 2 | **Mailgun infra setup?** | Follow-up #2: inbound webhook needs a route + publicly routable endpoint. Code is ready. | Blocks "reply to email" as approval path. Requires Mailgun dashboard access. |
| 3 | **Start execution hardening track?** | Phases next-1 through 5 are all agent-executable. All pure source/test, no broker interaction. | Could run as a batch. ~4-6 hours total agent time. Would close the last Spec §1 partial items. |
| 4 | **Phase 4 already resolved?** | `f1fbb9f` fixed quarantined tests. **VERIFIED: test passes cleanly.** | ✅ Closed — no work needed. |

---

## Autonomous Actions Executed

| Action | Detail |
|--------|--------|
| Fixed duplicate line in `ROLLUP_OUTSTANDING_PLAN.md` | Removed duplicate "Revisit doc and artifact hygiene" line; added W1-W10 entry to execution order |
| Updated `SPEC_PROGRESS.md` | Changed "S1-S5 in progress" → accurate "all complete" with dates |
| Updated `PROGRESS_REPORT.md` | Added 2026-05-26, 2026-05-27, 2026-05-28 entries; bumped "Last updated" to 2026-05-28 |
| Restored 4 missing plan files | `plans/phase-{2,3,4,5}-*.md` were deleted from working tree but still in git HEAD; restored from HEAD |
| Verified Phase 4 resolved | Ran `test-structured-summary-artifacts.js` — passes cleanly; marked Phase 4 closed |

---

## Quick Stats

| Metric | Value |
|--------|-------|
| Total named phases | 28 (S1-5, A-H, W1-10, next-1..3, 4, 5) |
| Complete | 24 (86%) |
| Open/in-progress | 4 (phases next-1..3, 5) |
| Partially complete | 3 (Roll-up D, Spec §1, Follow-up #1) |
| Decisions pending | 3 |
| Autonomous-executable open items | 4 phases (all source/test-only) |
| Last commit | `b489a8e` (2026-05-28) |
| Test status | 56 curated gate ✅, 216 safe-lane ✅, 0 quarantined |
