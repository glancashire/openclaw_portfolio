# Phase W4 — Runtime artifact hash-gating (Roll-up E)

**Goal:** Replace raw `fs.writeFileSync` calls in the noisiest artifact generators with the existing `writeTextIfChanged` / `writeJsonIfChanged` helpers from `artifactWriter.js`, so files only touch disk when their content actually changes.

## Objectives
1. Identify the 3–5 noisiest generators (by `git status` churn count)
2. Replace raw `writeFileSync` calls with hash-gated equivalents
3. Verify: regenerate all artifacts, confirm `git status` shows fewer modified files when content hasn't changed
4. Add a regression test that confirms the hash-gate skips no-op writes
5. Close Roll-up E items

## Identified noisy generators
- `src/reporting/summaryArtifacts.js` — 15 writeFileSync calls (overview, delivery-status, daily-summary, approvals-queue, cockpit, portfolio-index, pending-actions, recovery-checklist)
- `src/reporting/healthReport.js` — 3 writeFileSync calls (health-report json/md/html)

## Risks / dependencies
- JSON files with `generatedAt` timestamps will still change on every run (the timestamp IS content). Solution: exclude `generatedAt` from the hash comparison for JSON files, OR accept that timestamp-differing files are genuine changes. I'll take the second approach — the real win is preventing no-op writes when the full content is identical.
- `summaryArtifacts.js::generateOverviewArtifacts` writes to ~12 files. Each one needs the import + replacement.
- The cockpit HTML includes runtime timestamps; it will still change on every run. That's fine — we're reducing churn, not eliminating it.

## Actionable checklist
- [ ] Import `writeTextIfChanged`/`writeJsonIfChanged` in `summaryArtifacts.js` and `healthReport.js`
- [ ] Replace all 15 raw `fs.writeFileSync` calls in `summaryArtifacts.js` with the hash-gated equivalents
- [ ] Replace all 3 raw `fs.writeFileSync` calls in `healthReport.js` with the hash-gated equivalents
- [ ] Add `scripts/test-artifact-hash-gate.js`:
  - Double-write the same content → assert file mtime unchanged (or writeJsonIfChanged returns `{ wrote: false }`)
  - Write changed content → assert `{ wrote: true }`
- [ ] Wire into verifyRepoChecks
- [ ] Run npm test → green
- [ ] Close Roll-up E
- [ ] Commit + push

## Acceptance criteria
- 18 raw writeFileSync calls replaced with hash-gated writes
- Double-regeneration of overview artifacts produces 0 unstaged file changes
- Test verifies skip behavior
- npm test exit 0
- Roll-up E checked off
