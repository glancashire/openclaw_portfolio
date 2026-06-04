'use strict';

/**
 * Test: health-trend.jsonl append + tail summary helpers
 *
 * Phase I-2:
 * - appendHealthTrend writes one JSON line per call to runtime/overview/health-trend.jsonl.
 * - readHealthTrendTail returns the last N entries, optionally filtered by portfolio.
 * - summarizeHealthTrendTail computes the "consecutive same state" run for the dashboard.
 * - All three are best-effort; missing dirs/files do not throw.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  appendHealthTrend,
  readHealthTrendTail,
  summarizeHealthTrendTail,
} = require('../src/reporting/healthReport');

let asserted = 0;
function ok(label, cond) {
  assert.ok(cond, label);
  console.log('  ok --', label);
  asserted++;
}

function makeTmpRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'health-trend-'));
  return root;
}

// ── Append creates file + dir, writes valid JSONL ──────────────────────────────
{
  const repoRoot = makeTmpRoot();
  const report = {
    portfolio: 'etf',
    generatedAt: '2026-06-04T09:00:00.000Z',
    health: {
      state: 'healthy',
      summary: 'All systems normal.',
      severity: 'none',
      blockers: [],
    },
  };
  appendHealthTrend(report, { repoRoot });

  const trendPath = path.join(repoRoot, 'runtime', 'overview', 'health-trend.jsonl');
  ok('append: file created', fs.existsSync(trendPath));
  const text = fs.readFileSync(trendPath, 'utf8');
  ok('append: ends with newline', text.endsWith('\n'));
  const line = text.trim();
  const parsed = JSON.parse(line);
  ok('append: parsed.ts present', parsed.ts === '2026-06-04T09:00:00.000Z');
  ok('append: parsed.portfolio', parsed.portfolio === 'etf');
  ok('append: parsed.state', parsed.state === 'healthy');
  ok('append: parsed.blockerCodes is empty array', Array.isArray(parsed.blockerCodes) && parsed.blockerCodes.length === 0);
}

// ── Append handles missing optional fields ─────────────────────────────────────
{
  const repoRoot = makeTmpRoot();
  appendHealthTrend({ portfolio: 'etf' }, { repoRoot });
  const trendPath = path.join(repoRoot, 'runtime', 'overview', 'health-trend.jsonl');
  const parsed = JSON.parse(fs.readFileSync(trendPath, 'utf8').trim());
  ok('partial: state defaults to healthy', parsed.state === 'healthy');
  ok('partial: summary defaults to empty string', parsed.summary === '');
  ok('partial: blockerCodes empty', parsed.blockerCodes.length === 0);
  ok('partial: ts auto-populated (ISO)', /^\d{4}-\d{2}-\d{2}T/.test(parsed.ts));
}

// ── Multiple appends accumulate ────────────────────────────────────────────────
{
  const repoRoot = makeTmpRoot();
  for (let i = 0; i < 5; i++) {
    appendHealthTrend({
      portfolio: 'etf',
      generatedAt: `2026-06-04T0${i}:00:00.000Z`,
      health: { state: i < 3 ? 'healthy' : 'attention', summary: `tick ${i}`, blockers: [], severity: 'low' },
    }, { repoRoot });
  }
  const tail = readHealthTrendTail({ repoRoot, limit: 10 });
  ok('multi: tail length=5', tail.length === 5);
  ok('multi: tail order preserved', tail[0].summary === 'tick 0' && tail[4].summary === 'tick 4');
  ok('multi: limit=2 truncates from start', readHealthTrendTail({ repoRoot, limit: 2 }).length === 2);
  ok('multi: limit=2 returns last two', readHealthTrendTail({ repoRoot, limit: 2 })[1].summary === 'tick 4');
}

// ── Portfolio filter ───────────────────────────────────────────────────────────
{
  const repoRoot = makeTmpRoot();
  appendHealthTrend({ portfolio: 'etf', health: { state: 'healthy' } }, { repoRoot });
  appendHealthTrend({ portfolio: 'crypto', health: { state: 'attention' } }, { repoRoot });
  appendHealthTrend({ portfolio: 'etf', health: { state: 'healthy' } }, { repoRoot });

  const all = readHealthTrendTail({ repoRoot, limit: 10 });
  const etfOnly = readHealthTrendTail({ repoRoot, portfolio: 'etf', limit: 10 });
  ok('filter: all has 3', all.length === 3);
  ok('filter: etf has 2', etfOnly.length === 2 && etfOnly.every((r) => r.portfolio === 'etf'));
}

// ── readHealthTrendTail: missing file is empty array ───────────────────────────
{
  const repoRoot = makeTmpRoot(); // never written
  ok('missing-file: returns []', JSON.stringify(readHealthTrendTail({ repoRoot })) === '[]');
}

// ── readHealthTrendTail: malformed lines are skipped ───────────────────────────
{
  const repoRoot = makeTmpRoot();
  const trendDir = path.join(repoRoot, 'runtime', 'overview');
  fs.mkdirSync(trendDir, { recursive: true });
  const trendPath = path.join(trendDir, 'health-trend.jsonl');
  fs.writeFileSync(trendPath, [
    JSON.stringify({ portfolio: 'etf', state: 'healthy' }),
    'NOT JSON',
    JSON.stringify({ portfolio: 'etf', state: 'attention' }),
    '',
  ].join('\n') + '\n');
  const tail = readHealthTrendTail({ repoRoot, limit: 10 });
  ok('malformed: skips bad lines, keeps good ones', tail.length === 2);
}

// ── summarizeHealthTrendTail: empty → null ─────────────────────────────────────
{
  ok('summarize: empty input returns null', summarizeHealthTrendTail([]) === null);
}

// ── summarizeHealthTrendTail: same-state run counted correctly ────────────────
{
  const tail = [
    { ts: '2026-06-04T08:00:00Z', portfolio: 'etf', state: 'healthy', summary: 'ok', blockerCodes: [] },
    { ts: '2026-06-04T09:00:00Z', portfolio: 'etf', state: 'attention', summary: 'thing', blockerCodes: ['x'] },
    { ts: '2026-06-04T10:00:00Z', portfolio: 'etf', state: 'attention', summary: 'thing', blockerCodes: ['x'] },
    { ts: '2026-06-04T11:00:00Z', portfolio: 'etf', state: 'attention', summary: 'thing', blockerCodes: ['x'] },
  ];
  const s = summarizeHealthTrendTail(tail);
  ok('summarize: currentState matches last', s.currentState === 'attention');
  ok('summarize: consecutiveSame=3', s.consecutiveSame === 3);
  ok('summarize: sinceTs is the first of the run', s.sinceTs === '2026-06-04T09:00:00Z');
  ok('summarize: blockerCodes carried', s.blockerCodes.length === 1 && s.blockerCodes[0] === 'x');
  ok('summarize: totalSampleCount=4', s.totalSampleCount === 4);
}

console.log('\nhealth-trend-jsonl tests: ' + asserted + ' assertions passed');
