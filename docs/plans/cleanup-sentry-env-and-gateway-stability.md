# Cleanup Plan — Sentry cron `.env` + IB Gateway socket stability

**Created:** 2026-06-15 12:22 UTC · **Owner:** bb8 · **Status:** READY (awaiting go-ahead per cleanup)
**Context:** Two non-urgent reliability gaps surfaced during the 2026-06-15 R2SC execution. Neither blocks trading; both cause silent/repeated operational noise.

Both cleanups are **independent** — can be done in either order or separately. Each ends with a verification step and a single focused commit.

---

## Cleanup A — Sentry autofix cron silently no-ops (missing `.env` load)

### Root cause (verified)
- `scripts/sentry-autofix-weekly.js` reads `process.env.SENTRY_AUTH_TOKEN / SENTRY_ORG_SLUG / SENTRY_PROJECT_SLUG` directly.
- `require('../lib/observability/bootstrap')` only **initialises Sentry** from env; it does **not** load `.env`.
- The Mon 09:00 Zurich cron runs via `agentTurn` → `node scripts/sentry-autofix-weekly.js` with **no `.env` exported** → those vars are empty → script exits early with "SENTRY_AUTH_TOKEN, SENTRY_ORG_SLUG, and SENTRY_PROJECT_SLUG are required" and processes **0 issues**.
- Same gap affects `scripts/fetch-sentry-issues.js` (reads `process.env.SENTRY_*` directly).
- Confirmed 2026-06-15: the weekly run only succeeded because I manually injected `.env` into the child env.

### Design
Add a tiny, dependency-free env loader and call it at the top of the unattended Sentry entry points. Do **not** add `dotenv` (no new dependency; repo has no dotenv today).

1. **New helper:** `lib/loadEnvFile.js`
   - Parses `<repoRoot>/.env` (KEY=VALUE, strips matched quotes, ignores comments/blank lines).
   - **Non-destructive:** only sets a key if `process.env[KEY]` is not already set (real env always wins over file).
   - No-op (silent) if `.env` is absent. Never throws.
   - Returns the count of keys applied (for optional debug logging).
2. **Wire into `lib/observability/bootstrap.js`** as the single chokepoint:
   - Call `require('../loadEnvFile')()` **before** `require('./sentry')` initialises, so `SENTRY_DSN` etc. are present.
   - Because every unattended Sentry entry point already requires `bootstrap`, this fixes both `sentry-autofix-weekly.js` and any other bootstrap consumer in one place.
   - Guard with idempotency (bootstrap is already idempotent; the loader is naturally idempotent via the "don't overwrite" rule).
3. **Leave `fetch-sentry-issues.js` as-is** unless it lacks bootstrap — check and, if needed, add a direct `require('../lib/loadEnvFile')()` near its top.

### Risk / blast radius
- **Low.** Pure additive read of an existing file. Real environment variables still take precedence, so nothing that currently works can break. No secret values printed.

### Verification
- Unit test `scripts/test-load-env-file.js` (safe lane): parsing, quote-stripping, comment skip, "don't overwrite real env", missing-file no-op.
- Functional: run `node scripts/sentry-autofix-weekly.js --dry-run` in a shell with `SENTRY_*` **unset** in the inherited env → confirm it now reads from `.env` and does NOT bail on missing token.
- Re-run safe lane (expect 256/256 with the new test).
- Optional: `openclaw cron run <sentry-autofix-weekly id>` to confirm the real cron path now authenticates. (Mutates nothing destructive; autofix only resolves issues end-to-end which is its intended job — confirm with Graham before a live trigger.)

### Commit
`fix(observability): load .env in bootstrap so Sentry cron stops silently no-opping`

---

## Cleanup B — IB Gateway `:4001` socket drops after login

### RESOLVED 2026-06-15 — no code/config change needed (root cause: self-inflicted restart collisions)

**Diagnosis verdict (verified live 2026-06-15 12:34 UTC):**
- The current gateway (java pid 1942) has been **up and stable for ~1h** since 11:25; readiness `reason: ready`.
- The morning `IBC returned exit status 1` events at 11:11 / 11:19 / 11:27 were **my own repeated manual `start-ibc.sh` invocations** racing a session that was already healthy.
- `ExistingSessionDetectedAction=primary` (in `/opt/ibc/config.ini:329`) did exactly the right thing: it kept the **running** session and made the **new colliding login** exit non-zero. The "exit status 1" is the *new* process losing, not the live session dying.
- The existing guards are already correct and were verified:
  - **Launcher guard:** a second `start-ibc.sh` early-exits with "Existing IB Gateway IBC launcher already running; not starting a duplicate" (exit 0) — proven live, healthy session untouched.
  - **Keepalive guard:** `scripts/ibkr-native-keepalive.js` returns immediately on `firstStatus === 'ready'` and never calls `startGateway` over a healthy session.

**Conclusion:** there is **no standing config defect and no code change required**. The fix is operational discipline, already documented: never fire a second `start-ibc.sh` while `:4001` is up. Earlier theory of a config bug is withdrawn.

