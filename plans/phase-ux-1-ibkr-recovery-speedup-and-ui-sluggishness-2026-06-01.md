# Phase UX-1 — IBKR Recovery Speedup + UI Sluggishness Investigation

Date: 2026-06-01
Owner: bb8 (autonomous)
Trigger: Graham reported (a) the 2026-06-01 IBKR recovery took far too long despite a fast 2FA and (b) the OpenClaw control UI currently feels sluggish.

This is not a wishlist. It is a focused two-track plan: prevent another all-day IBKR recovery, and make the UI snappy again. Each track has concrete checks first, then fixes.

---

## Concrete symptoms observed (2026-06-01 ~17:43 UTC)

System level:
- Load average: 7.74 / 8.22 / 8.75 — sustained high
- Memory: 4 GB total, 1.3 GB used, 2.6 GB free (fine)
- Main `openclaw` process: 22.4% MEM, 939 MB RSS, ~4-day uptime
- IB Gateway Java (`ibgateway`): 496 MB RSS, includes JxBrowser + JavaFX
- Xvfb on `:99` running for IB Gateway GUI
- Swap: 0 (so anything heavy hits real memory)

OpenClaw level:
- 54 active sessions, several cron sessions accumulating (oldest visible: 3 days)
- Main session token usage: 105k/200k (53%)
- One subagent session 47h old still tracked
- Tasks: 0 active, 12 issues, 144 tracked
- Recent cron runs include several "blocked by exec policy" / "did not return live JSON before timeout" entries

These are the kinds of conditions that make the UI feel laggy: high CPU contention, a fat main process, lots of long-lived sessions, and many heavy cron task histories rendered into the operator surfaces.

---

## Track A — Stop IBKR recoveries from eating a day

Goal: when IBKR auth dies, the recovery path should be sub-30-minutes including human 2FA, not multi-hour diagnosis.

### A1. Fast-path readiness probe (5 min)
- Add `scripts/ibkr-fast-status.js`: one command that prints, in <5 seconds:
  - native socket up? (`:4001` listener)
  - auth completed? (managed-accounts within 3s)
  - read client id behaving? (positions count > 0 within 5s)
  - quote posture? (live / delayed / unpriced)
- Surface this as a single "tier 1" command in `docs/operations/ibkr-recovery.md`.

### A2. Recovery runbook with bisection order
- Create `docs/operations/ibkr-recovery.md` (canonical) with the bisection ladder I actually used today:
  1. socket alive? → if no, restart `start-ibc.sh`
  2. auth done? → if no, login/2FA on `:99` (human-only step)
  3. raw probe vs wrapper diff → if raw works and wrapper doesn't, suspect client-id / event-handler issue
  4. wrapper sees positions but writes empty? → suspect concurrent-read interference
  5. holdings written but dashboard stale? → suspect quote-resolution / readiness hang
- Each step links to the exact diagnostic command.
- Place the runbook URL at the top of `playbook.md` so future-me reads it before flailing.

### A3. Auto-retry with bounded budget
- Today, when the first sync after 2FA returns empty, I manually re-ran multiple scripts. That's 80% of the wasted time.
- Add a small wrapper `scripts/sync-ibkr-after-recovery.js` that:
  - runs `accounting-snapshot` then `holdings` serially under the existing sync guard
  - if either returns "preserved last known good", retries once after a randomized 5–10s pause
  - prints a one-line truthful summary
- Wire it into the recovery runbook as the "after 2FA, run this" command.

### A4. Honest readiness in dashboard
- Already done in IBKR-B2 (bounded readiness). Verify and add a regression so this can't quietly regress: `scripts/test-dashboard-bounded-readiness.js`.

### A5. Tests that catch what I missed today
- Regression for: `clientId=101` returning empty managed-accounts → mocked native fixture covering the empty-managed-accounts → fall-through-to-positions path.
- Regression for: parallel `sync-*` invocations → assert one returns `sync_in_progress` deterministically.
- Regression for: empty authenticated read with existing snapshot → assert preserve, not write false-zero.
- (First two exist; verify the third explicitly under both holdings + accounting paths.)

---

## Track B — Find and fix the UI sluggishness

Goal: feel snappy again, with evidence rather than guesses.

### B1. Measure first
- Run and capture:
  - `openclaw status --deep` once, save under `runtime/diag/2026-06-01-status-deep.txt`
  - `top -b -n 1 -o %CPU` snapshot
  - `pidstat -d 5 5` for IO contention
  - Render-time of the main UI surfaces: time `node scripts/show-dashboard.js etf` and `openclaw tasks` and `openclaw cron list`
