# Sentry Integration — Operator Runbook

**Created:** 2026-06-04
**Owner:** bb8 (main)

---

## What we have

| File | Role |
|---|---|
| `lib/observability/sentry.js` | `initSentry()` / `captureError()`. No-ops when DSN unset. |
| `lib/observability/bootstrap.js` | Auto-init on require. Registers global error handlers. |
| `lib/observability/sentryApi.js` | Web API client: listIssues / getIssue / getLatestEvent / resolveIssue. |
| `lib/observability/autofixBrain.js` | Decision engine: classifyIssue / deriveFixBrief / shouldAutoMerge. |
| `scripts/fetch-sentry-issues.js` | CLI: `node scripts/fetch-sentry-issues.js [--json] [--limit=25]` |
| `scripts/sentry-autofix-weekly.js` | Weekly cron entry: `node scripts/sentry-autofix-weekly.js [--dry-run]` |

---

## Wiring status

Sentry bootstrap is already required at the top of these cron-unattended scripts:
- `scripts/run-report-cycle.js` (weekly/monthly/quarterly reports)
- `scripts/monitor-fills.js` (fill watcher)
- `scripts/send-dashboard-digest.js` (daily digest emails)
- `scripts/ibkr-native-keepalive.js` (IBKR keepalive)

These scripts all no-op safely when `SENTRY_DSN` is unset.

---

## Env keys (add to `.env`)

```env
# Client-side DSN (where to send errors)
SENTRY_DSN=https://...@o000000.ingest.sentry.io/0000000

# Server-side auth token (for API read + resolve)
# Scopes needed: project:read, event:read, issue:read, event:admin
# (event:admin is required so the autofix cron can mark issues resolved
#  after a fix lands; without it, resolution must be done manually in UI.)
SENTRY_AUTH_TOKEN=***

# Org + project slugs (from the Sentry project URL)
SENTRY_ORG_SLUG=your-org-slug
SENTRY_PROJECT_SLUG=your-project-slug
SENTRY_ENVIRONMENT=production

# Autofix safety
SENTRY_AUTOFIX_AUTOMERGE=true    # Tier 2: auto-merge in allowlisted paths
SENTRY_AUTOFIX_ALLOWLIST=scripts/,lib/observability/,lib/
SENTRY_AUTOFIX_MAX_ISSUES=5
```

---

## How to provide credentials

When you have the values ready, message me the block and I'll write it to `.env` using the procedure in `plans/sentry-integration-plan.md §7`.

Or paste them here and I'll handle it.

---

## Cron job

The weekly autofix cron is defined in OpenClaw but **not yet added** — it requires the credentials to be live first (so we can verify it connects). Once `.env` has the Sentry values, run:

```
bb8, add the sentry-autofix-weekly cron job (Mon 09:00 Europe/Zurich, current session, --best-effort-deliver)
```

---

## How to disable temporarily

```bash
# Comment out or set empty in .env:
SENTRY_DSN=
```

The bootstrap module checks `SENTRY_DSN` on every require and no-ops if it's empty. No restart needed.

---

## Rotating the token

1. Sentry UI → Settings → Account → API Tokens → Create New Token
2. Scopes: `project:read`, `event:read`, `issue:read`
3. Update `SENTRY_AUTH_TOKEN` in `.env`
4. No restart needed — each run reads from env.

---

## What gets sent to Sentry

- All uncaught exceptions (fatal, exits with code 1 after flush)
- All unhandled promise rejections (captured, non-fatal exit path)
- Manual `captureError(err, ctx)` calls from instrumented scripts

**Not sent:** sensitive keys (SENTRY_AUTH_TOKEN, IBKR_ACCOUNT_ID, MAILGUN_RECIPIENT, OPENCLAW_APPROVAL_*, generic `token`, `secret`, `password`, `api_key`, HTTP `authorization`, `cookie` headers). These are scrubbed in `beforeSend`.

**Sample rate:** `tracesSampleRate = 0` (errors only, no performance quota consumption).

---

## Autofix digest

When the weekly cron runs, it sends a plain-text Mailgun digest to `MAILGUN_RECIPIENT` listing:
- Issues processed and fixed/fixable
- Issues skipped (execution path, low severity, no path)
- Errors (API failures, sub-agent failures)

If Mailgun is not configured, the digest is printed to stdout instead (visible in the cron run log).

---

## Testing the integration

```bash
# 1. Verify no-op when DSN unset
node scripts/fetch-sentry-issues.js
# → error: SENTRY_AUTH_TOKEN is not set (auth token check, not DSN)

# 2. Dry-run the autofix (no real API calls)
SENTRY_AUTH_TOKEN=xxx SENTRY_ORG_SLUG=xxx SENTRY_PROJECT_SLUG=xxx \
  node scripts/sentry-autofix-weekly.js --dry-run

# 3. Manually trigger an error to see it in Sentry
SENTRY_DSN=https://... \
  node -e "require('./lib/observability/bootstrap'); throw new Error('test from cli')"
```