# Plan: Sentry.io integration + weekly autonomous bug-fix cron

**Created:** 2026-06-04
**Owner:** bb8 (main)
**Status:** DRAFT — awaiting Graham's review before implementation begins
**Repo root:** `/home/ubuntu/.openclaw/workspace`

---

## 0. Goals (verbatim from Graham)

1. Add **sentry.io** to track bugs in the code we write.
2. Add a **weekly cron job** that retrieves all bugs from Sentry and **fixes them autonomously**.
3. Wire **token / secret / project slug** through `.env`. Implementation finishes first; *then* ask Graham for the values and give him a clean way to provide them.

---

## 1. What we're working with (context for the plan)

- Node.js project (`package.json` already present, npm-based).
- Existing `.env` at workspace root holds operational secrets (IBKR, Mailgun, OPENCLAW_APPROVAL_*). Sentry vars belong here too — same loader, same gitignore posture.
- Cron is managed via OpenClaw's `cron` tool, **not** system crontab. Invariants live in `docs/operations/cron.md` and `TOOLS.md`:
  - `sessionTarget: 'current'` required for jobs that run in main agent context.
  - `--best-effort-deliver` on every job (delivery failures must not increment `consecutiveErrors`).
  - Agent sandbox stays `"off"` (no Docker on this host).
- Scripts live under `scripts/`. Naming convention: `kebab-case.js`, `test-*.js` for regression checks.
- Source code lives under `src/` and `lib/`.
- Plans go under `plans/` (this file). Daily notes go under `memory/YYYY-MM-DD.md`.

---

## 2. Design overview

### 2.1 Three layers
| Layer | What it does | Where it lives |
|---|---|---|
| **Instrumentation** | `@sentry/node` initialized once, captures unhandled errors + manual `captureException` calls | `lib/observability/sentry.js` (new), imported from CLI entry points |
| **Issue retrieval** | Calls Sentry Web API to list unresolved issues for the configured project | `scripts/fetch-sentry-issues.js` (new) |
| **Autonomous repair loop** | Weekly cron → pulls issues → spawns a sub-agent per issue → sub-agent investigates + patches + opens a *proposal* (NOT auto-merged) | `scripts/sentry-autofix-weekly.js` (new) + cron job |

### 2.2 Autonomy boundary (important — needs Graham's call)
"Fix autonomously" is ambiguous. I propose **two-tier autonomy**, default to Tier 1, with a flag to enable Tier 2 per run:

- **Tier 1 (default, safe):** sub-agent diagnoses each issue, writes a fix on a branch `sentry/autofix/<issue-id>`, runs the focused test lane, and stops. Cron emits a digest (Mailgun, per host contract) listing branches ready for review. Graham reviews + merges.
- **Tier 2 (opt-in, env flag `SENTRY_AUTOFIX_AUTOMERGE=true`):** if tests pass *and* the issue is in an allowlisted path (e.g. `scripts/`, not `src/portfolio/execution/`), auto-commit to `main`. Anything touching execution, approvals, or live trading is **never** auto-merged regardless of flag.

This matches Graham's existing red lines (basket execution requires safe-word + PIN; live order scripts must not be re-invoked silently).

---

## 3. File-by-file deliverables

