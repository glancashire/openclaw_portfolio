const fs = require('fs');
const path = require('path');
const { evaluateSafetyControls } = require('../src/validation/safetyControls');
const { readRuntimeEvents, summarizeRuntimeEvents, EVENTS_PATH } = require('../src/observability/runtimeEvents');
const { brokerErrorStatus } = require('../src/execution/runtimeState');

const portfolioDirArg = process.argv[2] || 'portfolio/etf';
const portfolioDir = path.resolve(portfolioDirArg);
const portfolioPath = path.join(portfolioDir, 'portfolio.md');
const holdingsPath = path.join(portfolioDir, 'holdings.md');
const portfolioName = path.basename(portfolioDir);

const safety = evaluateSafetyControls({ portfolioPath, holdingsPath });
const events = readRuntimeEvents({ portfolio: portfolioName, limit: 100 });
const eventSummary = summarizeRuntimeEvents(events);
const brokerErrors = brokerErrorStatus(portfolioName);
const payload = {
  portfolio: portfolioName,
  ok: (safety.blockers || []).length === 0 && !brokerErrors.stopAutomation,
  blockers: safety.blockers || [],
  diagnostics: safety.diagnostics || {},
  brokerErrors,
  runtimeEventsPath: EVENTS_PATH,
  runtimeEventsPresent: fs.existsSync(EVENTS_PATH),
  runtimeEventSummary: eventSummary,
};

console.log(JSON.stringify(payload, null, 2));
process.exit(payload.ok ? 0 : 1);
