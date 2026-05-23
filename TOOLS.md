# TOOLS.md - Local Notes

Things that matter in this setup:

### Cron job invariants (revised 2026-05-23, Phase 204c)
- This host has **no Docker daemon**.
- **`agents.defaults.sandbox.mode` MUST stay `"off"`** in `~/.openclaw/openclaw.json`. Any other value (`"non-main"`, `"all"`) makes cron sub-agent turns demand Docker and fail 100%. Per-job `sessionTarget: 'current'` is necessary but **NOT** sufficient — the gateway sandbox subsystem runs upstream of session targeting.
- **Gateway restart is required** after changing `agents.defaults.sandbox.mode` — SIGUSR1 soft reload does not pick it up. `kill -KILL <pid>` is safe: supervisord respawns within 5-10s.
- Use `sessionTarget: 'current'` for cron jobs that should run in the main agent session.
- `delivery.mode: 'announce'` currently fails-closed on this host because Telegram is the only channel and no chatId is configured. Cron *job state* is unaffected (consecutiveErrors resets correctly when the agent turn succeeds), but cron *output* does not reliably reach the operator. Prefer email-backed reporting paths where available.
- **Set `--best-effort-deliver` on every cron job** to prevent delivery-layer failures from incrementing consecutiveErrors. Applied 2026-05-23 via `openclaw cron edit <id> --best-effort-deliver` to 6 active jobs (verify-six-l1-subscription-monday skipped — has a payload-update validation quirk).
- After 3 consecutive cron errors, prefer `cron disable` over leaving them red.
- Health/reporting flows now surface cron severity through dashboard + digest + health-report paths; use those before blindly rerunning failing jobs.
- See `master-plan-204-212-refined.md` and `phase-204c-gateway-sandbox-disable-report.md` for the validated fix path. The original `phase-204-cron-hotfix-plan.md` reflects only the (necessary but insufficient) per-job hot-fix step.

### Runtime cleanup (Phase 211)
- Conservative cleanup helper:
  - `node scripts/cleanup-runtime-artifacts.js --portfolio=etf --dry-run`
  - `node scripts/cleanup-runtime-artifacts.js --portfolio=etf`
- Current cleanup scope is intentionally narrow:
  - superseded basket proposals older than the retention window
  - superseded **terminal** approved baskets older than the retention window
  - **cleared** circuit breakers older than the retention window
- Cleanup does **not** delete active circuit breakers, active approval state, or unsuperseded basket artifacts.
- The diagnostics probes moved under `scripts/diagnostics/`, but the legacy wrapper paths remain valid for operator muscle memory.

### IBKR native gateway recovery
- Known-good native path: `/home/ubuntu/ibgateway-native/start-ibc.sh`
- That wrapper must use the pinned install4j runtime:
  - `/home/ubuntu/.local/share/i4j_jres/Oda-jK0QgTEmVssfllLP/17.0.16.0.101-zulu_64/bin/java`
- Do not let IB Gateway fall back to system Java (it broke the launcher and produced `NoClassDefFoundError: javafx/scene/Parent` / headless splash failures).
- Known-good gateway config expects the API socket on `127.0.0.1:4001`.
- `jts.ini` is at `/home/ubuntu/Jts/jts.ini`.
- The launcher may expose only the IBC command port (`7462`) until the GUI login / 2FA step is completed.
- If readiness says `connect ECONNREFUSED 127.0.0.1:4001`, the wrapper started but the gateway has not completed login and exposed the API port yet.
- Last verified launch display: `:99` via Xvfb.
- The practical finish step is completing the IB Gateway login / second-factor approval on that display, then rerunning `node scripts/check-interactive-brokers-readiness.js`.

### Repo hygiene
- A local pre-commit hook lives in `.githooks/pre-commit` and runs the focused verification subset before commits.
- If hooks are bypassed for an emergency commit, rerun the focused suite manually before pushing.
