# Phase 4 — Weekly orchestrator + autonomous fix loop

**Created:** 2026-06-04
**Parent plan:** `plans/sentry-integration-plan.md`
**Status:** READY to implement

## Objectives
1. Build `scripts/sentry-autofix-weekly.js` — the cron entry point.
   - Fetches up to SENTRY_AUTOFIX_MAX_ISSUES (default 5) unresolved issues from Sentry.
   - Filters by severity (high/critical first), then by denylist (paths that touch execution).
   - Per issue: spawns an isolated sub-agent with a fix brief.
   - Tier 2 (SENTRY_AUTOFIX_AUTOMERGE=true): if tests pass AND issue path is in
     SENTRY_AUTOFIX_ALLOWLIST → auto-commit to `main`. Otherwise → branch + digest.
   - Always: produce a Mailgun digest at the end listing what was done.
2. Build the core fix logic `lib/observability/autofixBrain.js`:
   - `classifyIssue(issue, latestEvent)` — returns `{ severity, shouldFix, reason, paths}`
   - `deriveFixBrief(issue, event, classification)` — returns the sub-agent prompt string
   - `applyPatch(patch, branch)` — runs `git checkout -b sentry/autofix/<id>`, applies
     patch diff, runs focused test lane, commits if clean.
   - `shouldAutoMerge(classification, testResult)` — checks allowlist, execution-denylist,
     test pass, Tier 2 flag.
3. Build `scripts/test-sentry-autofix.js` — mocks Sentry API (fixture), mocks git operations,
   mocks sub-agent spawn, asserts classification logic, dry-run output, and digest shape.

## Risks / Dependencies
- Sub-agent spawning (`sessions_spawn`) must be tested with a real small session
  or a very thorough mock. Use a controlled task so we can verify structure.
- The git patch/branch flow uses `exec` — must be safe against concurrent runs
  (use a lock file or per-issue lock so two issues don't race on `git checkout`).
- Tier 2 auto-merge must never touch `src/portfolio/execution/`, `scripts/*live*`,
  `.env`, `package.json` deps, or any basket/broker secrets path.
- Allowlist check is a path prefix match on the first file in the stack trace.
- The orchestrator runs in the main agent session (sessionTarget=current), so
  it has access to full tool set. It's a single top-level script that delegates.
- Mailgun digest: must use `deliverPortfolioSummaryEmail` or the mailgun lib already
  present; check what's already wired before adding new deps.

## Checklist
- [ ] Build `lib/observability/autofixBrain.js` — classifyIssue + deriveFixBrief +
      shouldAutoMerge. Tests for all three.
- [ ] Build `scripts/sentry-autofix-weekly.js` — orchestrator shell + dry-run mode.
- [ ] Build `scripts/test-sentry-autofix.js` — fixture-based, asserts digest shape.
- [ ] Verify dry-run output is human-readable and shows what would happen.
- [ ] `npm test` + `npm run test:safe` — pass with no regressions.
- [ ] Commit + push.

## Acceptance Criteria
- `classifyIssue({ culpritModule: 'scripts/ibkr-native-keepalive.js', ... })`
  returns `{ shouldFix: true, reason: 'path in allowlist' }`.
- `classifyIssue({ culpritModule: 'src/portfolio/execution/live.js', ... })`
  returns `{ shouldFix: false, reason: 'execution path denylisted' }`.
- `deriveFixBrief` produces a prompt string with issue id, title, stack trace, and
  clear instructions about write scope + denylist + Tier 1 vs Tier 2 rules.
- Dry-run with fixture issues produces a JSON digest listing each issue with
  `wouldFix: true/false` and `wouldAutoMerge: true/false`.
- No real git operations or sub-agents spawned in dry-run mode.
- `npm test` + `test:safe` remain green.