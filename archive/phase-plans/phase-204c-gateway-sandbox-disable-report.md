# Phase 204c — Gateway sandbox disable (REPORT)

**Status:** ✅ Complete 2026-05-23 00:50 UTC
**Approval:** Graham, 2026-05-23 00:37 UTC ("approve sandbox=off")
**Outcome:** All cron jobs unblocked. Error counts reset 24/26/11/3/1/1/1 → 0/0/0/0/0/0/0.

## What changed

**Single config write at gateway level:**

```
$ openclaw config set agents.defaults.sandbox.mode off
Config overwrite: /home/ubuntu/.openclaw/openclaw.json
  sha256 882a7b5d…  →  8c9b6437…
  backup=/home/ubuntu/.openclaw/openclaw.json.bak
```

Gateway restart was required (SIGUSR1 soft reload does NOT reload the sandbox
subsystem). After the restart the cron lane picks up the new mode and proceeds
without attempting to spawn a Docker container.

## Validation

Forced run of `7dfbbec5 portfolio-health-monitor-etf` post-restart:

| Run | Outcome |
| --- | --- |
| 00:40:51 (pre-restart) | ❌ `Sandbox mode requires Docker` |
| 00:44:57 (pre-restart) | ❌ `Sandbox mode requires Docker` |
| 00:48:02 (post-restart) | ✅ agent run OK; delivery error only |

The 00:48 run finished the agent turn successfully and only failed in the
delivery layer with `Delivering to Telegram requires target <chatId>`. The
cron framework correctly classified the **job** as successful and reset
`consecutiveErrors` for **all** affected jobs:

```
3aef6007 ce=0  ibkr-native-gateway-keepalive
7dfbbec5 ce=0  portfolio-health-monitor-etf
1ec58679 ce=0  daily-rebalance-check
0ddfde6d ce=0  portfolio-etf-daily-sync-and-dashboard
6d4dd0e1 ce=0  verify-six-l1-subscription-monday
eb3fc666 ce=0  portfolio-etf-weekly-report
8b1c0de5 ce=0  portfolio-etf-monthly-report
d350c3c1 ce=0  portfolio-etf-quarterly-report
```

## Trade-off accepted

`agents.defaults.sandbox.mode = "off"` means there's no isolation between
sub-agent runs and the main session — they share the workspace filesystem.

This matches reality on this host: there is no Docker daemon, so the previous
`"non-main"` setting was a façade that just made every sub-agent run fail.

## What is NOT fixed (deferred to Phase 207)

`delivery.mode: 'announce'` still fails-closed for the cron output because:

- Telegram is the only chat channel configured (no chatId discoverable via
  `openclaw directory self --channel telegram`).
- The delivery layer treats Telegram as the announce target by default.

Impact today: cron *output* (success summaries) never reaches the operator.
Cron *job state* is correct, error counts work, the agent turns run.

**Plan:** Phase 207 (HTML email digest) will introduce a Mailgun-direct webhook
path that crons can use as their primary delivery channel. Direct integration
gives us:

- Already-working Mailgun credentials (`MAILGUN_DOMAIN=mailgun.swift.ch`).
- Existing recipient (`lancashire@swift.ch`).
- Bypass for the Telegram chatId requirement entirely.

## Operational hardening (recommended within Phase 207)

1. Replace hardcoded `lancashire@swift.ch` with `MAILGUN_RECIPIENT` env var
   (already in standing backlog).
2. Add a thin `scripts/cron-delivery-webhook.js` that takes the cron
   announce body and emails it via Mailgun. Wire it as the cron delivery
   destination so daily/weekly/monthly reports actually arrive.

## Updated cron invariants (supersedes TOOLS.md §Cron job invariants)

1. **No Docker daemon on this host.** Crons run in-session under the main agent.
2. **`agents.defaults.sandbox.mode` MUST stay `"off"`** at the gateway level
   (config file). Per-job `sessionTarget: 'current'` is necessary but not
   sufficient.
3. **`delivery.mode: 'announce'` is silent on this host until Phase 207** —
   prefer webhook delivery once available.
4. **After 3 consecutive errors, prefer `cron disable`** — Phase 208 will
   auto-disable.
5. **Gateway restart is required after `agents.defaults.sandbox.mode` change**
   — SIGUSR1 soft reload does not pick it up.

## Affected files (none in repo)

The fix is entirely in `~/.openclaw/openclaw.json` (gateway config, gitignored).
This report file is the only commit-tracked artefact from Phase 204c.
