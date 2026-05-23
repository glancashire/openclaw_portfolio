const assert = require('assert');
const { summarizeHealthTrends, operatorCommandForIssue } = require('../src/reporting/healthReport');

(function main() {
  const trends = summarizeHealthTrends([
    { at: '2026-05-23T07:00:00Z', kind: 'health_check', health: 'healthy', severity: 'low', blockerCount: 0 },
    { at: '2026-05-23T08:00:00Z', kind: 'health_check', health: 'blocked', severity: 'high', blockerCount: 2 },
    { at: '2026-05-23T08:30:00Z', kind: 'other_event', health: 'ignored', severity: 'low', blockerCount: 0 },
  ]);
  assert.strictEqual(trends.recent.length, 2);
  assert.strictEqual(trends.counts.healthy, 1);
  assert.strictEqual(trends.counts.blocked, 1);
  assert(trends.summaryLines[0].includes('healthy/low'));
  assert.strictEqual(operatorCommandForIssue({ category: 'ibkr_socket_dead' }, 'etf'), '/home/ubuntu/ibgateway-native/start-ibc.sh');
  assert.strictEqual(operatorCommandForIssue({ category: 'cron_excessive_errors' }, 'etf'), 'openclaw cron disable <jobId>');
  console.log(JSON.stringify({ ok: true }, null, 2));
})();
