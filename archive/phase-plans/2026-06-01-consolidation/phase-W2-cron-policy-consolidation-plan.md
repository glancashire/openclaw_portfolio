# Phase W2 — Cron policy consolidation (Roll-up C closeout)

**Goal:** Close the remaining Roll-up C items: surface the cron-delivery caveat in operator-facing dashboards, add a snapshot-freshness guard to the policy test, and refresh the snapshot.

## Objectives
1. Add a small "delivery posture" footnote to operator-facing overview surfaces (`runtime/overview/delivery-status.md` already exists — make it explicit there)
2. Add a snapshot-freshness assertion to `test-cron-job-policy.js` (warn if `snapshotAt` is older than 30 days)
3. Refresh `docs/operations/active-cron-jobs.json` from live state
4. Tick remaining Roll-up C items in `ROLLUP_OUTSTANDING_PLAN.md`
5. `npm test` green

## Risks / dependencies
- `runtime/overview/delivery-status.md` is generated. The caveat must come from the generator, not be hand-edited (would be wiped on next regen). Need to find the generator and add a static caveat block.
- Snapshot freshness check shouldn't fail CI on day-31. Use a warning threshold and a hard-fail at 90 days.
- Refreshing the snapshot will change the file in a normal way; commit it as part of W2.

## Actionable checklist
- [ ] Find delivery-status generator (`grep -l "delivery-status" src/`)
- [ ] Add a static "Operator note: Telegram fail-closed on this host; email is the working channel" line to the generated md/html, behind a config flag if necessary
- [ ] Refresh `docs/operations/active-cron-jobs.json` and `.md` from live `openclaw cron list --json`
- [ ] Extend `test-cron-job-policy.js` with a 90-day snapshot freshness hard-fail + 30-day soft warning
- [ ] Tick Roll-up C items in `ROLLUP_OUTSTANDING_PLAN.md`
- [ ] `npm test` green
- [ ] Commit + push

## Acceptance criteria
- `runtime/overview/delivery-status.md` carries the fail-closed caveat after regeneration
- Snapshot freshness check passes for the refreshed snapshot
- `npm test` exit 0
- Roll-up C items closed in rollup
