# Phase 3 — Sentry Web API read path

**Created:** 2026-06-04
**Parent plan:** `plans/sentry-integration-plan.md`
**Status:** READY to implement

## Objectives
1. Build `lib/observability/sentryApi.js` — thin REST client for the
   Sentry Web API focused on the endpoints we need:
     - GET /api/0/projects/{org}/{project}/issues/  (list issues, filterable, paginated)
     - GET /api/0/issues/{issue_id}/  (issue detail)
     - GET /api/0/issues/{issue_id}/events/latest/  (latest event w/ stacktrace)
2. Build `scripts/fetch-sentry-issues.js` — CLI wrapper.
   Flags: --status=unresolved (default), --since=7d, --limit=25, --json, --org, --project.
   Sources org/project from env when not passed.
3. Pagination via Link header (cursor-based), capped at --limit total.
4. Tests:
   - `scripts/test-sentry-api.js` — mocked fetch transport, asserts:
       URL composition, auth header, pagination (single + multi-page),
       filter handling, error mapping (4xx/5xx), missing token fallback.
   - `scripts/test-fetch-sentry-issues-cli.js` — invokes CLI with mocked
     transport via env var SENTRY_API_FIXTURE, asserts JSON output shape.

## Risks / Dependencies
- Node 22.22 has global `fetch`; we use it (no `node-fetch` dependency added).
- Sentry API uses cursor pagination via Link header. Parser must tolerate
  missing/malformed Link headers and return null cursor cleanly.
- Rate limits (429): respect Retry-After; for the read CLI we surface and
  exit non-zero rather than auto-retry-forever.
- When SENTRY_AUTH_TOKEN unset, fetch CLI should fail loud with a clear
  message — NOT silently return empty.
- Test transport injection must work without spawning subprocesses (slow).
  Use a module-level injection point.

## Checklist
- [ ] Create `lib/observability/sentryApi.js` with `listIssues`, `getIssue`,
      `getLatestEvent`, `parseLinkHeader` exports.
- [ ] Create `scripts/fetch-sentry-issues.js` CLI.
- [ ] Create `scripts/test-sentry-api.js`.
- [ ] Create `scripts/test-fetch-sentry-issues-cli.js`.
- [ ] Regenerate test manifest.
- [ ] Run new tests — pass.
- [ ] `npm test` + `npm run test:safe` — pass.
- [ ] Commit + push.

## Acceptance Criteria
- `listIssues({org, project, statsPeriod, query, limit})` returns
  `{ issues: [...], nextCursor: string|null }`.
- listIssues with limit=10 over a 25-issue fixture (3 pages) returns
  exactly 10 issues, and stops fetching after page 1.
- 401/403/404/429/5xx responses raise an Error with `.status` set.
- `parseLinkHeader` returns null for missing/empty/malformed; correct
  cursor for the common `cursor=NEXT` rel=next form.
- CLI exits 0 + emits JSON when --json passed; exits 1 with friendly
  message when SENTRY_AUTH_TOKEN missing.
- No new runtime dependencies (use global fetch).
