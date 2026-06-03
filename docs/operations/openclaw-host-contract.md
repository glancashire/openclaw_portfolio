---
summary: "Single-page contract matrix for the OpenClaw host this repo runs on"
read_when:
  - You are new to this host and need to know how channels, sandbox, cron, restarts, and approvals fit together
  - You are about to change config, scheduling, or delivery and want the canonical pointers
  - You are auditing operator-relevant invariants
title: "OpenClaw host contract"
---

# OpenClaw host contract

This is the single-page operator/maintainer contract for the OpenClaw host
that runs this portfolio repo. Each row below points to the living owning doc
for the row; this file is a matrix, not a tutorial.

When you change a row's behaviour, also update the owning doc in the same
commit. If a row's contract drifts from the owning doc, the owning doc wins.

## Contract matrix

| Row | Contract today | Owning doc | If you change this, also update |
|---|---|---|---|
| **Channels** | Webchat is the active operator channel. Telegram bot is configured but is delivery-fragile (no chatId wired); prefer email-backed reporting for cron output. Provider routing happens internally — never use exec/curl to send. | `USER.md`, this file | `USER.md`, `playbook.md` |
| **Sandbox** | `agents.defaults.sandbox.mode` MUST stay `"off"` in `~/.openclaw/openclaw.json`. This host has no Docker daemon. Any other value makes cron sub-agent turns 100% fail. Per-job `sessionTarget: 'current'` is necessary but NOT sufficient. | `TOOLS.md`, `docs/operations/cron.md` | `TOOLS.md`, `docs/operations/cron.md`, `docs/operations/active-cron-jobs.md` |
| **Cron delivery** | Use `sessionTarget: 'current'` for jobs that should run in the main agent. Set `--best-effort-deliver` on every cron job so delivery-layer failures don't increment consecutiveErrors. Prefer email-backed reporting over `delivery.mode: 'announce'` because Telegram chatId is unset. After 3 consecutive errors, prefer `cron disable` over leaving them red. | `docs/operations/cron.md`, `docs/operations/active-cron-jobs.md` | `docs/operations/active-cron-jobs.md`, gated by `scripts/test-cron-job-policy.js` |
| **Restarts** | Gateway restart is required after changing `agents.defaults.sandbox.mode` — SIGUSR1 soft reload does NOT pick it up. `kill -KILL <pid>` is safe; supervisord respawns within 5-10s. Prefer the `gateway` tool's `restart` action over CLI lifecycle commands. After restart, OpenClaw pings the last active session automatically. | `TOOLS.md`, OpenClaw docs | `TOOLS.md`, post-restart continuation message via `gateway` tool |
| **Approvals** | Trade execution requires explicit operator approval. Safe-word + PIN are stored in `memory/feedback_approval_safeword.md`. Re-running a script that transmits will transmit again — see `memory/feedback_live_order_scripts.md`. Approval gate flow is in `docs/setup/approval-gate.md`. | `docs/setup/approval-gate.md`, `docs/basket-execution-runbook.md` | `docs/basket-execution-runbook.md`, `playbook.md`, `MEMORY.md` (the safe-word + live-order pointers) |

## Adjacent contracts (not in the matrix)

- **IBKR native gateway recovery** — `docs/operations/ibkr-recovery.md` and the recovery section of `TOOLS.md`.
- **Reporting stabilization invariants** — `TOOLS.md` "Reporting stabilization (Phases 163–165)".
- **Repo hygiene** — `.githooks/pre-commit` runs the focused verification subset; if hooks are bypassed, rerun the focused suite manually before pushing. Tracked wrappers and shims are blessed in `docs/operations/wrappers-and-shims.md`.

## Hard host facts (changing these requires explicit operator decision)

- No Docker daemon on this host.
- Telegram bot is configured but the chatId for `delivery.mode: 'announce'` is not wired. Plan around that until it is.
- IB Gateway native socket is `127.0.0.1:4001`. The IBC command port (`7462`) may be all that's exposed until login/2FA finishes.
- Gateway runs under supervisord; `kill -KILL <pid>` is the validated restart path.

## Test coverage for this contract

`scripts/test-openclaw-host-contract.js` asserts that this file exists and that
every row in the matrix is named. The test does not validate the contract
content itself — it ensures the contract surface keeps existing in a known
shape so search and onboarding remain reliable.
