# Phase G plan — In-process TTL cache for cron-jobs fetcher

## Why
`scripts/test-multi-portfolio-overview.js` takes ~28s. Profiling shows
98% of wall time in `epoll_pwait`, with every tick under `execSync` →
`fetchCronJobs` → `openclaw cron list --json`. Each spawn takes ~2.5s
and the test triggers 4 of them via three different code paths
(`generateOverviewArtifacts` x2, `generateOverviewBoard` x1).

This is also a production issue: any pipeline that builds multiple
dashboards in one process (digest + overview + health) pays the spawn
cost N times.

## Design
Add an in-process TTL cache to `src/reporting/cronJobsFetcher.js`,
default 30s, keyed by `timeoutMs`. Expose `clearCronCache()` for
long-running daemons and tests. Backwards-compatible: existing callers
get caching automatically; pass `useCache: false` to opt out.

## Risks / dependencies
- Stale cache on long-running processes — 30s TTL bounds the staleness;
  cron state on a developer machine doesn't change faster than that in
  practice.
- Multi-process / cron daemon: each subprocess has its own cache, which
  is fine because each subprocess only renders once.
- Test must not be flaky on slow CI — TTL test uses a 50ms TTL +
  spin-wait ~80ms.

## Acceptance criteria
- `scripts/test-multi-portfolio-overview.js` drops from 28s to ≤16s.
- New `scripts/test-cron-jobs-cache.js` covers cache hit, miss, clear,
  bypass, key sensitivity (timeoutMs), TTL expiry.
- Cache test wired into `src/reporting/verifyRepoChecks.js`.
- `plans/follow-ups.md` item 1 marked PARTIALLY RESOLVED.

## Status
Done as part of this commit.
