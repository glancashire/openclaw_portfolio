#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { buildSelfHealPlan } = require('../src/execution/portfolioHealth');

function parseArgs(argv) {
  const flags = { portfolio: 'etf', json: false };
  for (const arg of argv) {
    if (arg === '--json') flags.json = true;
    else if (arg.startsWith('--portfolio=')) flags.portfolio = arg.slice('--portfolio='.length);
    else if (arg === '--help' || arg === '-h') flags.help = true;
  }
  return flags;
}

function printHelp() {
  console.log('Usage: node scripts/trade-health.js [--portfolio=etf] [--json]');
  console.log('');
  console.log('Read-only unified portfolio health view: classifies symptoms,');
  console.log('summarizes trade-level health, and prints the self-heal plan');
  console.log('that WOULD run (no side effects, no observability writes).');
}

function severitySymbol(sev) {
  if (sev === 'high') return '!!';
  if (sev === 'medium') return '!';
  return '·';
}

function renderHuman(plan) {
  const lines = [];
  lines.push(`Portfolio: ${plan.portfolio}`);
  lines.push(`Health: ${plan.health.health} (severity: ${plan.health.severity})`);
  lines.push(`Next action: ${plan.health.nextAction}`);

  lines.push('');
  lines.push(`Open issues (${plan.openIssues.length}):`);
  if (plan.openIssues.length === 0) {
    lines.push('  (none)');
  } else {
    for (const issue of plan.openIssues) {
      lines.push(`  ${severitySymbol(issue.severity)} [${issue.severity}] ${issue.category} — ${issue.symptom || ''}`);
      if (issue.summary) lines.push(`       → ${issue.summary}`);
    }
  }

  lines.push('');
  lines.push('Trade-level:');
  for (const blocker of plan.health.blockers || []) {
    lines.push(`  - ${blocker.code}: ${blocker.message}`);
  }
  if (!plan.health.blockers || plan.health.blockers.length === 0) {
    lines.push('  - no blockers');
  }

  lines.push('');
  lines.push(`Self-heal plan (${plan.healed.length} recipe${plan.healed.length === 1 ? '' : 's'}):`);
  if (plan.healed.length === 0) {
    lines.push('  (no healable items classified)');
  } else {
    for (const heal of plan.healed) {
      const status = heal.applied ? 'applied' : `blocked: ${heal.blocked || 'unknown'}`;
      const budget = heal.budget && heal.budget.attempts != null
        ? ` [attempts:${heal.budget.attempts}${heal.budget.budget ? `/${heal.budget.budget}` : ''}]`
        : '';
      lines.push(`  - ${heal.kind} — ${status}${budget}`);
    }
  }

  lines.push('');
  lines.push(`Suggested operator commands (${plan.actions.length}):`);
  if (plan.actions.length === 0) {
    lines.push('  (none)');
  } else {
    for (const action of plan.actions) {
      if (action.kind === 'manual') {
        lines.push(`  - manual: ${action.reason}`);
      } else {
        lines.push(`  - ${action.command}`);
        lines.push(`      reason: ${action.reason}`);
      }
    }
  }

  const ladders = Array.isArray(plan.recoveryLadders) ? plan.recoveryLadders : [];
  if (plan.openIssues.length > 0 && ladders.length > 0) {
    lines.push('');
    lines.push(`Recovery guidance (${ladders.length} ladder${ladders.length === 1 ? '' : 's'}):`);
    for (const entry of ladders) {
      lines.push(`  ${entry.category}:`);
      for (const step of entry.ladder) {
        lines.push(`    ${step.rank}. ${step.description}`);
        if (step.command) {
          lines.push(`       $ ${step.command}`);
        } else {
          lines.push('       (manual step — no command)');
        }
      }
    }
  }

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

  const plan = await buildSelfHealPlan({ portfolioDir, repoRoot, now: new Date(), dryRun: true });

  if (flags.json) {
    console.log(JSON.stringify(plan, null, 2));
  } else {
    console.log(renderHuman(plan));
  }
  return plan.health.health === 'healthy' ? 0 : 2;
}

if (require.main === module) {
  main().then((code) => { process.exit(code); }).catch((error) => {
    console.error(error.stack || String(error));
    process.exit(1);
  });
}

module.exports = { main, parseArgs, renderHuman };
