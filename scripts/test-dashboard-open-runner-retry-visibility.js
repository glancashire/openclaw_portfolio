const fs = require('fs');
const path = require('path');
const assert = require('assert');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'reporting', 'dashboardGenerator.js'), 'utf8');
const matchCount = (source.match(/openRunnerRetryState,/g) || []).length;
assert(matchCount >= 2, `expected regenerateDashboard to pass openRunnerRetryState into both generateDashboard calls, got ${matchCount}`);
assert(source.includes('const openRunnerRetryState = summarizeOpenRunnerRetryState(tradesPath);'), 'expected regenerateDashboard to compute openRunnerRetryState from tradesPath');
console.log(JSON.stringify({ ok: true }, null, 2));