- Save to `runtime/diag/ui-perf-2026-06-01.json` so we can compare before/after.

### B2. Likely culprits to validate (not assume)
Rank-order suspicion based on what I see right now:

1. **Stale long-lived sessions** — 54 active sessions, several cron sessions days old, one subagent 47h old. Each session adds memory + render cost.
   - Fix: prune sessions older than 24h with no activity using `openclaw sessions clean` (verify the exact command first; if it doesn't exist, add a thin script).
   - Add a heartbeat task that runs daily to enforce session retention.

2. **Cron task history accumulation** — 144 tracked tasks, 12 issues. If task list is rendered eagerly anywhere in the UI, this scales linearly.
   - Fix: confirm task-list rendering is paginated/bounded; if not, bound it.
   - Archive resolved tasks older than 7 days.

3. **Main process memory bloat** — 939 MB RSS after ~4 days. Could be normal for cached transcripts, or could be a leak.
   - Fix: compare RSS with a fresh restart. If a fresh restart drops to ~300 MB and creeps back, that's a leak — file it. If 939 MB is steady-state, it's design.
   - Restart only with explicit confirmation since main session is mid-conversation.

4. **IB Gateway JxBrowser** — IB Gateway runs an embedded Chromium for its UI even when we don't need it. ~500 MB resident.
   - Fix: it's already configured headless via Xvfb, but check whether `ibcsessionid` settings can suppress JxBrowser when GUI isn't needed.
   - Lower priority; this is broker-side, not OpenClaw-side.

5. **Render cost of main session transcript** — Main session at 105k/200k tokens. If the UI re-renders the full transcript on every event, that gets slow.
   - Fix: read the control-ui rendering code path; if it's full-scrollback re-render, propose virtualized rendering. Otherwise document as not-the-problem.

6. **High load average (7.7) with low active CPU** — That's typically IO-bound or kernel-task-bound. Could be cron jobs piling up or filesystem churn.
   - Fix: run `iostat -x 5 5` and check for `await` spikes; also `journalctl -k --since "1 hour ago" | tail -50`.

### B3. Concrete fixes to land (depending on B1/B2 results)
For each confirmed cause, a one-commit fix with regression coverage where reasonable. Don't optimize what's not slow.

Default queue (if all suspicions hold):
1. Session pruning helper + heartbeat job → `commit: prune stale sessions to keep operator UI responsive`
2. Bound task-list rendering / archive old tasks → `commit: bound rendered task history surface`
3. Investigate main-process RSS growth, file as separate issue if real → no commit unless we have a fix
4. JxBrowser suppression probe → `commit: only run IB Gateway GUI deps when needed` (only if it actually helps)

### B4. Test/verification
- After fixes, re-run B1 measurements and compare. Save to `runtime/diag/ui-perf-after-2026-06-01.json`.
- Acceptance: `node scripts/show-dashboard.js etf` and `openclaw status` each return in <2 s on this host.

---

## Sequencing

Today (post-plan-commit):
- A1 (fast-status script) and A2 (runbook) — small, high-value, autonomous.
- B1 measurement capture — autonomous, no risk.

Then, with evidence in hand:
- A3, A4, A5 — autonomous, normal commit/push per phase.
- B2 investigation results → B3 fixes, asking before any restart of the running process.

Out of scope:
- Anything that requires changing the channel/control-ui app source itself unless we already have repo access; if not, document findings and surface them.
- IBKR upstream changes (JxBrowser, IBC).

## Risks / hard stops

- Restarting the main `openclaw` process kills the active conversation. Will only do that with explicit confirmation.
- Pruning sessions is destructive to cached context; prune only sessions with no recent activity AND not marked sticky.
- "UI sluggish" is a perception measure; if B1 shows no objective slowness, say so honestly and shift focus to A.

---

## Definition of done

A is done when:
- `scripts/ibkr-fast-status.js` exists and is documented
- `docs/operations/ibkr-recovery.md` exists with bisection order
- `scripts/sync-ibkr-after-recovery.js` exists with retry-on-preserve
- New regressions exist for each gap above and pass

B is done when:
- B1 measurements are captured to `runtime/diag/`
- Each ranked suspicion is either confirmed-with-fix or ruled-out-with-evidence
- Acceptance latency (<2s) holds for the two named commands

If B1 shows the UI is fine and only one command is slow, scope down to that one command and ship.
