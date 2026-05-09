'use strict';

const { summarizeRuntimeEvents } = require('../src/observability/runtimeEvents');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function main() {
  const events = [
    {
      timestamp: '2026-05-09T09:00:00.000Z',
      level: 'info',
      category: 'execution',
      action: 'queue_open_runner',
      portfolio: 'etf',
      status: 'observed',
      summary: 'Queued row for market-open runner first handoff.',
    },
    {
      timestamp: '2026-05-09T09:01:00.000Z',
      level: 'info',
      category: 'execution',
      action: 'queue_open_runner',
      portfolio: 'etf',
      status: 'observed',
      summary: 'Queued row for market-open runner retry after operator recovery.',
    },
    {
      timestamp: '2026-05-09T09:02:00.000Z',
      level: 'warn',
      category: 'risk',
      action: 'draft_execution_blocked',
      portfolio: 'etf',
      status: 'blocked',
      summary: 'Stale quote blocked execution.',
    },
  ];

  const summary = summarizeRuntimeEvents(events);
  assert(summary.total === 3, `expected total 3, got ${summary.total}`);
  assert(summary.openRunnerQueueEvents === 1, `expected one first-handoff event, got ${summary.openRunnerQueueEvents}`);
  assert(summary.openRunnerRetryEvents === 1, `expected one retry event, got ${summary.openRunnerRetryEvents}`);
  assert(summary.blockedTrades === 1, `expected one blocked trade, got ${summary.blockedTrades}`);
  assert(summary.staleDataEvents === 1, `expected one stale-data event, got ${summary.staleDataEvents}`);

  console.log(JSON.stringify({ ok: true, summary }, null, 2));
}

main();
