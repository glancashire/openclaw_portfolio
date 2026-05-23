const path = require('path');
const { checks } = require('../src/reporting/verifyExecutionChecks');
const { runNamedNodeCheck, summarizeResults } = require('../src/reporting/verificationRunner');

function run(script) {
  const scriptPath = path.join(process.cwd(), 'scripts', script);
  const args = [scriptPath];
  if (script === 'test-portfolio-execution-gates.js') args.push('portfolio/etf');
  return runNamedNodeCheck({
    name: `execution:${script}`,
    args,
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function main() {
  const results = [];
  for (const script of checks) {
    results.push(run(script));
  }
  console.log(JSON.stringify(summarizeResults(results), null, 2));
}

main();
