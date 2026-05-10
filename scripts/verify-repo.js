const { execFileSync } = require('child_process');
const path = require('path');

const checks = [
  ['validate:all-portfolios', ['scripts/validate-portfolio.js', 'portfolio/etf/portfolio.md', 'portfolio/_template/portfolio.md']],
  ['validate:strategy', ['scripts/validate-strategy.js', 'portfolio/etf/portfolio.md']],
  ['check:activation', ['scripts/check-portfolio-activation.js', 'portfolio/etf/portfolio.md']],
  ['check:generated-state', ['scripts/check-generated-state.js', 'portfolio/etf']],
  ['check:safety', ['scripts/check-safety-controls.js', 'portfolio/etf']],
  ['verify:execution', ['scripts/verify-execution-surface.js']],
  ['test:reporting-completeness', ['scripts/test-reporting-completeness.js']],
  ['test:structured-summary-artifacts', ['scripts/test-structured-summary-artifacts.js']],
  ['test:multi-portfolio-overview', ['scripts/test-multi-portfolio-overview.js']],
  ['test:dashboard-command-center', ['scripts/test-dashboard-command-center.js']],
  ['test:market-hours', ['tests/test-marketHours.js']],
  ['test:ibkr-readiness', ['tests/test-ibkr-readiness.js']],
];

function runCheck([name, args]) {
  const scriptPath = path.join(process.cwd(), args[0]);
  const finalArgs = [scriptPath, ...args.slice(1)];
  execFileSync(process.execPath, finalArgs, {
    cwd: process.cwd(),
    stdio: 'inherit',
    encoding: 'utf8',
  });
  return { name, ok: true };
}

function main() {
  const results = [];
  for (const check of checks) {
    results.push(runCheck(check));
  }
  console.log(JSON.stringify({ ok: true, checks: results }, null, 2));
}

main();
