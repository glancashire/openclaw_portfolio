# Phase Cleanup-1B — `regenerate-dashboard.js` ergonomics

**Date:** 2026-06-01 21:05 UTC
**Tranche:** 1 (autonomous, low risk)

## Objectives

Make `scripts/regenerate-dashboard.js` accept either a bare portfolio name (`etf`) or a directory path (`portfolio/etf` / absolute), matching the contract of `show-dashboard.js` and `sync-ibkr-after-recovery.js`. Eliminate the operator foot-gun that produced `ENOENT 'etf/holdings.md'`.

## Risks / dependencies

- `regenerateDashboard(portfolioDir)` in `src/reporting/dashboardGenerator.js` expects a directory path; that contract stays.
- Path resolution must be cwd-agnostic (resolve relative to repo root, not `process.cwd()`).
- Existing callers may pass either form; preserve both.

## Actionable checklist

- [ ] Add a `resolvePortfolioDir(arg)` helper at the top of the script:
  - if arg looks like an existing directory (`fs.statSync().isDirectory()`), use it;
  - else if arg is a bare name and `<repoRoot>/portfolio/<arg>` exists, resolve to that;
  - else error with a usage hint that lists valid portfolios.
- [ ] Refactor `main()` to use the helper.
- [ ] Update the usage line accordingly.
- [ ] Add `scripts/test-regenerate-dashboard-cli.js` covering:
  - bare name resolves correctly;
  - relative directory path resolves correctly;
  - absolute directory path resolves correctly;
  - unknown portfolio errors with helpful message and lists candidates;
  - missing arg errors with usage line.
- [ ] Verify `node scripts/regenerate-dashboard.js etf` and `node scripts/regenerate-dashboard.js portfolio/etf` now both succeed.

## Acceptance criteria

- New CLI test passes.
- Both invocation shapes work from the workspace root.
- No regression in existing scripts that call `regenerateDashboard(...)` programmatically.
- `test-repo-root-cleanliness.js` and `test-gitignore-policy.js` still green.
