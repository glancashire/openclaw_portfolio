'use strict';

const assert = require('assert');
const path = require('path');
const { evaluateExecutionAuthority } = require('../src/execution/executionAuthority');

(async () => {
  const result = await evaluateExecutionAuthority({ portfolioDir: path.join(process.cwd(), 'portfolio', 'etf') });
  assert(result.schemaVersion === '1.0', 'Expected schema version');
  assert(result.portfolio === 'etf', 'Expected ETF portfolio');
  assert(typeof result.executionMode === 'string', 'Expected execution mode');
  assert(result.approvalRules && typeof result.approvalRules === 'object', 'Expected approval rules');
  assert(result.holdingsHealth && typeof result.holdingsHealth === 'object', 'Expected holdings health');
  assert(result.brokerReadiness && typeof result.brokerReadiness === 'object', 'Expected broker readiness');
  assert(result.runtimePause && typeof result.runtimePause === 'object', 'Expected runtime pause state');
  assert(result.liveArm && typeof result.liveArm === 'object', 'Expected live arm state');
  assert(result.effectiveAuthority && typeof result.effectiveAuthority === 'object', 'Expected effective authority block');
  assert(typeof result.effectiveAuthority.liveExecutionPossibleNow === 'boolean', 'Expected authority boolean');
  assert(typeof result.effectiveAuthority.requiresExplicitOperatorAction === 'boolean', 'Expected authority action boolean');
  console.log(JSON.stringify({ ok: true, executionMode: result.executionMode, liveExecutionPossibleNow: result.effectiveAuthority.liveExecutionPossibleNow }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
