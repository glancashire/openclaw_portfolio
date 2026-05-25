# Stabilization & Cleanup Master Plan — 2026-05-25

**Goal:** Reach a stable state where the system can be left alone to gather usage evidence. No new features. Finish in-progress work, fix carry-over bugs, prune cruft, ensure all tests pass green, and harden operator surfaces.

## Driving constraint
We're done adding capability for now. Every change must reduce risk, reduce noise, or close a loop that's already half-built. If it doesn't, defer it.

## Current state (audit)

- **241 test files** in `scripts/test-*.js` + `tests/`; `npm test` runs only 25 (`verifyRepoChecks`).
- **358 phase-* plan files** in repo root; **97 actionable-checklist** docs. Vast majority are historical audit trail.
- **384 root-level markdown files** — root directory is a swamp. Hard to find current truth.
- **1 known pre-existing test failure**: `scripts/test-market-calendar-readiness.js` references wrong artifact filename.
- **Outstanding items in ROLLUP_OUTSTANDING_PLAN.md:**
  - A: market-calendar — last item ("full closeout verification") is now done by the bugfix subagent. Worth closing formally.
  - B: doc truth maintenance — needs a sweep
  - C: delivery/cron hardening — partial (TOOLS.md captures it but it's not in canonical docs)
  - D: health/self-heal — open question, no fix
  - E: runtime/artifact hygiene — open
  - F: historical-doc archival — completely open
- **Carry-over from today's session:**
  - `cancel-portfolio-order.js` has the same cross-client bug we just fixed in resync (failed on order 102)
  - `scripts/diagnostics/` scripts must use `'..', '..', 'src/...'` (we fixed two; let's add a guard)
  - SPMCHA circuit breaker still tripped — root cause (stale Friday close priced into Sunday-night orders) is mitigated by today's basket regen flow but the breaker file is stale
  - `runtime/market-calendar/etf.json` needs a re-sync to populate the new `todayStatus`/`holidays` fields
  - 9 cron jobs run with `delivery.mode=announce` to Telegram which is misconfigured ("no route, will fail-closed") — currently saved by `bestEffort:true`, but operator visibility into cron output is degraded. Email is the working channel for this host.

## Phases

### Phase S1 — Repo truth & test gates
Get the test suite green and the truth surfaces aligned with reality before any other work.
- Fix `test-market-calendar-readiness.js`
- Run `npm test` (the 25-check `verifyRepoChecks` suite) until clean
- Run a focused holiday/resync re-test on a freshly re-synced calendar artifact
- Update `SPEC_PROGRESS.md`, `PROGRESS_REPORT.md`, `ROLLUP_OUTSTANDING_PLAN.md` to reflect today's bugfix lane completion and Phase 166e closeout
- Annotate `master-plan-204-212-refined.md` and any other top-level "next steps" docs as **historical**

### Phase S2 — Carry-over bug closeout
Apply the cross-client visibility fix to the remaining order-management surfaces, and harden diagnostic scripts.
- Fix `scripts/cancel-portfolio-order.js` and the underlying `cancelPortfolioOrder()` so it finds orders alive at broker even when they're not in local trades.md
- Add an integration test that mocks a broker order placed by a different clientId and confirms `cancelPortfolioOrder` succeeds (or returns a meaningful "broker-only" cancel path)
- Add a `require()` helper / lint script for `scripts/diagnostics/` so new diagnostics scripts can't ship the wrong relative path again
- Clear the SPMCHA circuit breaker (now that we understand it was a holiday/cash-shortage artifact, not a real signal) and add a test that the clear-circuit-breaker tooling records reason metadata

### Phase S3 — Operator surface hardening for cron + delivery
- Switch cron jobs from `announce` delivery to **email-only** since Telegram is misconfigured (TOOLS.md documents this). Single source of truth, no fail-closed noise.
- Add a guard test that verifies all enabled cron jobs have either `delivery.mode=announce + bestEffort:true` OR a working email recipient
- Refresh `docs/operations/cron.md` (or create it) with the canonical cron policy from TOOLS.md
- Verify `portfolio-health-monitor-etf` cron — currently 1 consecutive error due to denial-token classifier false positive (`"was denied"` in summary). Fix the classifier or escape the substring.

### Phase S4 — Runtime artifact & root-doc hygiene
- Move historical `phase-*.md` files into `docs/history/phases/` (preserve, don't delete)
- Move historical `*-actionable-checklist.md` into `docs/history/checklists/`
- Move historical `master-plan-*.md` into `docs/history/`
- Keep top-level: `SPECIFICATION.md`, `SPEC_PROGRESS.md`, `PROGRESS_REPORT.md`, `ROLLUP_OUTSTANDING_PLAN.md`, `IMPLEMENTATION_PLAN.md`, `MEMORY.md`, `TOOLS.md`, `AGENTS.md`, `USER.md`, `IDENTITY.md`, `SOUL.md`, `HEARTBEAT.md`, the merged consolidated roadmap, and this master plan
- Add a `docs/history/INDEX.md` summarizing what's archived
- Delete genuinely useless scratch files (`tmp_render_summary_html.js.txt`)
- Add a `.gitignore` rule for `runtime/exec-basket-*.log` so future ad-hoc runs don't pollute the tree
- Update `playbook.md` (if present) and `TOOLS.md` to reflect the new doc layout

### Phase S5 — Stability soak preparation
The "leave it alone" state. Verifies the system can run unattended for a week.
- Sanity-check every enabled cron job: schedule, sessionTarget, delivery, expected output. Snapshot to `docs/operations/active-cron-jobs.md`.
- Run the full health monitor end-to-end and verify it surfaces all open issues correctly (no false greens, no false reds)
- Generate a one-page "system status" snapshot we can refer back to in a week
- Re-run the test suite one final time
- Final commit + push

## Verification gates per phase
- All `verifyRepoChecks` (25 tests) pass before any commit
- For each phase, a focused new/changed test exists for any new/changed behavior
- For runtime/data changes, the relevant runtime artifact is regenerated and re-validated
- `git status` clean before push (runtime churn excluded if it's clearly ephemeral)

## Risks & dependencies
- Moving phase-*.md files could break any tooling that reads them. Verify before bulk move.
- Switching cron delivery from announce to email requires the mailgun env to be present; verify before flipping.
- Clearing the SPMCHA breaker without verifying root cause is fixed could re-tripped tomorrow if the holiday-detection in the proposer isn't picking up the new `todayStatus` field. Need to verify proposer consumes it.

## Non-goals for this work
- No new strategy logic
- No new instruments
- No broker order placement (read + cancel only)
- No new email templates
- No new dashboard surfaces

## Out
Final deliverable: a quiet, well-tested system, all tests green, runtime artifacts current, operator docs accurate, root directory readable, ready to gather usage evidence for at least one week.
