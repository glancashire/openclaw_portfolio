#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { buildSelfHealPlan } = require('../src/execution/portfolioHealth');

function parseArgs(argv) {
  const flags = { portfolio: 'etf', json: false, apply: false };
  for (const arg of argv) {
    if (arg === '--json') flags.json = true;
    else if (arg === '--apply') flags.apply = true;
    else if (arg === '--dry-run') flags.apply = false;
    else if (arg.startsWith('--portfolio=')) flags.portfolio = arg.slice('--portfolio='.length);
    else if (arg === '--help' || arg === '-h') flags.help = true;
  }
  return flags;
}

function printHelp() {
  console.log('Usage: node scripts/trade-self-heal.js [--portfolio=etf] [--apply] [--json]');
  console.log('');
  console.log('Run the self-heal pipeline. Default: --dry-run (no observability writes).');
  console.log('--apply attempts each healable recipe; recipes that are still gated by');
  console.log('operator-presence or external integration remain blocked but their');
  console.log('attempts are recorded so retry budgets and cooldowns engage.');
}

function renderHuman(plan, { apply }) {
  const lines = [];
  lines.push(`Portfolio: ${plan.portfolio}`);
  lines.push(`Mode: ${apply ? 'APPLY' : 'dry-run'}`);
  lines.push(`Health: ${plan.health.health} (severity: ${plan.health.severity})`);
  lines.push('');
  lines.push(`Recipes (${plan.healed.length}):`);
  if (plan.healed.length === 0) {
    lines.push('  (no healable items)');
  }
  for (const heal of plan.healed) {
    const status = heal.applied
      ? 'applied'
      : `blocked: ${heal.blocked || 'unknown'}`;
    const budgetInfo = heal.budget && heal.budget.attempts != null
      ? ` [attempts:${heal.budget.attempts}${heal.budget.budget ? `/${heal.budget.budget}` : ''}${heal.budget.cooldownMinutes ? `, cooldown:${heal.budget.cooldownMinutes}m` : ''}]`
      : '';
    lines.push(`  - ${heal.kind} — ${status}${budgetInfo}`);
    if (heal.summary) lines.push(`      ${heal.summary}`);
  }
  lines.push('');
  lines.push(`Open issues remaining: ${plan.openIssues.length}`);
  return lines.join('\n');
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) {
    printHelp();
    return 0;
  }

  const repoRoot = process.cwd();
  const portfolioDir = path.resolve(repoRoot, 'portfolio', flags.portfolio);
  if (!fs.existsSync(portfolioDir)) {
    const errMsg = `Portfolio directory not found: ${portfolioDir}`;
    if (flags.json) {
      console.log(JSON.stringify({ ok: false, error: 'portfolio_not_found', portfolioDir }, null, 2));
    } else {
      console.error(errMsg);
    }
    return 2;
  }

  const plan = await buildSelfHealPlan({
    portfolioDir,
    repoRoot,
    now: new Date(),
    dryRun: !flags.apply,
  });

  if (flags.json) {
    console.log(JSON.stringify({ ...plan, applyMode: !!flags.apply }, null, 2));
  } else {
    console.log(renderHuman(plan, { apply: !!flags.apply }));
  }

  const anyError = (plan.healed || []).some((heal) => heal.ok === false);
  return anyError ? 2 : 0;
}

if (require.main === module) {
  main().then((code) => { process.exit(code); }).catch((error) => {
    console.error(error.stack || String(error));
    process.exit(1);
  });
}

module.exports = { main, parseArgs, renderHuman };
