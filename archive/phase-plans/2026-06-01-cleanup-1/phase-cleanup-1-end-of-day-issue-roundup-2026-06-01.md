# Phase Cleanup-1 — End-of-Day Issue Roundup and Fix Plan

**Date:** 2026-06-01 19:50 UTC
**Status:** plan
**Trigger:** End-of-day audit after Phase UX-1 closeout. Find all open problems (including hidden ones not surfaced earlier today) and produce a sequenced fix plan.

---

## 1. Survey — issues found

Categorised by severity. Each entry: **symptom → evidence → root cause → impact**.

### 1.1 Live / operational

#### L1. Quote posture `unknown` blocks live submission
- **Symptom:** `ibkr-fast-status` exit 4. `marketDataMode=unknown` after 4.8 s probe.
- **Evidence:** today's fast-status run; today's `dashboard.md` still shows "Interactive Brokers readiness timed out during dashboard regeneration".
- **Root cause:** market-data snapshot probes return neither live (84/86/31) nor delayed (88/87) fields. IB Gateway is logged in for account data but market-data subscriptions / packages are not exposing snapshots through the API.
- **Impact:** read path works, but `transmitted_live` execution is gated. All proposals stay dry-run.

#### L2. Dashboard regen says "readiness timed out" even though sync just succeeded
- **Symptom:** `portfolio/etf/dashboard.md` reports `Interactive Brokers readiness timed out during dashboard regeneration; using the latest holdings snapshot with degraded broker posture.`
- **Evidence:** the same run also produced fresh holdings (NetLiq CHF 100'766.08, 9 positions) — i.e. broker is reachable.
- **Root cause:** dashboard generator's `getInteractiveBrokersReadinessBounded` uses a tighter timeout than the readiness probe loop needs when posture detection has to fall through all candidates. With `marketDataMode=unknown` taking ~5 s, the bounded wrapper trips first.
- **Impact:** Dashboard message overstates the problem ("timed out") and could mislead an operator into thinking the gateway is down. Cosmetic but trust-eroding.

### 1.2 Repository hygiene / dev workflow

#### R1. Stash `stash@{0}` is now redundant
- **Symptom:** Stash listed as "phase-ux-1 wip stash: pre-existing readiness probe tweak".
- **Evidence:** `git stash show -p stash@{0}` contains exactly the `maxProbeCount = 2` + `slice(0, maxProbeCount)` change and the SXR8 generic-control candidate. Commit `1e51f7b` ("Speed up IBKR readiness probing") already merged the speed-up.
- **Root cause:** Stash created before the commit. Not dropped after merge.
- **Impact:** Confusing carry-over; rebase pain later. SXR8 control candidate from the stash is **not** in HEAD yet though — worth a separate check.

#### R2. `regenerate-dashboard.js` cwd / arg-shape footgun
- **Symptom:** `node scripts/regenerate-dashboard.js etf` → `ENOENT 'etf/holdings.md'`.
- **Evidence:** today's run; script signature is `regenerateDashboard(target)` where target is a *directory*, not a portfolio name. Caller must pass `portfolio/etf` from the workspace root.
- **Root cause:** Inconsistent script CLI contract — other scripts (`show-dashboard.js`, `sync-ibkr-after-recovery.js`) accept a bare portfolio name. Documented foot-gun (TOOLS-style note already in memory), but the script still trips operators.
- **Impact:** False-negative perception that dashboard regen is broken.

#### R3. Generated artifacts dirty the working tree on every run
- **Symptom:** `git status` shows `portfolio/etf/dashboard.md`, `holdings.md`, `holdings-avg-cost.json`, `runtime/events/runtime-events.jsonl`, and four new monthly report files modified after a routine sync.
- **Evidence:** today's `git status --short` after a clean sync.
- **Root cause:** Generated artifacts not gitignored; dated monthly report files (`portfolio_report_etf_monthly_20260601.{html,json,md,pdf}`) are produced unconditionally by the monthly cron.
- **Impact:** Operator must always `--exclude` or hand-stage; risk of accidentally committing churn (we already exclude in commit guidance, but it's bypass-able).

### 1.3 Cron / scheduling

#### C1. `portfolio-health-monitor` cron is red ("error")
- **Symptom:** `openclaw cron list` shows that job in `error` state, ran 6 h ago.
- **Evidence:** today's cron list output.
- **Root cause:** Per phase 7B, cron health surfacing now treats consecutiveErrors → severity. `delivery=announce -> last (no route, will fail-closed)` suggests the failure is in *delivery*, not execution — the announce-to-`last` route is broken (no chatId / no preferred channel resolves).
- **Impact:** Job status is noisy; if the agent surfaces it, operator sees a red line that may be only delivery-layer, not the job's substantive work.
- **Note:** TOOLS.md already says use `--best-effort-deliver` to prevent this. May have regressed or this job missed the patch.

#### C2. All cron jobs use `delivery: announce -> last` with `no route, will fail-closed`
- **Symptom:** Every job's Delivery column says `announce -> last (last -> no route, will fail-closed: Deliver...)`.
- **Evidence:** today's cron list.
- **Root cause:** No `chatId` configured for the announce route on this host. Telegram is the channel, but the last-channel inference can't resolve a webchat session as a delivery target.
- **Impact:** Cron output never reaches operator via push. We rely on logs + dashboard. Documented in TOOLS.md but not solved.

### 1.4 Tests / coverage truth

#### T1. Old "TIMEOUT" tests now pass — manifest may be stale
- **Symptom:** Previous turn summary said `test-effective-config.js` and `test-execution-authority.js` were blocking the safe-lane suite with timeouts. Both now run in <5 s with exit 0.
- **Evidence:** today's reruns: `{"ok":true,"executionMode":"transmitted_live"}` for both.
- **Root cause:** Most likely the OpenClaw `2026.5.6 → 2026.5.28` update fixed an upstream slow path (or our retention-policy cleanup removed a noisy fixture). Was never re-validated after restart.
- **Impact:** Spec-checklist and memory files still record those as blockers; safe-lane status may be cleaner than we think.

#### T2. `messages.groupChat.visibleReplies` deprecation warning
- **Symptom:** `openclaw doctor` flags a deprecated config field.
- **Evidence:** doctor output during Phase UX-1.
- **Root cause:** Schema renamed in newer OpenClaw release; our config still uses the old key.
- **Impact:** Low (warning only) but accumulates if we keep accepting unknown-field doctor warnings.

### 1.5 Spec / docs drift

#### D1. Memory + checklist still list resolved items as blockers
- **Symptom:** `memory/2026-06-01.md` "Outstanding" lists the two test timeouts and the stash; both are stale per T1 and R1.
- **Evidence:** memory file footer; this audit.
- **Root cause:** End-of-day notes written before the post-update verification.
- **Impact:** Tomorrow's first session reads stale problem statements.

### 1.6 Hidden / latent issues found by audit

#### H1. Sync took **2 minutes** ("step 2/2 — holdings sync ms=123705")
- **Symptom:** Holdings sync wall-clock ~124 s for 9 positions.
- **Evidence:** today's `sync-after-recovery` summary.
- **Root cause:** Likely the same posture-detection path as L1/L2 — the holdings sync also probes for pricing posture and waits out the unknown classification. Without live snapshots, each candidate loop spends ~5 s.
- **Impact:** Operator-visible slowness; cron jobs that run sync will tie up a slot for 2 min.

#### H2. `holdings-avg-cost.json` rewritten without semantic change
- **Symptom:** That file shows as modified in `git status` after every sync.
- **Evidence:** today's tree.
- **Root cause:** Sync writes a fresh snapshot even when avg-cost values are byte-identical to disk (timestamps / field ordering change).
- **Impact:** Diff noise; obscures real avg-cost moves over time.

#### H3. Dashboard "Today / This week" performance both show +0.00 CHF
- **Symptom:** Live dashboard says "Today +0.00 CHF (+0.00%) / This week +0.00 CHF (+0.00%)".
- **Evidence:** today's `show-dashboard.js etf` output.
- **Root cause:** Either no baseline history was populated, or daily-delta computation is gated on healthy quote posture (which is `unknown`). Cannot disambiguate yet.
- **Impact:** Dashboard delta is silently zero — easy to misread as "market flat", actually means "we don't know".

#### H4. Monthly report quartet for 2026-06-01 generated but uncommitted
- **Symptom:** 4 monthly-report files appear new and untracked.
- **Evidence:** today's `git status`.
- **Root cause:** Monthly cron fired today; report files land in `portfolio/etf/reports/monthly/` as the canonical artifact location. Either they should be tracked (history of reports), or stored in `runtime/` (transient), or gitignored.
- **Impact:** Policy ambiguity — should monthly reports live in git? If yes, commit them; if no, ignore them.

#### H5. `runtime/events/runtime-events.jsonl` is unbounded and tracked
- **Symptom:** It shows up in `git status` after every operation. Many old `acceptance-closure` / `demo` entries from days ago still in tail.
- **Evidence:** today's tail samples back to 2026-05-29.
- **Root cause:** It's an append-only log under `runtime/` but isn't gitignored. We've been excluding it on commits manually.
- **Impact:** Long-term: huge diffs; risk of leaking event payloads into commits.

---

## 2. Plan — sequenced fixes

Grouped into bite-sized phases. Each phase: scope, deliverable, verification, commit shape.

### Phase Cleanup-1A — Working-tree hygiene (low risk, immediate)

**Scope:** R1, R3, D1, H5, H4 (policy decision only).

1. **Drop redundant stash `stash@{0}`** after confirming SXR8 generic-control candidate is *not* lost.
   - Inspect `getGenericControlProbeCandidates` in `src/brokers/interactive-brokers/readiness.js`. If absent in HEAD, re-apply only that hunk as a separate commit (`feat: add SXR8 generic-control quote candidate`).
   - Else `git stash drop stash@{0}`.
2. **Add gitignore entries:**
   - `runtime/events/runtime-events.jsonl`
   - `portfolio/*/holdings-avg-cost.json` (only if H2 confirmed cosmetic — otherwise leave).
   - Decide on `portfolio/*/reports/monthly/portfolio_report_*_*.{html,pdf,json}` — propose **ignore** (keep `.md` as the human-readable canonical), since PDF/HTML are derived.
3. **Refresh memory + checklist:**
   - `memory/2026-06-01.md`: move T1 (test timeouts) + R1 (stash) from "Outstanding" to "Resolved 2026-06-01".
   - `spec-outstanding-checklist.md`: same.

**Verification:** `git status` after a sync is clean except intentional changes. `memory` + checklist agree with reality.
**Commit:** `chore(cleanup-1a): retire resolved blockers, gitignore generated artifacts`.

---

### Phase Cleanup-1B — `regenerate-dashboard.js` ergonomics (R2)

**Scope:** R2.

1. Accept either a bare portfolio name (`etf`) or a directory path (`portfolio/etf`); normalise inside the script. Mirrors `show-dashboard.js` / `sync-ibkr-after-recovery.js`.
2. Update usage line accordingly.
3. Add a `scripts/test-regenerate-dashboard-cli.js` smoke test that asserts both invocation shapes resolve to the same dashboard output (or a stub).

**Verification:** Smoke test passes. Manual run with both shapes succeeds.
**Commit:** `fix(regenerate-dashboard): accept portfolio name and directory, document contract`.

---

### Phase Cleanup-1C — Dashboard truth when readiness slow but reachable (L2)

**Scope:** L2.

1. In `dashboardGenerator.js`, distinguish three readiness outcomes:
   - **healthy live** → current behaviour.
   - **reachable + degraded quote posture** → message: "Interactive Brokers is reachable; quote posture degraded (live submission blocked, reads OK)."
   - **timed out / unreachable** → current "timed out" message.
2. The current code lumps "degraded" with "timed out" because the bounded wrapper trips on the same envelope. Pass through `readinessSnapshot.reason` (`delayed_data_only`, `marketDataMode=unknown`, etc.) when available even on timeout.
3. Add a test fixture for the new "reachable + degraded" path.

**Verification:** Re-run dashboard after a sync where fast-status reports exit 4; expect the new degraded message instead of the timeout message.
**Commit:** `fix(dashboard): describe degraded-but-reachable broker posture distinctly from timeout`.

---

### Phase Cleanup-1D — Holdings sync speed under unknown posture (H1)

**Scope:** H1, H2.

1. Profile `holdingsSync.js` end-to-end during one run (instrument with `Date.now()` checkpoints) to confirm the 124 s is concentrated in posture detection vs. position pulls vs. avg-cost writes.
2. If posture detection dominates: cap posture probe wall-clock to 8 s total (not per-probe), and emit a single `posture=unknown` outcome on first total-budget overshoot.
3. For H2: only rewrite `holdings-avg-cost.json` if the canonicalised JSON differs from disk.

**Verification:** Time `sync-ibkr-after-recovery.js etf` and confirm ≤30 s wall-clock under same posture. `git status` shows `holdings-avg-cost.json` unchanged when avg-cost moves are zero.
**Commit:** `perf(ibkr): bound posture-probe wall-clock; skip identical avg-cost writes`.

---

### Phase Cleanup-1E — Dashboard delta truth (H3)

**Scope:** H3.

1. Decide policy:
   - **A:** "Today / This week" stays numeric but explicit when quote posture is unknown → render `Today: — (posture unknown)`.
   - **B:** keep numeric zero but add a one-line caveat below.
2. Implement (A) in `dashboardGenerator.js`; add fixture.
3. Update `show-dashboard.js` to honour the new field.

**Verification:** Fixture test passes. Manual run under degraded posture shows `—`/caveat instead of `+0.00`.
**Commit:** `fix(dashboard): surface posture-unknown deltas instead of silent zero`.

---

### Phase Cleanup-1F — Cron delivery hardening (C1, C2)

**Scope:** C1, C2.

1. **Audit each active job** for `--best-effort-deliver`. Re-apply where missing (TOOLS.md flagged 1 job that couldn't be patched — `verify-six-l1-subscription-monday` — investigate the validation quirk and either patch the gateway-side validator or remove the job).
2. **Decide announce target:** either configure a `chatId` for the announce route (cleanest), or switch periodic outputs to email/file delivery already supported by reporting paths.
3. **Repair `portfolio-health-monitor` immediately:** rerun or disable until C2 is resolved.

**Verification:** `openclaw cron list` shows zero `error` jobs and no `no route, will fail-closed` warnings — OR the deliberate decision to keep file-only output is documented.
**Commit:** `fix(cron): harden delivery and clear portfolio-health-monitor errors`.

---

### Phase Cleanup-1G — Config tidy (T2)

**Scope:** T2.

1. `gateway config.schema.lookup messages.groupChat.visibleReplies` to find the rename.
2. `gateway config.patch` (or direct edit + doctor) to migrate; validate with `openclaw doctor`.
3. Backup as `~/.openclaw/openclaw.json.bak-cleanup-1g`.

**Verification:** Doctor output no longer warns. No restart needed unless schema marks the path protected.
**Commit:** `chore(config): migrate deprecated messages.groupChat.visibleReplies key`.

---

### Phase Cleanup-1H — Quote posture (L1) — investigate, don't auto-fix

**Scope:** L1.

1. Confirm IB account market-data subscriptions on the IBKR side (this is an external action — needs operator login to IBKR client portal, not autonomous).
2. From our side, add a runbook entry in `docs/operations/ibkr-recovery.md` explaining how to verify subscriptions, where to look in the gateway UI for the data farm status, and how to test from `python -c` via `ib_insync` for cross-check.
3. Document the operator action explicitly in the plan; do **not** attempt to "fix" subscriptions automatically.

**Verification:** Runbook updated; this phase ends with a hand-off to the operator.
**Commit:** `docs(ibkr): runbook for clearing quote-posture-unknown`.

---

## 3. Suggested sequencing

Two safe-to-batch tranches plus one operator-gated step:

- **Tranche 1 (autonomous, today/tomorrow):** 1A → 1B → 1G → 1C
  - Cleans the working tree, ships ergonomics + truthful messaging, no risk to live path.
- **Tranche 2 (autonomous, deeper):** 1D → 1E → 1F
  - Touches sync perf, dashboard semantics, and cron — needs more careful regression coverage.
- **Tranche 3 (operator-gated):** 1H
  - Requires Graham's hands on the IBKR client portal.

Each phase ends with: focused tests → `git status` verification → clean commit (excluding generated churn) → push.

---

## 4. Out of scope for this plan

- FX cash reconciliation (PARKED).
- Retired email-reply approval lane (DROPPED).
- Control UI direct embedding (BLOCKED).
- Live order submission (gated by 1H).

## 5. Open questions for Graham

1. **H4 / monthly reports:** track in git, or ignore PDF/HTML and keep only the `.md`?
2. **C2 / cron delivery:** configure a `chatId` for announce, switch to email/file output, or leave as-is and rely on dashboard?
3. **L1 / market-data subscription:** are IBKR market-data packages still active on U25624150? (Decide before chasing it from our side.)
