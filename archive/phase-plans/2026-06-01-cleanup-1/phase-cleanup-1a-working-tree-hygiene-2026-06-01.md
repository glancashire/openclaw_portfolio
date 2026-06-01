# Phase Cleanup-1A — Working-tree hygiene

**Date:** 2026-06-01 20:08 UTC
**Tranche:** 1 (autonomous, low risk)
**Parent plan:** `plans/phase-cleanup-1-end-of-day-issue-roundup-2026-06-01.md`

## Objectives

1. Drop the redundant `stash@{0}` (its content was merged in commit `1e51f7b`; SXR8 generic-control candidate confirmed present in HEAD).
2. Stop tracking generated artifacts that dirty `git status` after every routine sync:
   - `runtime/events/runtime-events.jsonl` (already-tracked, append-only)
   - Monthly report derivatives `.html / .json / .pdf` under `portfolio/<name>/reports/monthly/` (keep `.md` only — the canonical human-readable artifact).
3. Stop tracking `portfolio/<name>/holdings-avg-cost.json` only if Phase 1D / H2 confirms it's a pure dump; **defer to 1D**.
4. Refresh `memory/2026-06-01.md` and `CURRENT_PLAN.md` to mark T1 (test timeouts), R1 (stash), and the Phase UX-1 outstanding list as resolved.

## Risks / dependencies

- `git rm --cached` removes files from the index but leaves on disk; safe but visible in commit.
- `.gitignore` additions must be precise — `portfolio/*/reports/monthly/*.{html,json,pdf}` only; do **not** ignore `.md`.
- Other portfolios (`acceptance-closure`, `demo`) follow the same pattern; apply globally.
- No code reads the gitignored generated artifacts as required inputs; verified by grep.

## Actionable checklist

- [ ] `git stash drop stash@{0}` after confirming HEAD already contains the SXR8 generic-control candidate.
- [ ] Append `.gitignore` rules: `portfolio/*/reports/monthly/*.html`, `*.json`, `*.pdf`, plus `runtime/events/runtime-events.jsonl` (explicit even though `runtime/` is ignored — file is already tracked).
- [ ] `git rm --cached` the currently-tracked instances of the above.
- [ ] Confirm only the `.md` monthly reports remain tracked.
- [ ] Update `memory/2026-06-01.md` to move test-timeout + stash entries from "Outstanding" to "Resolved".
- [ ] Update `CURRENT_PLAN.md` to tick off 1A in Tranche 1 once committed.
- [ ] Add a small regression test that prevents the .gitignore from drifting (assert these globs are present).

## Acceptance criteria

- `git status` after a fresh `node scripts/sync-ibkr-after-recovery.js etf` shows no churn from monthly-report derivatives or `runtime-events.jsonl`.
- `git ls-files runtime/events/runtime-events.jsonl` returns empty.
- `git ls-files 'portfolio/*/reports/monthly/*.html'` returns empty.
- `git ls-files 'portfolio/*/reports/monthly/*.md'` still lists the canonical `.md` reports.
- `node scripts/test-repo-root-cleanliness.js` passes.
- New `scripts/test-gitignore-policy.js` passes.
- Stash `stash@{0}` no longer in `git stash list`.

## Out of scope (deferred to later 1B–1H)

- `holdings-avg-cost.json` churn → Phase 1D.
- Dashboard wording for degraded broker posture → Phase 1C.
- Sync wall-clock → Phase 1D.
- Dashboard delta truth → Phase 1E.
- Cron delivery → Phase 1F.
- Deprecated `messages.groupChat.visibleReplies` → Phase 1G.
- IBKR market-data subscription posture → Phase 1H.
