#!/usr/bin/env node
'use strict';

/*
 * scripts/analyze-rebalance.js
 *
 * Read-only rebalance analysis. Reads portfolio.md (for targets) and
 * holdings.md (for current state), computes three rebalance scenarios,
 * writes both markdown and JSON into runtime/rebalance/<portfolio>/.
 *
 * Usage:
 *   node scripts/analyze-rebalance.js [--portfolio=etf] [--json]
 *                                     [--fx-eur=0.96] [--fx-usd=0.88]
 *                                     [--min-trade=500]
 *
 * Does NOT touch the broker. Does NOT modify portfolio/. Does NOT send email.
 */

const fs = require('fs');
const path = require('path');
const { computeRebalancePlan } = require('../lib/rebalanceAnalyzer');
const { parseAllocationTargets, parseHoldings, applyAliases } = require('../lib/portfolioMarkdown');

const args = parseArgs(process.argv.slice(2));
const PORTFOLIO = args.portfolio || 'etf';
const JSON_ONLY = !!args.json;
const FX = {
  EUR: Number(args['fx-eur'] || 0.96),
  USD: Number(args['fx-usd'] || 0.88),
  GBP: Number(args['fx-gbp'] || 1.15),
};
const MIN_TRADE = Number(args['min-trade'] || 500);

const ROOT = path.resolve(__dirname, '..');
const portfolioPath = path.join(ROOT, 'portfolio', PORTFOLIO, 'portfolio.md');
const holdingsPath  = path.join(ROOT, 'portfolio', PORTFOLIO, 'holdings.md');

const targets = parseAllocationTargets(fs.readFileSync(portfolioPath, 'utf8'));
const { holdings: rawHoldings, cashChf, totalValueChf, lastSync } = parseHoldings(fs.readFileSync(holdingsPath, 'utf8'));
const holdings = applyAliases(rawHoldings, targets._aliases);

const plan = computeRebalancePlan({
  holdings,
  targets,
  cashChf,
  minTradeChf: MIN_TRADE,
  fxRates: FX,
});

const stamp = new Date().toISOString().slice(0, 10);
const outDir = path.join(ROOT, 'runtime', 'rebalance', PORTFOLIO);
fs.mkdirSync(outDir, { recursive: true });
const outJson = path.join(outDir, `rebalance-${stamp}.json`);
const outMd   = path.join(outDir, `rebalance-${stamp}.md`);

const payload = {
  generatedAt: new Date().toISOString(),
  portfolio: PORTFOLIO,
  source: { portfolioPath, holdingsPath, lastSync },
  fxRates: FX,
  minTradeChf: MIN_TRADE,
  plan,
};
fs.writeFileSync(outJson, JSON.stringify(payload, null, 2));
fs.writeFileSync(outMd, renderMarkdown(payload));

if (JSON_ONLY) {
  console.log(JSON.stringify(payload, null, 2));
} else {
  console.log(renderMarkdown(payload));
  console.log('---');
  console.log(`Wrote ${outMd}`);
  console.log(`Wrote ${outJson}`);
}

// ---------- helpers ----------

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq > -1) out[a.slice(2, eq)] = a.slice(eq + 1);
      else out[a.slice(2)] = true;
    }
  }
  return out;
}

function renderMarkdown(payload) {
  const { plan, generatedAt, portfolio, source, fxRates, minTradeChf } = payload;
  const lines = [];
  lines.push(`# Rebalance analysis — ${portfolio} — ${generatedAt.slice(0, 10)}`);
  lines.push('');
  lines.push(`*Generated: ${generatedAt}*`);
  lines.push(`*Holdings as of: ${source.lastSync || 'unknown'}*`);
  lines.push(`*FX rates: EUR=${fxRates.EUR}, USD=${fxRates.USD}, GBP=${fxRates.GBP}*`);
  lines.push(`*Min trade size: CHF ${minTradeChf}*`);
  lines.push('');

  lines.push('## Totals');
  lines.push(`- NetLiq: CHF ${plan.totals.netLiqChf}`);
  lines.push(`- Invested: CHF ${plan.totals.investedChf}`);
  lines.push(`- Cash: CHF ${plan.totals.cashChf}`);
  lines.push('');

  if (plan.warnings.length) {
    lines.push('## Warnings');
    for (const w of plan.warnings) lines.push(`- **${w.code}**${w.symbol ? ` (${w.symbol})` : ''}: ${w.message}`);
    lines.push('');
  }

  lines.push('## Drift by leg');
  lines.push('');
  lines.push('| Symbol | Value CHF | Actual % | Target % | Drift pp | Gap CHF | Status |');
  lines.push('|---|---:|---:|---:|---:|---:|---|');
  for (const l of plan.legs) {
    const driftSign = l.driftPct > 0 ? `+${l.driftPct}` : `${l.driftPct}`;
    const gapSign = l.gapChf > 0 ? `+${l.gapChf}` : `${l.gapChf}`;
    lines.push(`| ${l.symbol} | ${l.valueChf} | ${l.actualPct}% | ${l.targetPct}% | ${driftSign} | ${gapSign} | ${l.status} |`);
  }
  lines.push('');

  for (const key of ['no_sell', 'sell_overshoot', 'full_to_target']) {
    const s = plan.scenarios[key];
    lines.push(`## Scenario — ${s.label}`);
    lines.push('');
    lines.push(`- **Cash needed (additional deposit):** CHF ${s.cashNeededChf}`);
    if (typeof s.cashAvailableForDeploy === 'number') {
      lines.push(`- Cash available for deploy (after sells, above target floor): CHF ${s.cashAvailableForDeploy}`);
    }
    lines.push(`- Sells: CHF ${s.sellsChf}`);
    lines.push(`- Buys: CHF ${s.buysChf}`);
    lines.push(`- Leftover |drift| after actions: ${s.leftoverDriftPp} pp`);
    lines.push('');
    if (s.actions.length === 0) {
      lines.push('_No actions required (portfolio already on target within min-trade-size)._');
    } else {
      lines.push('| Symbol | Action | Amount CHF | Note |');
      lines.push('|---|---|---:|---|');
      for (const a of s.actions) {
        const note = a.reason || a.note || '';
        lines.push(`| ${a.symbol} | ${a.action} | ${a.amountChf} | ${note} |`);
      }
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('*Read-only analysis. No orders placed. No portfolio state modified.*');
  return lines.join('\n');
}
