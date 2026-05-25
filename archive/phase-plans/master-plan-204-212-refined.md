> **[HISTORICAL]** This plan describes the 2026-05-23 reconnaissance and the cron/sandbox hot-fix lane. The actions it called for were applied and the lane was closed by Phase 204c. For the current backlog see `ROLLUP_OUTSTANDING_PLAN.md`; for the active stabilization sweep see `stabilization-master-plan-2026-05-25.md`.

# Master Plan Refinement — 2026-05-23

_Supersedes the "next steps" in `master-plan-204-212.md` (committed 9459030). Adds two critical findings from the 2026-05-23 00:30 UTC reconnaissance._

## What's already done

- ✅ `master-plan-204-212.md` (committed 9459030) — overall roadmap.
- ✅ Phase 204 plan + initial implementation (`e68ea50`): per-job `sessionTarget: 'current'`, `delivery.mode: 'announce'`. **INCOMPLETE — see Finding A.**
- ✅ Phase 205 (`56d8ed8`): Markdown rendering of attention + currencyDeployment bullets in `approvals-queue.md`. Tests passing.
- ✅ Phase 206 plan (`c8a5dba`, `5404ec2`).
- ✅ Phase 206 modules WRITTEN but NOT WIRED:
  - `src/reporting/sparkline.js` — pure-render inline SVG, Mailgun-safe.
  - `src/reporting/historyDigest.js` — `readNetLiqHistory` with end-of-day dedupe.
  - `src/reporting/cronHealthCard.js` — severity classifier (ok/warning/alert/critical/stale).
  - `scripts/test-dashboard-v2-modules.js` — covering all three.
  - **Still TODO**: wire into `dashboardGenerator.js` (cockpit index) + `summaryArtifacts.js` (daily-summary).

## Two critical findings (this session)

### Finding A — Phase 204 hot-fix is incomplete; crons still 100% red

Despite per-job `sessionTarget: 'current'`, every health/sync cron is still failing with:
> _"Sandbox mode requires Docker, but the Docker daemon is not available."_

State as of 2026-05-23 00:30 UTC:

| Job | consecutiveErrors | Last error |
|---|---:|---|
| `portfolio-etf-daily-sync-and-dashboard` (0ddfde6d) | **26** | Docker sandbox |
| `portfolio-health-monitor-etf` (7dfbbec5) | **24** | Docker sandbox |
| `daily-rebalance-check` (1ec58679) | **11** | Docker sandbox |
| `weekly-report` (eb3fc666) | 3 | Docker sandbox |
| `monthly/quarterly-report` (8b1c0de5, d350c3c1) | 1 each | Docker sandbox |
| `ibkr-native-gateway-keepalive` (3aef6007) | 1 | Agent run error (not Docker) |

**Root cause:** `agents.defaults.sandbox.mode = "non-main"` in `~/.openclaw/openclaw.json`. Per-job `sessionTarget: 'current'` does NOT override this — the gateway's sandbox subsystem still demands Docker for any non-main agent run.

**Fix:** Set `agents.defaults.sandbox.mode = "off"` (or `"workspace"`) globally. This is a one-line gateway config change requiring restart.

### Finding B — `announce` delivery is silently failing because Telegram has no chatId

All `delivery.mode: 'announce'` jobs route through Telegram (the only configured channel) but have no `chatId` set. From the cron delivery previews:
> _"last -> no route, will fail-closed: Delivering to Telegram requires target <chatId>"_

So even when a job DOES surface a failure, the notification itself fails. Two layers of silence.

**Fix:** Route cron `delivery.mode: 'webhook'` to an email-delivery webhook, OR (simpler) add a per-job `delivery.to: '<chatId>'` once Graham provides one. Mailgun is already configured and working for `--send-email` direct path — we should make email the primary delivery for cron failures.

## Refined phase sequence (immediate → next)

### Phase 204c — Gateway sandbox + delivery routing hot-fix [DO FIRST]
- `gateway config.patch` → set `agents.defaults.sandbox.mode = "off"`.
- Validate: re-run a previously-failing cron manually (`cron run <id>`) and confirm it succeeds.
- Establish email-primary delivery for cron failures. Either:
  - (a) Add `delivery.to` chatId on each cron (operator action), OR
  - (b) Switch cron delivery to a webhook that calls `sendEmailMessage` directly — simpler, no operator action needed.
