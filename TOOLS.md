# TOOLS.md - Local Notes

Things that matter in this setup:

### Cron job invariants (enforced 2026-05-22, Phase 204)
- This host has **no Docker daemon**. Any cron job created with `sessionTarget: 'isolated'` (or any other sandbox-requiring target) will fail with `"Sandbox mode requires Docker, but the Docker daemon is not available"`.
- Use `sessionTarget: 'current'` for cron jobs that should run in the main agent session.
- Always set `delivery.mode: 'announce'` (or webhook) on cron jobs so failures surface to Graham. `delivery.mode: 'none'` means failures are silent and burn through `consecutiveErrors` invisibly.
- Avoid `delivery.mode: 'announce'` with no chatId on Telegram-only routes — routes back through current default channel; if Telegram is the only channel and `chatId` is missing, delivery still fails.
- After 3 consecutive cron errors, prefer `cron disable` over leaving them red — Phase 208 will auto-disable.
- See `master-plan-204-212.md` and `phase-204-cron-hotfix-plan.md` for the original triage.

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