**Action taken:** documented the confirmed root cause in `TOOLS.md` (IBKR native gateway recovery) and `memory/2026-06-15.md`. No commit to executable code for B.

---

### Original plan (kept for history — superseded by the verdict above)

### Root cause (partially verified — needs a focused diagnosis pass)
Two distinct things were conflated this morning:
1. **Duplicate-launcher race (mostly already guarded):** `start-ibc.sh` *does* have a single-instance guard (`pgrep -f "/opt/ibc/scripts/ibcstart.sh ${GW_VERSION} ...--tws-settings-path=..."`). So a second `start-ibc.sh` invocation should early-exit. But during the session the socket still dropped, so the guard alone is not the whole story.
2. **IBC exits after the config dialog (`IBC returned exit status 1`):** the launcher logs showed login + 2FA succeeding, the Trader Workstation Configuration dialog opening, then IBC exiting non-zero. This is the real instability and is **not** explained by the duplicate guard.

### Plan — diagnose before changing anything
This is config/process territory on a live broker path, so **inspect first, change minimally, never clobber**.

1. **Reproduce + capture (read-only):**
   - One clean start: `pkill -f ibcstart.sh`, confirm no procs/listener, then a single `start-ibc.sh`.
   - Tail `/home/ubuntu/ibgateway-native/logs/ibgateway-ibc.out` and `/home/ubuntu/Jts/launcher.log` around the config-dialog → exit window. Capture the exact stack/lines preceding `IBC returned exit status 1`.
2. **Check the known config seams (do not edit yet):**
   - `/opt/ibc/config.ini` — `ReadOnlyApi`, `AcceptIncomingConnectionAction`, `AllowBlindTrading`, `OverrideTwsApiPort`, dialog-handling flags (`ReadOnlyLogin`, `MinimizeMainWindow`, `ExistingSessionDetectedAction`).
   - `/home/ubuntu/Jts/jts.ini` — `[IBGateway]`/API port + trusted IPs.
   - **`ExistingSessionDetectedAction`** is the prime suspect: if set to `manual` or `primary`, a re-login (e.g. keepalive cron at 08:00/13:00 UTC, or my manual start) can knock the live session into an exit. Preferred value for an unattended single login is usually `primaryoverride` or `secondary` depending on intent — **confirm against IBC docs before changing.**
3. **Form a single hypothesis, make ONE minimal change:**
   - Most likely: set `ExistingSessionDetectedAction` so a duplicate login does not kill+exit the running gateway, OR fix whichever config flag IBC is choking on at the dialog step.
   - **Back up** the file (timestamped copy) before editing. Requires elevated write to `/opt/ibc` — this host runs exec as `ubuntu` (uid 1000) which **cannot** write `/opt/ibc`. So: either (a) request an elevated/root-capable approval, or (b) hand Graham the exact one-line patch + restart command to apply. (This morning proved `/approve` does not grant root here.)
4. **Restart + soak test:**
   - Clean restart, confirm `:4001` comes up, then **leave it 15–20 min** and re-check the socket + `node scripts/check-interactive-brokers-readiness.js` to confirm it stays up (the failure was a *drop after* coming up, so a point-in-time check is insufficient).
5. **Optional hardening (only if root cause is the duplicate-login race):**
   - Tighten the keepalive (`scripts/ibkr-native-keepalive.js`): before calling `startGateway`, it already classifies `api_ready`; add an explicit "if `api_ready`, never call start" assertion so the keepalive can never trigger a re-login that kills a healthy session.

### Risk / blast radius
- **Medium-high** (live broker config). Mitigations: inspect-first, timestamped backup, one minimal change, soak test, and operator-applied patch if root write is needed. Do **not** rewrite either ini file wholesale.

### Verification
- `:4001` stays listening for ≥15 min after a clean start with no manual re-touch.
- `node scripts/check-interactive-brokers-readiness.js` → `reason: ready`.
- Trigger one keepalive cycle (or wait for the scheduled one) and confirm it does **not** drop the session.
- Update `TOOLS.md` "IBKR native gateway recovery" + `memory/2026-06-15.md` with the confirmed root cause and the exact fix.

### Commit (code portion only; ini lives outside the repo)
`fix(ibkr): prevent keepalive re-login from dropping a healthy gateway session` (only if step 5 code change is made)
Plus a `TOOLS.md` doc update commit.

---

## Suggested order
1. **Cleanup A first** — low risk, fully autonomous, immediate value (next Monday's cron actually runs).
2. **Cleanup B second** — needs a diagnosis pass and possibly an operator-applied root edit; schedule when Graham can apply a patch / approve elevated write if required.

## Open questions for Graham
- **B:** OK to request an elevated/root approval for a minimal `/opt/ibc/config.ini` edit, or do you prefer I hand you the exact patch + restart command to apply yourself?
- **A:** OK to do a live `openclaw cron run` of the Sentry job after the fix to confirm end-to-end auth, given autofix can resolve issues end-to-end?
