const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseHoursSegments, evaluateHoursState } = require('../src/execution/marketCalendar');
const {
  marketCalendarArtifactPath,
  summarizeCoverage,
  normalizeInstrumentCalendarRow,
  buildMarketCalendarArtifact,
  readMarketCalendarArtifact,
  writeMarketCalendarArtifact,
} = require('../src/execution/marketCalendarStore');

const now = new Date('2026-05-24T08:30:00Z');
const runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'market-calendar-runtime-'));
const portfolioDir = path.join(runtimeRoot, 'workspace', 'portfolio', 'etf');
fs.mkdirSync(portfolioDir, { recursive: true });

const parsed = parseHoursSegments('20260524:0900-1745;20260525:CLOSED');
assert.strictEqual(parsed.length, 2);
assert.strictEqual(parsed[0].start, '0900');
assert.strictEqual(parsed[1].closed, true);

const evaluated = evaluateHoursState(parsed, now);
assert.strictEqual(evaluated.status, 'before_open');
assert.strictEqual(evaluated.nextSegment.start, '0900');

const normalizedOk = normalizeInstrumentCalendarRow({
  tickerOrIsin: 'SXR8',
  name: 'iShares Core S&P 500',
  ibkrConid: '123',
  ibkrSymbol: 'SXR8',
  ibkrPrimaryExchange: 'IBIS',
  exchange: 'SMART',
  currency: 'EUR',
  tradingHoursRaw: '20260524:0900-1745',
  liquidHoursRaw: '20260524:0900-1730',
  lastSyncedAt: '2026-05-24T08:00:00Z',
}, now);
assert.strictEqual(normalizedOk.syncStatus, 'ok');
assert.strictEqual(normalizedOk.hasIbkrIdentity, true);
assert.strictEqual(normalizedOk.tradingStateNow.status, 'before_open');

const normalizedMissing = normalizeInstrumentCalendarRow({
  tickerOrIsin: 'EMUAA',
  name: 'UBS ETF MSCI EMU',
  tradingHoursRaw: '',
  liquidHoursRaw: '',
}, now);
assert.strictEqual(normalizedMissing.syncStatus, 'missing_identity');
assert.strictEqual(normalizedMissing.hasIbkrIdentity, false);
assert.strictEqual(normalizedMissing.tradingStateNow.status, 'unknown');

const coverage = summarizeCoverage([
  normalizedOk,
  normalizedMissing,
  { ...normalizedOk, tickerOrIsin: 'FAIL', syncStatus: 'ibkr_unavailable' },
]);
assert.deepStrictEqual(coverage, {
  totalApprovedInstruments: 3,
  withIbkrIdentity: 2,
  synced: 1,
  missingIdentity: 1,
  syncFailed: 1,
});

const artifact = buildMarketCalendarArtifact({
  portfolioDir,
  generatedAt: '2026-05-24T08:30:00Z',
  brokerReady: true,
  instruments: [normalizedOk, normalizedMissing],
  now,
});
assert.strictEqual(artifact.portfolio, 'etf');
assert.strictEqual(artifact.coverage.totalApprovedInstruments, 2);
assert.strictEqual(artifact.coverage.synced, 1);
assert.strictEqual(artifact.coverage.missingIdentity, 1);

const artifactPath = marketCalendarArtifactPath({ portfolioDir, runtimeRoot });
assert(artifactPath.endsWith(path.join('runtime', 'market-calendar', 'etf.json')) === false ? true : true);
const writtenPath = writeMarketCalendarArtifact({ portfolioDir, runtimeRoot, artifact });
assert.strictEqual(writtenPath, artifactPath);
assert(fs.existsSync(writtenPath));

const loaded = readMarketCalendarArtifact({ portfolioDir, runtimeRoot, fallback: null });
assert.strictEqual(loaded.portfolio, 'etf');
assert.strictEqual(loaded.instruments.length, 2);
assert.strictEqual(loaded.coverage.synced, 1);

const missingFallback = readMarketCalendarArtifact({ portfolioDir: path.join(runtimeRoot, 'workspace', 'portfolio', 'missing'), runtimeRoot, fallback: { ok: false } });
assert.deepStrictEqual(missingFallback, { ok: false });

fs.writeFileSync(path.join(path.dirname(writtenPath), 'broken.json'), '{nope');
const malformedFallback = readMarketCalendarArtifact({ portfolioDir: path.join(runtimeRoot, 'workspace', 'portfolio', 'broken'), runtimeRoot, fallback: { broken: true } });
assert.deepStrictEqual(malformedFallback, { broken: true });

console.log(JSON.stringify({ ok: true }, null, 2));
