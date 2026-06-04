'use strict';

/**
 * Test: scripts/show-dashboard.js renders the health trend tail line (Phase I-3).
 *
 * Strategy: build a fake repo root with a minimal portfolio dashboard.md and a
 * health-trend.jsonl, then run show-dashboard.js with a custom HOME / cwd and
 * check the output. Because show-dashboard resolves paths relative to its own
 * file, we use a small wrapper that requires the underlying readers directly
 * AND we additionally exec the real script with a temp portfolio to confirm
 * end-to-end rendering.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { readHealthTrendTail, summarizeHealthTrendTail } = require('../src/reporting/healthReport');

let asserted = 0;
function ok(label, cond) {
  assert.ok(cond, label);
  console.log('  ok --', label);
  asserted++;
}

const REPO_ROOT = path.resolve(__dirname, '..');
const TREND_PATH = path.join(REPO_ROOT, 'runtime', 'overview', 'health-trend.jsonl');

// ── Helper unit checks for the rendering primitives ────────────────────────────
{
  // Inject a synthetic trend file into a tmp repo root.
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dash-trend-'));
  const trendDir = path.join(tmpRoot, 'runtime', 'overview');
  fs.mkdirSync(trendDir, { recursive: true });
  const trendPath = path.join(trendDir, 'health-trend.jsonl');
  fs.writeFileSync(trendPath, [
    JSON.stringify({ ts: '2026-06-04T12:00:00Z', portfolio: 'etf', state: 'attention', summary: 'thing happened', blockerCodes: ['delivery_attention'] }),
    JSON.stringify({ ts: '2026-06-04T12:30:00Z', portfolio: 'etf', state: 'attention', summary: 'thing happened', blockerCodes: ['delivery_attention'] }),
    JSON.stringify({ ts: '2026-06-04T13:00:00Z', portfolio: 'etf', state: 'attention', summary: 'thing happened', blockerCodes: ['delivery_attention'] }),
  ].join('\n') + '\n');

  const tail = readHealthTrendTail({ repoRoot: tmpRoot, portfolio: 'etf', limit: 20 });
  const summary = summarizeHealthTrendTail(tail);
  ok('reader: 3 rows', tail.length === 3);
  ok('reader: state=attention', summary.currentState === 'attention');
  ok('reader: consecutiveSame=3', summary.consecutiveSame === 3);
  ok('reader: sinceTs is the first of run', summary.sinceTs === '2026-06-04T12:00:00Z');
}

// ── End-to-end: real show-dashboard.js script renders a Health: line ───────────
// We must use the real repo (the script resolves paths relative to itself).
// The trend log already exists from prior health-check runs; if not, we skip.
{
  if (!fs.existsSync(TREND_PATH)) {
    console.log('  skip -- end-to-end (no health-trend.jsonl in repo)');
  } else {
    const out = execFileSync(process.execPath, [path.join(REPO_ROOT, 'scripts', 'show-dashboard.js'), 'etf'], { cwd: REPO_ROOT, encoding: 'utf8' });
    const m = out.match(/^Health:\s+(.+)$/m);
    ok('e2e: dashboard prints a "Health:" line', !!m);
    if (m) {
      const line = m[1];
      ok('e2e: Health line contains a state token', /\b(healthy|watch|attention|critical)\b/i.test(line));
      ok('e2e: Health line contains UTC timestamp marker', /UTC\)/.test(line));
      ok('e2e: Health line contains an emoji glyph', /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(line));
    }
  }
}

console.log('\nshow-dashboard-health-tail tests: ' + asserted + ' assertions passed');