- Disable the three dead cron jobs (UBSPX-retry, submit-orders-at-market-open, monitor-trade-fills) to remove clutter.
- Reset `consecutiveErrors` on currently-red jobs by running each once.

**Acceptance:** All previously-red jobs run green on next scheduled tick OR on manual `cron run`. Failure path delivers an email to `lancashire@swift.ch`.

### Phase 206b — Wire dashboard v2 modules [BUILD ON EXISTING]
The modules from Phase 206 exist; just need to plug them in.
- Add `<section class="card">` for Net-Liq sparkline to `summaryArtifacts.js` daily-summary template.
- Add `<section class="card">` for Cron Health to `dashboardGenerator.js` index template.
- Render allocation drift bars (already in summaryArtifacts) into daily-summary.html.
- Per-instrument health table (drift% + quote-quality tier + last-fill) on portfolio-overview.html.
- Tests: `test-dashboard-renders-v2-sections.js` — assert presence of new sections; reuse existing snapshot pattern.

**Acceptance:** Visiting `runtime/overview/daily-summary.html` shows a sparkline + drift bars + per-instrument health. `index.html` shows cron health card.

### Phase 207 — Periodic HTML email digest
- New CLI: `scripts/send-dashboard-digest.js [--portfolio=etf] [--frequency=daily|weekly]`.
- Reuses `emailHtml.js` page/card helpers; embeds the Phase 206 sparkline + cron health + drift bars + per-instrument table.
- Subject: `"[etf] Daily portfolio digest — {date}"` / `"[etf] Weekly portfolio digest — week of {date}"`.
- Body sections: KPI grid, allocation drift, instrument health, cron health, recent fills, open issues, breakdown link.
- Cron: `0 7 * * 1-5` (daily 07:00 UTC, before SIX open) + `0 17 * * 5` (weekly Friday 17:00 UTC, after SIX close).
- Tests: snapshot the rendered HTML against a fixture; assert subject + recipient + presence of all sections.

**Acceptance:** Operator receives a single well-formatted HTML email at the scheduled times; image-free (inline SVG); clickable mailto-style links work in Gmail/Apple Mail.

### Phase 208 — Self-heal v2 (auto-fix categories)
Today's `buildSelfHealPlan` returns commands as text but doesn't execute. Expand:

- **Inbound-request event log**: `runtime/observability/event-log.jsonl` capturing every cron tick + its outcome (success/failure/skipped) + payload classification.
- **Auto-classify failures** by symptom (regex matchers):
  - `sandbox.*Docker` → recommend `agents.defaults.sandbox.mode = "off"`.
  - `Delivering to Telegram requires target` → flag missing chatId; offer to switch to email.
  - `ECONNREFUSED 127.0.0.1:4001` → IBKR gateway down; offer restart via `start-ibc.sh`.
  - `2FA pending` → email operator; do not auto-retry (per established constraint).
  - `consecutiveErrors >= 10` → auto-disable cron job (Phase 204 invariant).
  - `subscription` / `error code 10089` → flag subscription gap, do not auto-buy.
- **Heal recipes** (idempotent, conservative — opt-in via flag):
  - `clear_circuit_breaker_if_subscription_active` — only after subscription probe returns ✅ LIVE.
  - `disable_cron_after_N_consecutive_errors` — auto-disable jobs ≥ 10 consecutive errors.
  - `restart_ibkr_gateway_if_socket_dead` — only during market hours; otherwise email.
  - `archive_stale_envelopes` — superseded proposals older than 24h.
  - `sweep_superseded_proposals` — runtime cleanup.
- **Open issues surfaced** for any unfixable category.
- Tests: per-recipe unit tests against canned event-log fixtures.

**Acceptance:** Running `node scripts/run-health-check.js portfolio/etf --self-heal` produces a JSON with `{ classified: [...], healed: [...], openIssues: [...] }`. Each heal recipe has a passing test.

### Phase 209 — Health email v2 (HTML report bundling 208 output)
- Add "Issues auto-healed this cycle" section to `healthReport.js` HTML.
- Add "Open issues for operator" with concrete `cron <action>` / `node scripts/...` commands.
- Add "Trends" (last 7 cron-runs success/fail histogram per job).
- Update `--send-email` flag to use the v2 layout.
- Tests: rendered HTML for each section.

