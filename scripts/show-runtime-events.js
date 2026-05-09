const { readRuntimeEvents, summarizeRuntimeEvents, EVENTS_PATH } = require('../src/observability/runtimeEvents');

function parseArgs(argv) {
  const options = { limit: 20, category: null, portfolio: null, level: null, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--limit') options.limit = Number(argv[++i] || options.limit);
    else if (arg === '--category') options.category = argv[++i] || null;
    else if (arg === '--portfolio') options.portfolio = argv[++i] || null;
    else if (arg === '--level') options.level = argv[++i] || null;
    else if (arg === '--json') options.json = true;
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const events = readRuntimeEvents(options);
  const summary = summarizeRuntimeEvents(events);
  const payload = {
    path: EVENTS_PATH,
    filters: options,
    summary,
    events,
  };

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log(`Runtime events: ${EVENTS_PATH}`);
  console.log(`Scanned: ${summary.total}`);
  console.log(`Blocked trades: ${summary.blockedTrades}`);
  console.log(`Degraded broker events: ${summary.degradedBrokerEvents}`);
  console.log(`Stale-data events: ${summary.staleDataEvents}`);
  console.log('---');
  for (const event of events) {
    console.log(`[${event.timestamp}] ${event.level.toUpperCase()} ${event.category}/${event.action} ${event.portfolio} ${event.status}`);
    console.log(`  ${event.summary}`);
  }
}

main();
