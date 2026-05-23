'use strict';

/* Phase 206 — Tests for sparkline, historyDigest, cronHealthCard. */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const realRoot = path.resolve(__dirname, '..');
const { buildSparklineSvg } = require(path.join(realRoot, 'src/reporting/sparkline'));
const { readNetLiqHistory, lastNDays, parseHistoryRow } = require(path.join(realRoot, 'src/reporting/historyDigest'));
const { summarizeCronJobs, severityFor } = require(path.join(realRoot, 'src/reporting/cronHealthCard'));

(async () => {
  // ── Sparkline tests ──
  // No data -> placeholder text
  let svg = buildSparklineSvg([]);
  assert(svg.includes('<svg'));
  assert(svg.includes('no data'));

  // Single point -> horizontal line + dot
  svg = buildSparklineSvg([100]);
  assert(svg.includes('<line'));
  assert(svg.includes('<circle'));

  // Two points -> path
  svg = buildSparklineSvg([100, 200]);
  assert(svg.includes('<path'));
  assert(svg.includes('M'));
  assert(svg.includes('L'));

  // Realistic series -> SVG with stroke + fill paths
  svg = buildSparklineSvg([5000, 5050, 5100, 4980, 5200, 5250]);
  assert(svg.includes('<svg'));
  assert(svg.includes('stroke="'));
  assert(svg.includes('fill="rgba(29, 78, 216, 0.10)"'));

  // All-zeros -> doesn't crash, renders a flat line at midpoint
  svg = buildSparklineSvg([0, 0, 0, 0]);
  assert(svg.includes('<svg'));

  // ── History digest tests ──
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'p206-'));
  const historyMd = `# History: test

## Daily Valuation History

| Date | Snapshot | Total value CHF | Invested CHF | Cash CHF | Daily change CHF | Daily change % | Notes |
|---|---|---:|---:|---:|---:|---:|---|
| 2026-05-01 | start_of_day | 5000 | 0 | 5000 | 0 | 0 | start |
| 2026-05-01 | end_of_day | 5050 | 200 | 4850 | 50 | 1 | end |
| 2026-05-02 | end_of_day | 5100 | 250 | 4850 | 50 | 1 | end |
| 2026-05-03 | end_of_day | 5200 | 350 | 4850 | 100 | 2 | end |
| 2026-05-04 | start_of_day | 5200 | 350 | 4850 | 0 | 0 | start |
| 2026-05-04 | end_of_day | 5300 | 450 | 4850 | 100 | 2 | end |
`;
  fs.writeFileSync(path.join(tmpDir, 'history.md'), historyMd);
  const series = readNetLiqHistory(tmpDir);
  assert.strictEqual(series.length, 4, 'one row per unique date');
  // Latest end_of_day for 2026-05-01 should win over start_of_day
  const may1 = series.find((r) => r.date === '2026-05-01');
  assert.strictEqual(may1.totalChf, 5050);
  assert.strictEqual(may1.snapshot, 'end_of_day');
  // Sorted ascending
  assert.strictEqual(series[0].date, '2026-05-01');
  assert.strictEqual(series[3].date, '2026-05-04');
  // lastNDays
  const last2 = lastNDays(series, 2);
  assert.strictEqual(last2.length, 2);
  assert.strictEqual(last2[0].date, '2026-05-03');

  // parseHistoryRow returns null for non-data lines
  assert.strictEqual(parseHistoryRow('## Daily Valuation History'), null);
  assert.strictEqual(parseHistoryRow('| Date | Snapshot | ... |'), null);

  // ── Cron health tests ──
  const now = Date.now();
  const jobs = [
    { id: 'a', name: 'job-a', enabled: true, schedule: { expr: '0 8 * * *' }, state: { consecutiveErrors: 0, lastRunAtMs: now - 60_000 } },
    { id: 'b', name: 'job-b', enabled: true, schedule: { expr: '0 8 * * *' }, state: { consecutiveErrors: 1, lastRunAtMs: now - 60_000 } },
    { id: 'c', name: 'job-c', enabled: true, schedule: { expr: '0 8 * * *' }, state: { consecutiveErrors: 5, lastRunAtMs: now - 60_000, lastError: 'whatever' } },
    { id: 'd', name: 'job-d', enabled: true, schedule: { expr: '0 8 * * *' }, state: { consecutiveErrors: 25, lastRunAtMs: now - 60_000 } },
    { id: 'e', name: 'job-e', enabled: true, schedule: { expr: '0 8 * * *' }, state: { consecutiveErrors: 0, lastRunAtMs: now - 1000 * 60 * 60 * 72 } }, // 72h stale
    { id: 'f', name: 'job-f', enabled: false, schedule: { expr: '0 8 * * *' }, state: {} }, // disabled - excluded
  ];
  const result = summarizeCronJobs(jobs, { now });
  assert.strictEqual(result.total, 5, 'disabled job excluded');
  // Sort: critical < alert < warning < stale < ok
  assert.strictEqual(result.jobs[0].id, 'd', 'critical first');
  assert.strictEqual(result.jobs[0].severity, 'critical');
  assert.strictEqual(result.jobs[1].id, 'c');
  assert.strictEqual(result.jobs[1].severity, 'alert');
  assert.strictEqual(result.jobs[2].id, 'b');
  assert.strictEqual(result.jobs[2].severity, 'warning');
  assert.strictEqual(result.jobs[3].id, 'e');
  assert.strictEqual(result.jobs[3].severity, 'stale');
  assert.strictEqual(result.jobs[4].id, 'a');
  assert.strictEqual(result.jobs[4].severity, 'ok');
  assert.strictEqual(result.failing, 3);
  assert.strictEqual(result.healthy, 1);

  // severityFor edge cases
  assert.strictEqual(severityFor({ consecutiveErrors: 10 }), 'critical');
  assert.strictEqual(severityFor({ consecutiveErrors: 3 }), 'alert');
  assert.strictEqual(severityFor({ consecutiveErrors: 1 }), 'warning');
  assert.strictEqual(severityFor({ consecutiveErrors: 0 }), 'ok');
  assert.strictEqual(severityFor({ consecutiveErrors: 0, lastRunAtMs: now - 1000 * 60 * 60 * 50 }), 'stale');

  console.log(JSON.stringify({ ok: true, sparkline: 5, historyDigest: 5, cronHealth: 12 }));
})().catch((error) => { console.error(error.stack || String(error)); process.exit(1); });
