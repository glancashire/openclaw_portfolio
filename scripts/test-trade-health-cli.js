#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

const scriptPath = path.resolve(__dirname, 'trade-health.js');

function testScriptExists() {
  assert.ok(fs.existsSync(scriptPath), 'trade-health.js should exist');
}

function testRequirable() {
  // Requiring should not crash (module exports main).
  const mod = require(scriptPath);
  assert.ok(typeof mod.main === 'function', 'exports main function');
  assert.ok(typeof mod.parseArgs === 'function', 'exports parseArgs function');
  assert.ok(typeof mod.renderHuman === 'function', 'exports renderHuman function');
}

function testParseArgs() {
  const flags = require(scriptPath).parseArgs(['--portfolio=demo', '--json']);
  assert.strictEqual(flags.portfolio, 'demo');
  assert.strictEqual(flags.json, true);
}

function testMissingPortfolioDirJson() {
  // Run the script against a non-existent portfolio directory.
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trade-health-missing-'));
  try {
    execSync(`node ${scriptPath} --portfolio=nonexistent --json`, { cwd: tempDir, encoding: 'utf8' });
    assert.fail('should exit non-zero for missing portfolio');
  } catch (err) {
    assert.strictEqual(err.status, 2, `expected exit code 2, got ${err.status}`);
    const output = JSON.parse(err.stdout || err.output?.[1] || '{}');
    assert.strictEqual(output.ok, false);
    assert.strictEqual(output.error, 'portfolio_not_found');
  }
}

function testMissingPortfolioDirStderr() {
  // Non-JSON mode: prints to stderr.
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trade-health-missing-'));
  try {
    execSync(`node ${scriptPath} --portfolio=nonexistent`, { cwd: tempDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    assert.fail('should exit non-zero for missing portfolio');
  } catch (err) {
    assert.strictEqual(err.status, 2);
    const stderr = err.stderr || '';
    assert.ok(/not found/i.test(stderr), `expected 'not found' in stderr, got: ${stderr}`);
  }
}

function testJsonOutputShape() {
  // Build a minimal mock environment so buildSelfHealPlan can succeed.
  // This is an integration-ish test using Module._load interception via
  // child_process with a wrapper that injects mocks.
  const wrapperPath = path.join(os.tmpdir(), `trade-health-mock-wrapper-${Date.now()}.js`);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trade-health-json-'));
  const portfolioDir = path.join(tempDir, 'portfolio', 'etf');
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), '# Trades\n\n## Trade Log\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n');
  fs.mkdirSync(path.join(tempDir, 'runtime'), { recursive: true });
  fs.writeFileSync(path.join(tempDir, 'runtime', 'fill-notifications-state.json'), JSON.stringify({ notifiedFills: [], reconciledUnnotifiedFills: [] }));

  const wrapper = `
const Module = require('module');
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request.endsWith('../brokers/interactive-brokers/readiness') || request === '../brokers/interactive-brokers/readiness') {
    return { getInteractiveBrokersReadiness: async () => ({ reachable: true, authenticated: true, message: 'ok' }) };
  }
  if (request.endsWith('../reporting/deliveryPolicy') || request === '../reporting/deliveryPolicy') {
    return { reportDeliveryStatus: () => ({ pendingActions: [] }) };
  }
  if (request.endsWith('../reporting/cronJobsFetcher') || request === '../reporting/cronJobsFetcher') {
    return { fetchCronHealth: () => ({ jobs: [] }) };
  }
  return originalLoad.apply(this, arguments);
};
// Invalidate cache so fresh requires pick up our mocks.
Object.keys(require.cache).filter(k => /portfolioHealth/.test(k)).forEach(k => delete require.cache[k]);
const { main } = require('${scriptPath.replace(/\\/g, '\\\\')}');
main().then(c => process.exit(c)).catch(e => { console.error(e); process.exit(1); });
`;
  fs.writeFileSync(wrapperPath, wrapper);

  const stdout = execSync(`node ${wrapperPath} --portfolio=etf --json`, {
    cwd: tempDir,
    encoding: 'utf8',
    env: { ...process.env, NODE_PATH: path.resolve(__dirname, '..', 'node_modules') },
  });
  const output = JSON.parse(stdout);
  assert.strictEqual(output.ok, true);
  assert.ok(['healthy', 'degraded', 'blocked', 'paused'].includes(output.health.health));
  assert.ok(output.hasOwnProperty('classified'));
  assert.ok(output.hasOwnProperty('healed'));
  assert.ok(output.hasOwnProperty('openIssues'));
  assert.ok(output.hasOwnProperty('actions'));
  assert.strictEqual(output.dryRun, true);
  assert.strictEqual(output.portfolio, 'etf');
}

function testRenderHuman() {
  const { renderHuman } = require(scriptPath);
  const mockPlan = {
    portfolio: 'etf',
    health: { health: 'degraded', severity: 'medium', nextAction: 'Review queued rows.', blockers: [{ code: 'open_runner_backlog', message: '2 row(s) queued' }], recommendedActions: [] },
    openIssues: [{ category: 'delivery_missing_target', severity: 'medium', symptom: 'Telegram needs chatId', summary: 'Add target' }],
    healed: [{ kind: 'restart_ibkr_gateway_if_socket_dead', applied: false, blocked: 'operator_present_restart_only', budget: { attempts: 0, blocked: null } }],
    actions: [{ kind: 'command', command: 'node scripts/trade.js requeue-open portfolio/etf --all', reason: 'Hand rows back' }],
  };
  const text = renderHuman(mockPlan);
  assert.ok(/degraded/i.test(text));
  assert.ok(/delivery_missing_target/i.test(text));
  assert.ok(/operator_present_restart_only/i.test(text));
  assert.ok(/requeue-open/i.test(text));
}

function main() {
  testScriptExists();
  testRequirable();
  testParseArgs();
  testMissingPortfolioDirJson();
  testMissingPortfolioDirStderr();
  testJsonOutputShape();
  testRenderHuman();
  console.log(JSON.stringify({ ok: true, tests: 7 }, null, 2));
}

main();
