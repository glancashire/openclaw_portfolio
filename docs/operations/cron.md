# Cron policy (this host)

This is the canonical reference for how scheduled jobs run on the OpenClaw host that owns this repository. It is the operational complement to `TOOLS.md` and overrides any older guidance scattered across phase plans.

## Required job shape

Every enabled cron job that needs to run code in this workspace must satisfy:

1. **`sessionTarget`** is `current` (or a sticky `session:agent:main:main` value) for any job whose payload uses `exec`, `read`, `write`, or `edit`. The host has `agents.defaults.sandbox.mode = "off"`; jobs that try to run in an isolated session demand Docker (not installed) and fail 100%.
2. **`payload.kind`** is `agentTurn` when the work is more than a one-line system event. Use `systemEvent` only for short reminders to the main session.
3. **`payload.toolsAllow`** is the minimum set the job needs. Most ETF jobs only need `["exec", "read"]`; jobs that update Markdown also need `"write"` and `"edit"`.
4. **`delivery.bestEffort`** is `true`. Telegram is the only configured chat channel on this host and it has no chat-id target, so announce delivery always reports `"no route, will fail-closed"`. With `bestEffort:true`, that failure does **not** increment `consecutiveErrors`; without it, every successful run still reports a delivery error and the job eventually self-disables.
5. **`schedule.tz`** is explicit (`"UTC"` for system maintenance; `"Europe/Zurich"` only if a wall-clock-local trigger is required).

## Observability path

Because announce delivery fails-closed by design on this host, **email is the working operator channel.** Jobs that need to surface output to the user must either:

- Write to a report file under `portfolio/<id>/` that the weekly email cycle picks up, OR
- Call `lib/mailgun.sendEmail(...)` directly with `lancashire@swift.ch` as the recipient.

Do not rely on the cron `announce` summary reaching anyone in real time.

## Failure handling

- `consecutiveErrors >= 3`: prefer `cron disable <id>` over leaving the job red. Open a follow-up issue or phase plan.
- Sandbox / Docker errors: never re-enable the job without first switching `sessionTarget` to `current`. Old `isolated` jobs are the most common source of this class of failure on this host.
- Telegram delivery errors: ignore. They only mean the chat channel is misconfigured, not that the work failed.

## Adding a new job

Use the `cron` MCP tool, not raw shell. Minimum shape:

```json
{
  "name": "descriptive-name",
  "schedule": { "kind": "cron", "expr": "0 8 * * *", "tz": "UTC" },
  "sessionTarget": "current",
  "payload": {
    "kind": "agentTurn",
    "message": "...",
    "timeoutSeconds": 600,
    "toolsAllow": ["exec", "read"],
    "lightContext": true
  },
  "delivery": { "mode": "announce", "bestEffort": true }
}
```

For one-shot reminders, set `"deleteAfterRun": true` and use `schedule.kind = "at"`.

## See also

- `docs/operations/active-cron-jobs.md` — committed snapshot of current jobs.
- `TOOLS.md` — historical context and the Phase 204c sandbox-mode fix.
- `master-plan-204-212-refined.md` — `[HISTORICAL]`, kept for audit.
