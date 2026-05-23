const path = require('path');
const { checks } = require('../src/reporting/verifyRepoChecks');
const { runNamedNodeCheck, summarizeResults } = require('../src/reporting/verificationRunner');

function runCheck([name, args]) {
  const scriptPath = path.join(process.cwd(), args[0]);
  const finalArgs = [scriptPath, ...args.slice(1)];
  return runNamedNodeCheck({
    name,
    args: finalArgs,
    cwd: process.cwd(),
    stdio: 'inherit',
  });
}

function main() {
  const results = [];
  for (const check of checks) {
    results.push(runCheck(check));
  }
  console.log(JSON.stringify(summarizeResults(results), null, 2));
}

main();