### 3.1 `.env` additions (template only; values come later from Graham)
```
# Sentry — error tracking
SENTRY_DSN=
SENTRY_AUTH_TOKEN=
SENTRY_ORG_SLUG=
SENTRY_PROJECT_SLUG=
SENTRY_ENVIRONMENT=production
# Autofix safety
SENTRY_AUTOFIX_AUTOMERGE=false
SENTRY_AUTOFIX_ALLOWLIST=scripts/,lib/observability/
```
- `SENTRY_DSN`: client-side, used by `@sentry/node` to send events.
- `SENTRY_AUTH_TOKEN`: server-side, scoped `project:read event:read` only (we'll tell Graham exactly which scopes to tick).
- `.env.example` updated with the same keys (empty values) and committed; real `.env` stays gitignored (already is — verified).

### 3.2 New files
| Path | Purpose |
|---|---|
| `lib/observability/sentry.js` | `initSentry()` + `captureError(err, ctx)` helpers. No-ops cleanly if `SENTRY_DSN` is empty (so dev/test never crash). |
| `lib/observability/sentry-api.js` | Thin REST client for `https://sentry.io/api/0/projects/{org}/{project}/issues/`. Pagination via `Link` header. |
| `scripts/fetch-sentry-issues.js` | CLI: `node scripts/fetch-sentry-issues.js [--status=unresolved] [--since=7d] [--json]`. Used by the cron and ad-hoc by Graham. |
| `scripts/sentry-autofix-weekly.js` | Orchestrator. Pseudocode: fetch issues → filter (severity, path allowlist) → per issue: spawn sub-agent with brief → collect results → email digest via Mailgun. |
| `scripts/test-sentry-integration.js` | Regression check: mocked API, asserts pagination + filtering + no-op when DSN unset. Added to focused test lane. |
| `docs/operations/sentry.md` | Operator runbook: what we send, how to rotate token, how to disable autofix, how to read the digest. |

### 3.3 Files touched (not created)
| Path | Change |
|---|---|
| `package.json` | Add `@sentry/node` (pin minor). |
| `.env.example` (create if missing) | Mirror new Sentry keys. |
| `.gitignore` | Confirm `.env` excluded (already is). |
| `scripts/*.js` entry points that already top-load env | Add one-line `require('../lib/observability/sentry').initSentry()` near the top. Scope = scripts that run unattended (cron, IBKR, reporting). Interactive operator CLIs are optional. |
| `TOOLS.md` | Add a short "Sentry" subsection pointing at `docs/operations/sentry.md`. |
| `CURRENT_PLAN.md` | Add this initiative as an open item until shipped. |
| `docs/operations/active-cron-jobs.md` | After cron is added, append the new job (gated by `scripts/test-cron-job-policy.js`). |

---

## 4. Cron job specification

```
name:           sentry-autofix-weekly
schedule:       cron "0 9 * * 1" tz "Europe/Zurich"   # Mondays 09:00 CET — Graham's TZ, not UTC
sessionTarget:  current
payload.kind:   agentTurn
payload.message:
  "Run scripts/sentry-autofix-weekly.js. Process at most 5 issues this run.
   Default to Tier 1 (branch + review). Email digest via Mailgun to MAILGUN_RECIPIENT.
   Skip any issue whose stack trace touches src/portfolio/execution/ or scripts/*live*."
delivery.mode:  announce
bestEffort:     true                                  # required per TOOLS.md
failureAlert:   after 2 failures → email digest
```

Why Monday 09:00 CET: matches Graham's existing reporting cadence (weekly investor reports), so the digest lands when he's already reviewing the week.

---

## 5. Sub-agent brief (per issue, Tier 1)

Each issue spawned via `sessions_spawn` (isolated, no fork) with this brief:

```
Objective: Reproduce and patch Sentry issue {id} ({title}).
Inputs:    {stack trace}, {event JSON}, {first/last seen}, {breadcrumbs}.
Output:    Either (a) a git branch sentry/autofix/{id} with a focused patch +
           a one-paragraph rationale in plans/sentry-fixes/{id}.md, or
           (b) a "NEEDS_HUMAN" note in the same file if the issue is not safely
           auto-fixable (touches execution, ambiguous root cause, requires
           data migration, etc.).
Write scope: src/, lib/, scripts/ — NEVER .env, package.json deps, or
             src/portfolio/execution/**.
Verify:    Run the focused test lane before declaring done.
Timeout:   20 minutes.
```

The orchestrator collects (a)/(b) results and Mailgun-mails Graham one digest.

---

## 6. Implementation order (so each step is independently verifiable)

1. **Scaffold + no-op safety**
   - `lib/observability/sentry.js` with `initSentry()` that returns early if `SENTRY_DSN` empty.
   - `package.json` adds `@sentry/node`; `npm install`.
   - `test-sentry-integration.js` green with no env set.
2. **Wire instrumentation** into 3–5 unattended entry points (cron-launched scripts first).
3. **Build read path**: `sentry-api.js` + `fetch-sentry-issues.js`. Verify against a recorded fixture (no live call yet).
4. **Build orchestrator** `sentry-autofix-weekly.js` against a fake issue list. Dry-run mode mandatory: `--dry-run` lists what it *would* do.
5. **Docs**: `docs/operations/sentry.md` + `TOOLS.md` blurb + `CURRENT_PLAN.md` entry.
6. **Ask Graham for credentials** (see §7). Populate `.env`. Smoke test: trigger a deliberate handled error, see it in Sentry, run `fetch-sentry-issues.js`, see it listed.
7. **Add cron job** via `cron` tool with `--best-effort-deliver`. Append to `docs/operations/active-cron-jobs.md`. Run once manually with `--dry-run` to verify end-to-end.
8. **Hand off**: short summary to Graham, link to runbook, confirm Monday firing.

---

## 7. Credential handover plan (what Graham does once code is ready)

When implementation is complete, I will message Graham with **exactly this**:

> Sentry plumbing is in. To finish wiring, I need 4 values. Easiest path:
>
> 1. Go to https://sentry.io → create project (Platform: **Node.js**). Copy the **DSN** shown on the first screen.
> 2. https://sentry.io/settings/account/api/auth-tokens/ → **Create New Token**. Scopes: `project:read`, `event:read`, `issue:read`. Copy the token (shown once).
> 3. From the project page URL `https://sentry.io/organizations/<ORG>/projects/<PROJECT>/` — grab `<ORG>` and `<PROJECT>`.
>
> Paste them back as a single block, format below (or just hand me a screenshot of the project's "Client Keys (DSN)" page + the token in a separate message):
>
> ```
> SENTRY_DSN=https://...@o000000.ingest.sentry.io/0000000
> SENTRY_AUTH_TOKEN=sntrys_...
> SENTRY_ORG_SLUG=your-org
> SENTRY_PROJECT_SLUG=your-project
> ```
>
> I'll write them to `.env` (gitignored, never logged, never echoed), redact the token in any future references, and run the smoke test in front of you.

Rationale: zero clicks past the 3 links, one paste, no shell commands for Graham to run.

---

## 8. Risks and how we handle them

| Risk | Mitigation |
|---|---|
| Auto-fix corrupts production logic | Tier 1 default; execution paths in permanent denylist; focused test lane must pass; human merges. |
| Sentry token leaks via logs | `lib/observability/sentry.js` strips `SENTRY_AUTH_TOKEN` from any `console.log` of `process.env`; never passed on CLI argv. |
| Cron delivery failure marks job red | `--best-effort-deliver` + digest via Mailgun (per TOOLS.md, this is the working channel on this host). |
| Sentry quota blown by noisy errors | `tracesSampleRate: 0`, `beforeSend` drops events flagged as `expected` (e.g. user-cancelled approvals). |
| PII in event payloads (IBKR account id, recipient email) | `beforeSend` scrubs known keys: `IBKR_ACCOUNT_ID`, `MAILGUN_RECIPIENT`, `OPENCLAW_APPROVAL_*`. |
| Sub-agent runs amok on issue with huge blast radius | 20-min timeout, write-scope restriction, no execution-path writes, max 5 issues/run. |

---

## 9. Open decisions for Graham (please answer before I start)

1. **Autonomy tier:** OK to default to **Tier 1 (branch + you merge)**? Or do you want Tier 2 (auto-merge in safe paths) from day one?
2. **Cron time:** Monday 09:00 Europe/Zurich OK, or different day/time?
3. **Issue cap per run:** 5 sound right, or do you want all-or-nothing?
4. **Scope of instrumentation:** wire Sentry into *every* script, or only cron-launched / unattended ones (my recommendation)?
5. **Email vs. announce:** digest via Mailgun (recommended, per host contract) or also try webchat announce?

Once you answer 1–5, I'll execute §6 steps 1–5 without further check-ins, then come back for credentials (§7).

---

## 10. Not in scope (calling out so it's explicit)

- Source-map upload (can add later if/when we have a build step that benefits).
- Sentry **performance** monitoring (`tracesSampleRate > 0`) — defer; we want error visibility first.
- Replacing existing logging — Sentry augments, doesn't replace.
- Cross-repo error tracking — workspace only.
