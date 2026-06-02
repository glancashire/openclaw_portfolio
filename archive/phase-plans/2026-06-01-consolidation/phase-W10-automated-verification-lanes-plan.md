# Phase W10 — Automated verification lanes

- **Status:** in progress
- **Owner:** bb8 (subagent)
- **Started:** 2026-05-27
- **Wave:** W10 of `archive/tasks/wave-plan-2026-05-27-closeout.md`

## Goal

Ship lane-aware automated verification:

- Keep `npm test` (= `scripts/verify-repo.js` driven by
  `src/reporting/verifyRepoChecks.js`) as the curated, always-green pre-commit
  gate. Don't change its behaviour.
- Replace the primitive `scripts/test-all.js` (runs every `test-*.js`
  blindly, with a hardcoded skip list) with a **manifest-driven, lane-aware**
  runner that categorises every test file in `scripts/test-*.js` and
  `tests/test-*.js` into one of four lanes:
  - `safe` — pure unit tests (no network, no broker, no Mailgun)
  - `integration` — needs filesystem / portfolio fixtures, no network
  - `live-smoke` — needs IBKR gateway / real network
  - `external` — needs Mailgun or external APIs
- Document the lanes in `docs/operations/test-lanes.md`.
- Make the manifest verifiable (test wired into the curated gate).

## Background observations

- `npm test` runs ~55 curated checks, not 15 (task brief was estimated).
- `npm run test:all` already exists but is a flat runner with a hardcoded
  skip-set; it does **not** distinguish lanes and would happily try to call
  IBKR / Mailgun in CI.
- `scripts/test-*.js` count: ~271. `tests/test-*.js` count: 12.
- The existing `test-all.js` skip list is the closest thing to lane data
  today. We can use it as a seed for `live-smoke` / `external`.

## Categorisation heuristic (subject to override list)

Read each test file; classify in priority order:

1. **`external`** if file imports `lib/mailgun`, `node-fetch`, or matches
   `/test-mailgun/`, `/test-trade-notification-email/`.
2. **`live-smoke`** if file requires a broker client module (anything under
   `src/brokers/interactive-brokers/` whose name contains `client` or
   `nativeClient`) **and** calls a method that initiates a connection
   (heuristic: file contains `.authenticate(` or `.connect(` or
   `await client.`), OR matches `/test-interactive-brokers-(auth|native-socket)/`,
   `/test-monitor-fills-real-orders/` (this last one is actually a static
   source-grep test and should be `safe` — handled via override).
3. **`safe`** if file uses only `require('assert')`, has no broker imports,
   no `fetch`, no `child_process` execFile of network-bound scripts. We
   detect by absence of disqualifiers + presence of `assert(`/
   `require('assert')`.
4. **`integration`** — default fallback. Anything that loads portfolio
   fixtures, writes under `runtime/`, or doesn't trip the safe heuristic.

A small explicit override map handles ambiguous files (e.g.
`test-monitor-fills-real-orders.js` is actually a source-grep ⇒ `safe`).

## Deliverables

1. **This plan** committed first (separate commit).
2. **`scripts/discover-test-suites.js`** — scans both directories,
   categorises, writes `docs/operations/test-manifest.json`. Also has a
   `--check` mode that fails if the on-disk manifest is stale.
3. **`docs/operations/test-manifest.json`** — generated artifact.
4. **`scripts/run-all-discovered-tests.js`** — reads the manifest, accepts
   `--lane=safe|integration|live-smoke|external|all` (default = `safe,integration`),
   runs each test file with a per-file timeout (default 60s), reports
   pass/fail, exits non-zero on any failure.
5. **`package.json`** — repoint `"test:all"` to the new runner. Keep the
   existing key (already declared); the new script becomes the
   implementation.
6. **`scripts/test-test-manifest-shape.js`** — validates:
   - manifest exists, valid JSON
   - every entry has `path`, `lane`, `inVerifyRepoChecks`
   - lane ∈ {safe, integration, live-smoke, external}
   - every `path` exists on disk
   - every `verifyRepoChecks` entry appears in manifest with
     `inVerifyRepoChecks: true`
   - manifest is in sync with disk (no orphan files, no missing files)
7. **Wire test #6 into `verifyRepoChecks`** as
   `test:test-manifest-shape`.
8. **`docs/operations/test-lanes.md`** — explains lanes, when each runs,
   and how to add a new test (essentially: write the test, run
   `node scripts/discover-test-suites.js`, commit the regenerated manifest).
9. **Outcome:** `npm test` green; `npm run test:all -- --lane=safe` runs and
   reports honestly (failing tests in the safe lane are documented as
   known-bad and quarantined into the manifest under a `quarantined: true`
   flag rather than fixed).

## Non-goals

- Don't fix pre-existing test failures.
- Don't try to remove tests from `verifyRepoChecks`.
- Don't make `test:all` part of pre-commit.
- Don't rewrite `verificationRunner.js`.

## Risk / safety

- The runner must NOT auto-run live-smoke or external lanes by default —
  that would call IBKR / Mailgun on a developer's machine.
- The discoverer must be deterministic so the manifest is reviewable in
  diffs. Sort everything.
- Per-file timeout prevents a hung `live-smoke` test (run via explicit
  `--lane=live-smoke`) from killing CI.

## Verification plan

1. `node scripts/discover-test-suites.js` → manifest written.
2. `node scripts/test-test-manifest-shape.js` exits 0.
3. `npm test` exits 0 (curated gate, with new check wired in).
4. `npm run test:all -- --lane=safe` runs to completion. Quarantine any
   failing safe tests into the manifest with reason.
5. Commit + push.

## Out of scope for this wave

- A dedicated CI workflow that runs `--lane=safe` periodically. The
  scaffolding is in place; CI wiring is a follow-up.
