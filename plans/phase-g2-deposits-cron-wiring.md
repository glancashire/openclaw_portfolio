# Phase G2 — Wire deposits import into daily-sync cron

**Date:** 2026-06-04
**Status:** READY for autonomous implementation
**Depends on:** G3 (operator drops XLS) — but the wiring itself can be made tolerant of "no XLS yet"

## Objectives

1. Make `import-ibkr-deposits.js` discoverable via a stable on-disk inbox path so the daily cron doesn't need to know where Graham puts the file.
2. Add a thin wrapper that:
   - looks for an XLS at the inbox path (or any other configured location)
   - imports if present, no-ops cleanly if not
   - logs what happened (added / skipped / file_not_found)
3. Wire the wrapper into the existing `portfolio-etf-daily-sync-and-dashboard` cron job (id `0ddfde6d-5f4b-480b-a733-3d61bd27a3e4`).
4. Move imported XLS files to an `archive/` sibling directory so the same file isn't reprocessed.

## Risks / Dependencies

- **No XLS available right now.** The wrapper must be a perfect no-op when the inbox is empty.
- **deposits.md is execution-adjacent.** import-ibkr-deposits already de-dupes by reference, so re-running is safe — but the wrapper must NOT touch the file when there's nothing new.
- **Cron message length.** OpenClaw cron payloads are bounded; will add one bullet to the existing message rather than rewrite it.
- **XLS parser exceptions.** A malformed XLS should fail loudly in the daily report, not silently.
- **Archive collision.** If the inbox has a file with the same name as something already in archive, append a timestamp.

## Acceptance criteria

1. New script `scripts/process-ibkr-statement-inbox.js`:
   - default inbox: `runtime/ibkr-statements/inbox/`
   - default archive: `runtime/ibkr-statements/archive/`
   - flags: `--portfolio=etf`, `--dry-run`, `--inbox=`, `--archive=`
   - returns `{ ok, scanned, imported, skipped, errors }` JSON
   - exits 0 when inbox empty, 0 when import succeeds, 1 only on hard error
2. New unit test `scripts/test-ibkr-statement-inbox.js`:
   - empty inbox returns `imported: 0`
   - inbox with one valid XLS imports rows and moves file to archive
   - dry-run does not move the file
   - parser failure surfaces error JSON (exit 1)
   - duplicate file (same reference set) returns `skipped: N, imported: 0`
3. The `runtime/ibkr-statements/` tree is gitignored.
4. Daily-sync cron payload updated to include one new step calling the wrapper.
5. `npm run test:safe` stays green.
6. README in `runtime/ibkr-statements/` explaining how to drop a file.

## Actionable checklist

- [ ] Add `runtime/ibkr-statements/` to `.gitignore` (if not already covered)
- [ ] Create `scripts/process-ibkr-statement-inbox.js`
- [ ] Create `scripts/test-ibkr-statement-inbox.js`
- [ ] Create `runtime/ibkr-statements/README.md` (instructions for operator)
- [ ] Run new test, then `npm run test:safe`
- [ ] Update cron job `0ddfde6d-…` payload via `openclaw cron edit` — append step 2.5 calling the wrapper
- [ ] Verify cron message updates (not the schedule)
- [ ] Commit + push

## Out of scope

- Auto-downloading the XLS from IBKR Client Portal. That's a separate flexstatement-API project.
- Touching `monitor-fills`, `live-execution`, basket scripts.
- Any change to `deposits.md` parsing beyond what `import-ibkr-deposits.js` already does.
