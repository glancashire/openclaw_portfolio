const assert = require('assert');
const { buildPortfolioPerformanceWindows } = require('../src/reporting/performanceWindows');

(function main() {
  const historyRows = [
    { date: '2026-01-03', totalChf: 1000 },
    { date: '2026-05-31', totalChf: 1200 },
    { date: '2026-06-23', totalChf: 1300 },
    { date: '2026-06-30', totalChf: 1500 },
  ];
  const performance = buildPortfolioPerformanceWindows({
    historyRows,
    sincePurchase: { availability: 'available', gainChf: 250, gainPct: 20, costBasisChf: 1250 },
    now: new Date('2026-06-30T12:00:00Z'),
  });

  assert.strictEqual(performance.windows.sincePurchase.gainChf, 250);
  assert.strictEqual(performance.windows.last7d.anchorDate, '2026-06-23');
  assert.strictEqual(performance.windows.last7d.gainChf, 200);
  assert.strictEqual(performance.windows.last30d.anchorDate, '2026-05-31');
  assert.strictEqual(performance.windows.last30d.gainPct, 25.0);
  assert.strictEqual(performance.windows.ytd.anchorDate, '2026-01-03');
  assert.strictEqual(performance.windows.ytd.availability, 'partial');
  assert.strictEqual(performance.windows.last365d.availability, 'missing_history');

  console.log(JSON.stringify({ ok: true }, null, 2));
})();
