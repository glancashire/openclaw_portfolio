'use strict';

const assert = require('assert');
const path = require('path');
const { loadDiscoveryPolicy, classify, buildDomainSummary } = require('./discover-test-suites');

function main() {
  const policy = loadDiscoveryPolicy();
  assert.strictEqual(policy.version, 1);
  assert(Array.isArray(policy.scanDirs));
  assert(policy.scanDirs.includes('scripts'));
  assert(policy.scanDirs.includes('tests'));
  assert.strictEqual(policy.overrides['scripts/test-mailgun.js'].lane, 'external');
  assert.strictEqual(policy.quarantines['scripts/test-delivery-executor.js'].includes('W10 quarantine'), true);

  const overrideClassified = classify(
    'scripts/test-dashboard-digest-rendering.js',
    "const assert = require('assert');",
    policy,
  );
  assert.deepStrictEqual(overrideClassified, {
    lane: 'integration',
    reason: 'builds digest output from seeded repo fixtures',
  });

  const brokerImport = "../src/brokers/interactive-brokers/client";
  const connectCall = 'client' + '.connect()';
  const liveSmokeClassified = classify(
    'scripts/test-classifier-live-sample.js',
    `const { InteractiveBrokersClient } = require('${brokerImport}');\n${connectCall};`,
    policy,
  );
  assert.strictEqual(liveSmokeClassified.lane, 'live-smoke');

  const safeClassified = classify(
    'scripts/test-safe-sample.js',
    "const assert = require('assert');\nassert.strictEqual(1, 1);",
    policy,
  );
  assert.strictEqual(safeClassified.lane, 'safe');

  const domains = buildDomainSummary([
    { path: 'scripts/test-ibkr-config-helpers.js', lane: 'safe', inVerifyRepoChecks: false, quarantined: false },
    { path: 'scripts/test-ibkr-http-transport.js', lane: 'integration', inVerifyRepoChecks: true, quarantined: false },
    { path: 'scripts/test-dashboard-digest-rendering.js', lane: 'integration', inVerifyRepoChecks: false, quarantined: false },
    { path: 'scripts/test-dashboard-command-center.js', lane: 'safe', inVerifyRepoChecks: true, quarantined: false },
    { path: 'scripts/test-portfolio-etf-instruments.js', lane: 'safe', inVerifyRepoChecks: false, quarantined: true },
  ]);

  const ibkr = domains.find((row) => row.domain === 'ibkr');
  assert(ibkr);
  assert.strictEqual(ibkr.total, 2);
  assert.strictEqual(ibkr.safe, 1);
  assert.strictEqual(ibkr.integration, 1);
  assert.strictEqual(ibkr.inVerifyRepoChecks, 1);

  const dashboard = domains.find((row) => row.domain === 'dashboard');
  assert(dashboard);
  assert.strictEqual(dashboard.total, 2);

  const portfolio = domains.find((row) => row.domain === 'portfolio');
  assert(portfolio);
  assert.strictEqual(portfolio.quarantined, 1);

  console.log(JSON.stringify({ ok: true, policyPath: path.resolve('config/test-discovery-policy.json') }, null, 2));
}

main();
