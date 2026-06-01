# Phase Cleanup-1D — Holdings sync wall-clock + avg-cost diff guard

**Date:** 2026-06-01 22:18 UTC
**Tranche:** 2

## Objectives

1. Cut holdings-sync wall-clock from ~124 s to <30 s under degraded posture.
2. Stop rewriting `holdings-avg-cost.json` on every sync when the canonicalized JSON is byte-identical to disk (H2).

## Risks / dependencies

- Touches `enrichPositionsWithMarketSnapshot()` in `holdingsSync.js` — swap sequential `for` loop for bounded parallelism + per-call timeout. Failed snapshots already fall back gracefully today.
- Touches `writeHoldingsSnapshot()` in `holdingsSnapshot.js` — must not change the `.md` write semantics, only the avg-cost sidecar write.
- Avg-cost diff must use canonicalized JSON (sorted keys) so key-order changes don't trigger spurious rewrites.
- Backward-compatible return shape required (downstream callers read `result.outPath` etc.).

## Approach

### 1. Parallelize market-snapshot fetches

Replace the sequential fetch loop with `Promise.allSettled` of small bounded batches. Each fetch wrapped in a per-call timeout (default 4 s) so a single slow conid can't stall the whole sync. Result map is identical; only wall-clock changes.

Reasoning for batching vs full parallel: IBKR will rate-limit or queue snapshot requests; concurrency=4 keeps us well under any sensible cap and gives a 4× speedup floor.

### 2. Avg-cost sidecar write guard

Before `fs.writeFileSync(sidecarPath, ...)`:
- Read existing file (if any).
- Canonicalize both old and new payloads via `JSON.stringify(obj, Object.keys(obj).sort(), 2)`.
- Skip write when identical.

## Actionable checklist

- [ ] Add `fetchSnapshotsConcurrent(client, conids, { concurrency, perCallTimeoutMs })` helper in `holdingsSync.js`.
- [ ] Replace sequential loop in `enrichPositionsWithMarketSnapshot` with the helper.
- [ ] Add `writeAvgCostSidecarIfChanged(sidecarPath, avgCostMap)` helper in `holdingsSnapshot.js`.
- [ ] Replace direct `fs.writeFileSync(sidecarPath, ...)` with the helper; canonicalize via sorted keys.
- [ ] New unit test `scripts/test-holdings-sync-perf-and-avg-cost.js` covering:
  - concurrent helper resolves all conids; per-call timeout collapses slow ones.
  - avg-cost helper writes when missing.
  - avg-cost helper writes when content differs.
  - avg-cost helper SKIPS write when content identical (verify mtime unchanged).
  - avg-cost helper writes when only key order differs (canonicalized; should NOT rewrite).
- [ ] Verify existing tests still pass.

## Acceptance criteria

- Holdings sync wall-clock under degraded posture <= 30 s for 9 positions (measured manually post-merge; no automated assertion).
- `git status` after a sync shows `holdings-avg-cost.json` only when avg-cost values genuinely change.
- New regression test passes.
- Existing safe-lane tests stay green.
