# Phase S3 — Operator surface hardening (cron + delivery)

**Goal:** Make cron-driven operator output reliably visible. Today, cron jobs use `delivery.mode=announce` to Telegram which is misconfigured on this host; `bestEffort:true` saves cron state but operator messages are silently dropped. We want a single, working delivery channel and a guard that prevents new jobs from regressing.

## Objectives
1. Document the current cron+delivery posture in `docs/operations/cron.md` (canonical, not just in `TOOLS.md`)
2. Snapshot every enabled cron job to `docs/operations/active-cron-jobs.md` with schedule, sessionTarget, delivery, expected output
3. Verify each cron job follows the policy (`sessionTarget=current` for exec, `bestEffort:true`, working delivery target)
4. Fix the `portfolio-health-monitor-etf` false-positive denial classifier (1 consecutive error from a `"was denied"` substring match)
5. Regression: a test that scans cron job definitions and asserts every job has the safety flags + a reachable delivery target

## Risks / dependencies
- We don't have a working channel for autonomous announce right now (Telegram misconfigured); operator notifications happen via email through the Mailgun-backed reporting paths.
- Switching cron delivery from announce → webhook to an email endpoint is overkill for this phase; better to leave `announce + bestEffort:true` (cron state is unaffected) and document email as the working observability path for the user.
- The denial classifier might be load-bearing for other paths (real broker denials). Need to identify it before patching.

## Actionable checklist

### Sub-phase A — Document & snapshot cron
- [ ] Create `docs/operations/cron.md` capturing: sessionTarget rules, sandbox-mode invariant, bestEffort policy, what to do on consecutive errors, what announce vs webhook does on this host
- [ ] Snapshot `openclaw cron list --json` (or equivalent) to `docs/operations/active-cron-jobs.md` with a human-readable table
- [ ] Cross-check each job's `sessionTarget`, `bestEffort`, `payload.kind`

### Sub-phase B — Cron job audit guard
- [ ] Add `scripts/test-cron-job-policy.js` that:
  - Lists active cron jobs via the cron tool (or reads the gateway config)
  - Asserts each enabled job has `sessionTarget` set appropriately for its payload kind
  - Asserts `bestEffort` is true OR delivery is `none|webhook`
  - Asserts `payload.toolsAllow` is sane (no exec on agent-turn jobs without warrant)
- [ ] If we can't reach the cron API at test time (sandboxed test env), at least lint a snapshot file committed in docs/operations/
- [ ] Wire into `verifyRepoChecks`

### Sub-phase C — Health monitor denial classifier
- [ ] Find the false-positive: `portfolio-health-monitor-etf` flips to consecutiveErrors=1 because its output contains "was denied" from a summary message
- [ ] Trace the substring match in the classifier; either:
  - Anchor the match (`/(?:^|\s)approval was denied\b/` or similar), OR
  - Use a structured signal instead of substring
- [ ] Add a regression test
- [ ] Reset the consecutive-error count on the live job once fixed

### Sub-phase D — Re-run health monitor end-to-end
- [ ] Trigger one cycle of `portfolio-health-monitor-etf`
- [ ] Verify it returns ok and doesn't false-positive on its own summary
- [ ] Snapshot output

## Acceptance criteria
- `docs/operations/cron.md` exists, captures the policy
- `docs/operations/active-cron-jobs.md` lists every enabled job with full posture
- `test-cron-job-policy.js` passes for the committed snapshot
- `portfolio-health-monitor-etf` consecutive error count = 0 after re-run
- `npm test` exits 0 (now ≥31 checks)
- All commits pushed

## Test strategy
- Snapshot-style test: lint the committed `active-cron-jobs.md` to ensure every row satisfies the policy
- Unit test for the denial classifier (negative case: "approval was denied" should match; positive case: "approval was denied earlier; latest run succeeded" should NOT mark unhealthy)

## Out
Operator can read one doc to know what's running and why; cron output stays auditable; no false-positive errors leaking into health dashboards.
