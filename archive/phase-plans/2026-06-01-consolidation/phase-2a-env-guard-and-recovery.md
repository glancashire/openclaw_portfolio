# Phase 2A — `.env` guard and recovery

## Objective
Prevent future accidental deletion of workspace `.env`, add a daily local backup, reconstruct the missing `.env` conservatively from available evidence, and provide Graham a simple terminal path to re-supply any missing secrets.

## Risks / dependencies
- `.env` is untracked and contains real secrets; recovery must minimize guessing.
- Existing tests intentionally manipulate secret files; guards must preserve test intent while forbidding destructive `.env` deletion.
- Daily backup must stay local, quiet, and non-invasive.

## Action checklist
- [ ] Remove destructive `.env` deletion from tests and switch to temporary rename/restore.
- [ ] Add a small local backup script for `.env` with timestamped copies and a stable latest copy.
- [ ] Register a daily cron backup job.
- [ ] Reconstruct `.env` from `.env.ibkr`, live secret files, docs, and memory-backed values only.
- [ ] Verify focused env/config tests.
- [ ] Give Graham a simple terminal command to append/replace any missing secrets safely.

## Acceptance criteria
- No test path deletes `.env`.
- A daily backup job exists and writes local backup copies.
- `.env` exists again with only evidence-backed values.
- Focused env/config tests pass.
