# Phase C — Counter freshness wiring

Date: 2026-06-03
Owner: bb8 / Graham
Status: ACTIVE
Source: `CURRENT_PLAN.md` Phase C

## Objective

Make the Operations KPI card data automatically fresh on every digest send by regenerating `runtime/overview/usage-counters.json` at the start of `scripts/send-dashboard-digest.js`. No new cron job; deterministic per send.

## Decision context

Decision (a) accepted on 2026-06-03: in-line regeneration is the simplest, deterministic option. Cost is ~2s per send.

## Risks / dependencies

- Regeneration is best-effort; if it throws, the send must still go out (the KPI card already renders empty when no counters file exists).
- Must run BEFORE `collectPortfolioSummary` so the latest counters are picked up.
- Existing `regenerate-usage-counters.js` script reads/writes from a hard-coded path; we reuse the underlying `usageCounters.js` library for in-process regeneration to avoid a child-process spawn.

## Implementation checklist

- [ ] `scripts/send-dashboard-digest.js`: import `usageCounters` library; call `buildSnapshot()` → `writeSnapshot()` inside a try/catch BEFORE `collectPortfolioSummary`.
- [ ] If regeneration throws, log a single-line warning to stderr and continue.
- [ ] New regression test `scripts/test-send-digest-counter-refresh.js` verifies that:
  - the digest send invokes counter regeneration
  - regeneration failure does not abort the send
  - the resulting counters file is at most a few seconds old after a send
- [ ] Update `playbook.md` to note the auto-refresh.

## Acceptance criteria

- A real send produces a `runtime/overview/usage-counters.json` whose `generatedAt` is within 60s of the send timestamp.
- A simulated regeneration error produces a warning but the send still completes.
- Tests still 239/0 + the new test.
