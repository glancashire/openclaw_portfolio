# Phase 1 — Sentry scaffold + no-op safety

**Created:** 2026-06-04
**Parent plan:** `plans/sentry-integration-plan.md`
**Status:** READY to implement

## Objectives
1. Add `@sentry/node` as a dependency (pinned minor).
2. Create `lib/observability/sentry.js` with `initSentry()` + `captureError()` that no-op when `SENTRY_DSN` is empty.
3. Add `.env.example` with Sentry keys (empty values, committed).
4. Write `scripts/test-sentry-integration.js` covering the no-op path, the init path (mocked), and PII scrubbing.
5. Wire test into discovered test suites; `npm test` and the new test both pass.
6. NOT YET wire into other entry points — that's Phase 2.

## Risks / Dependencies
- `npm install` requires network; if offline we fall back to a vendored shim. Check.
- The repo has a pre-commit hook running focused verification — new test must not break it.
- `.env.example` is new; ensure `.gitignore` does not accidentally exclude it (`.env*` currently matches `.env.example` too — need to allowlist).

## Checklist
- [ ] Verify network + npm reachable.
- [ ] `npm install @sentry/node` (pin via `^x.y.z`).
- [ ] Create `lib/observability/sentry.js`.
- [ ] Create `.env.example` at repo root with Sentry keys.
- [ ] Fix `.gitignore`: add `!.env.example` after `.env*`.
- [ ] Create `scripts/test-sentry-integration.js`.
- [ ] Run new test in isolation — passes.
- [ ] Run `npm test` (verify-repo) — passes.
- [ ] Run `npm run test:safe` — passes (no regressions).
- [ ] Commit + push.

## Acceptance Criteria
- `require('./lib/observability/sentry').initSentry()` returns silently when DSN unset.
- With DSN set + `@sentry/node` mocked, `initSentry()` calls `Sentry.init` exactly once with expected config (env, beforeSend, sampleRate=0).
- `captureError(err)` calls `Sentry.captureException` when initialized, no-ops otherwise.
- `beforeSend` strips `SENTRY_AUTH_TOKEN`, `IBKR_ACCOUNT_ID`, `MAILGUN_RECIPIENT`, `OPENCLAW_APPROVAL_*` from event extras/env-like keys.
- `.env.example` tracked in git; real `.env` still gitignored (verified by `git check-ignore .env`).
- New test discovered by `scripts/discover-test-suites.js`.
- No changes to runtime behavior of existing scripts.