**Acceptance:** Health monitor cron emits an HTML report covering healed issues + open issues + trends.

### Phase 210 — Pre-existing 7 test failures
Triage each in order:
1. `mailgun CLI arg` — fix or document.
2. `lifecycle summary deliveryStatus` — fix or document.
3. `stage-order timing` — fix or document.
4. `summary-backfill text` — fix or document.
5. `trade-proposal math` — fix or document.
6. `trading-guards` — fix or document.
7. `report-execution-lifecycle-summary` — fix or document.

**Acceptance:** Either all green, or each documented as "ACCEPTED RED" with rationale in `docs/known-test-failures.md`.

### Phase 211 — Workspace cleanup + diagnostics organization
- Move `scripts/probe-*.js` → `scripts/diagnostics/`.
- Sweep `runtime/basket-proposals/etf/.superseded/` older than 7 days.
- Garbage-collect `runtime/approved-order-baskets/etf/` of fully-executed baskets older than 30 days.
- Sweep `runtime/circuit-breakers/etf/` of breakers cleared more than 7 days ago.
- Update `.gitignore` to never pick up `runtime/observability/` etc.
- Document the cleanup cron schedule (weekly Sunday 02:00 UTC).

**Acceptance:** Workspace footprint reduced; no dangling test failures; cleanup job runs automatically.

### Phase 212 — Docs
- Update `docs/basket-execution-runbook.md` with the new dashboard + email layout.
- Add `docs/dashboard-v2.md` explaining each card + data source.
- Add `docs/self-heal-recipes.md` documenting each recipe + opt-in flags.
- Add `docs/email-digest.md` covering subject, schedule, sections.
- Update `TOOLS.md` cron invariants with the gateway sandbox mode fix.

**Acceptance:** A new operator could pick up the project from docs alone.

## Workspace-wide attention items (part C)

Beyond the phase work, this is the standing backlog:

1. **Heartbeat watchdog** — `HEARTBEAT.md` is currently empty; consider a 4×/day passive check that pings the daily-sync cron health and the basket reproposal queue.
2. **Memory hygiene** — `memory/2026-05-22.md` and `memory/2026-05-23.md` are large; review weekly and promote durable items to `MEMORY.md`.
3. **Pre-commit hook** — no `.husky/` or `.git/hooks/pre-commit`. Add a hook that runs the focused test list (`scripts/test-*.js`) before allowing a commit.
4. **Stale Phase 204 plan files** — multiple Phase 204 plan files (`phase-204-cron-hotfix-plan.md`, `phase-204-render-annotations-in-markdown-plan.md`) exist; the second is really Phase 205. Rename or remove duplicates.
5. **`searchContracts` wrapper false-negatives** documented in MEMORY but not yet patched in the wrapper itself. Consider Phase 213.
6. **SPMCHA Monday verification** — cron `6d4dd0e1` fires 2026-05-25 08:15 UTC. Monitor; do not act until verdict is LIVE.
7. **Round-2 basket ready** — `runtime/basket-proposals/etf/basket-etf-20260522T1552.json` is staged but circuit-broken. Won't auto-execute. Manual replay needed Monday.
8. **Hardcoded `lancashire@swift.ch`** — should be `MAILGUN_RECIPIENT` env var with fallback. Tiny refactor; folds into Phase 207.

## Decision points blocking autonomous execution

The plan can largely run autonomously, but Graham should explicitly bless ONE thing:

- ☑ **Set `agents.defaults.sandbox.mode = "off"`** globally — affects all sessions and sub-agents, not just cron. Trade-off: simpler/working; downside: agent runs share the workspace filesystem with no isolation (matches current main-session behaviour). Alternative: install Docker (heavier).

Once that's approved, Phases 204c → 212 can chain without further operator gates.

## Execution order summary

```
204c (gateway hot-fix)        ← BLOCKING; needs 1 approval
  └─ 206b (wire dashboard)     ← chain
      └─ 207 (email digest)
          └─ 208 (self-heal v2)
              └─ 209 (health email v2)
                  └─ 210 (test failures)
                      └─ 211 (cleanup)
                          └─ 212 (docs)
```

Monday 2026-05-25 08:15 UTC: SPMCHA verification cron fires independently of this chain.
