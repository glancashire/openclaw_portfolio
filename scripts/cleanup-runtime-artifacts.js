#!/usr/bin/env node
'use strict';

const path = require('path');
const { sweepRuntimeArtifacts } = require('../src/execution/runtimeCleanup');

function parseArgs(argv) {
  const out = {
    portfolio: 'etf',
    dryRun: false,
    rootDir: process.cwd(),
    now: new Date(),
    proposalKeepDays: 7,
    approvedKeepDays: 30,
    circuitBreakerKeepDays: 7,
  };
  for (const arg of argv) {
    if (arg === '--dry-run') out.dryRun = true;
    else if (arg.startsWith('--portfolio=')) out.portfolio = arg.split('=')[1] || out.portfolio;
    else if (arg.startsWith('--root=')) out.rootDir = path.resolve(arg.split('=')[1] || out.rootDir);
    else if (arg.startsWith('--now=')) out.now = new Date(arg.split('=')[1]);
    else if (arg.startsWith('--proposal-keep-days=')) out.proposalKeepDays = Number(arg.split('=')[1]);
    else if (arg.startsWith('--approved-keep-days=')) out.approvedKeepDays = Number(arg.split('=')[1]);
    else if (arg.startsWith('--circuit-breaker-keep-days=')) out.circuitBreakerKeepDays = Number(arg.split('=')[1]);
  }
  return out;
}

function validateOptions(options) {
  const checks = [
    ['now', options.now instanceof Date && !Number.isNaN(options.now.getTime())],
    ['proposalKeepDays', Number.isFinite(options.proposalKeepDays) && options.proposalKeepDays >= 0],
    ['approvedKeepDays', Number.isFinite(options.approvedKeepDays) && options.approvedKeepDays >= 0],
    ['circuitBreakerKeepDays', Number.isFinite(options.circuitBreakerKeepDays) && options.circuitBreakerKeepDays >= 0],
  ];
  const failed = checks.find(([, ok]) => !ok);
  if (failed) {
    throw new Error(`Invalid ${failed[0]} option.`);
  }
}

function summarize(result) {
  const lines = [
    `runtime cleanup (${result.dryRun ? 'dry-run' : 'apply'}) for ${result.portfolio}`,
    `scanned=${result.totals.scanned} removed=${result.totals.removed} kept=${result.totals.kept}`,
  ];
  for (const group of result.results) {
    lines.push(`- ${group.category}: removed=${group.removed.length} kept=${group.kept.length}`);
  }
  return lines.join('\n');
}

(function main() {
  const options = parseArgs(process.argv.slice(2));
  validateOptions(options);
  const result = sweepRuntimeArtifacts(options);
  console.log(JSON.stringify({ ...result, summary: summarize(result) }, null, 2));
})();
