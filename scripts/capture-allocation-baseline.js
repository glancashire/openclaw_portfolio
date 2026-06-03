#!/usr/bin/env node
'use strict';

/**
 * capture-allocation-baseline.js
 *
 * Reads portfolio/etf/portfolio.md (Approved Instruments) and
 * portfolio/etf/holdings.md (Current Holdings) to emit a frozen
 * JSON baseline for the 6 instruments involved in the Mag-7
 * deconcentration thesis (4 new + 2 legacy overlap).
 *
 * Output: runtime/research/h1-baseline-YYYY-MM-DD.json
 *
 * Phase H1 — allocation-target decision support.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORTFOLIO_DIR = path.join(ROOT, 'portfolio', 'etf');
const OUTPUT_DIR = path.join(ROOT, 'runtime', 'research');

// The 6 instruments we track (IBKR conids as used in holdings.md Ticker column):
const TRACKED = [
  { conid: '75776072', ibkrSymbol: 'SXR8', isin: 'IE00B5BMR087', role: 'legacy_mega_cap', thesis: 'Original broad S&P 500 slot' },
  { conid: '243939970', ibkrSymbol: 'EMUAA', isin: 'LU0950668870', role: 'legacy_mega_cap', thesis: 'Original EMU broad slot (mega-cap heavy)' },
  { conid: '163606923', ibkrSymbol: 'XDEW', isin: 'IE00BLNMYC90', role: 'deconcentration_new', thesis: 'S&P 500 Equal Weight — dilutes Mag-7 overweight' },
  { conid: '732138353', ibkrSymbol: 'MWEQ', isin: 'IE000OEF25S1', role: 'deconcentration_new', thesis: 'MSCI World Equal Weight — global breadth' },
  { conid: '134428813', ibkrSymbol: 'IS3H', isin: 'IE00BCLWRD08', role: 'deconcentration_new', thesis: 'EMU Mid Cap — avoids EMU mega-cap tilt' },
  { conid: '53524044', ibkrSymbol: 'DXS0', isin: 'LU0322248146', role: 'deconcentration_new', thesis: 'SLI capped — limits Nestle/Roche/Novartis/UBS dominance' },
];

function parseHoldings() {
  const holdingsPath = path.join(PORTFOLIO_DIR, 'holdings.md');
  const raw = fs.readFileSync(holdingsPath, 'utf8');
  const rows = [];
  for (const line of raw.split('\n')) {
    if (!line.startsWith('|') || line.includes('---|')) continue;
    const cells = line.split('|').map(c => c.trim()).filter(Boolean);
    if (cells[0] === 'Ticker / ISIN' || cells[0] === 'Scope') continue;
    rows.push({
      ticker: cells[0],
      name: cells[1],
      assetClass: cells[2],
      quantity: parseFloat(cells[3]) || 0,
      price: parseFloat(cells[4]) || 0,
      currency: cells[5],
      fxToChf: parseFloat(cells[6]) || 1,
      valueChf: parseFloat(cells[7]) || 0,
      allocationPct: parseFloat(cells[8]) || 0,
      targetPct: parseFloat(cells[9]) || 0,
      driftPct: parseFloat(cells[10]) || 0,
    });
  }
  return rows;
}

function parseTotalValue() {
  const holdingsPath = path.join(PORTFOLIO_DIR, 'holdings.md');
  const raw = fs.readFileSync(holdingsPath, 'utf8');
  const match = raw.match(/Total value CHF:\s*([\d.]+)/);
  return match ? parseFloat(match[1]) : 0;
}

function parseTargets() {
  const portfolioPath = path.join(PORTFOLIO_DIR, 'portfolio.md');
  const raw = fs.readFileSync(portfolioPath, 'utf8');
  const targets = {};
  for (const line of raw.split('\n')) {
    if (!line.startsWith('|')) continue;
    for (const tracked of TRACKED) {
      if (line.includes(tracked.isin)) {
        const cells = line.split('|').map(c => c.trim()).filter(Boolean);
        // Column order: ISIN | Name | Class | Target% | Min% | Max% | ...
        targets[tracked.isin] = {
          targetPct: parseFloat(cells[3]) || 0,
          minPct: parseFloat(cells[4]) || 0,
          maxPct: parseFloat(cells[5]) || 0,
          name: cells[1],
        };
      }
    }
  }
  return targets;
}

function main() {
  const holdingsRows = parseHoldings();
  const totalValueChf = parseTotalValue();
  const targets = parseTargets();

  const baseline = [];
  for (const tracked of TRACKED) {
    const holding = holdingsRows.find(r => r.ticker === tracked.conid);
    const target = targets[tracked.isin] || {};

    const valueChf = holding ? holding.valueChf : 0;
    const currentPct = totalValueChf > 0 ? +(valueChf / totalValueChf * 100).toFixed(2) : 0;
    const targetPct = target.targetPct || 0;
    const driftPct = +(currentPct - targetPct).toFixed(2);

    baseline.push({
      isin: tracked.isin,
      ibkrSymbol: tracked.ibkrSymbol,
      conid: tracked.conid,
      name: target.name || (holding && holding.name) || tracked.ibkrSymbol,
      role: tracked.role,
      thesis: tracked.thesis,
      quantity: holding ? holding.quantity : 0,
      price: holding ? holding.price : 0,
      currency: holding ? holding.currency : '?',
      fxToChf: holding ? holding.fxToChf : 1,
      valueChf: +valueChf.toFixed(2),
      totalPortfolioValueChf: +totalValueChf.toFixed(2),
      currentAllocationPct: currentPct,
      targetPct,
      minPct: target.minPct || 0,
      maxPct: target.maxPct || 0,
      driftPct,
    });
  }

  const output = {
    schema: 'h1-allocation-baseline.v1',
    capturedAt: new Date().toISOString(),
    portfolioName: 'etf',
    totalPortfolioValueChf: +totalValueChf.toFixed(2),
    reviewDate: '2026-06-17',
    decisionOptions: [
      'A: Additive — keep SXR8+EMUAA at current targets, layer new ETFs alongside',
      'B: Replace — phase out SXR8+EMUAA (sell down), shift allocation to new ETFs',
      'C: Partial — reduce SXR8+EMUAA targets, raise new ETF targets proportionally',
    ],
    instruments: baseline,
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const dateStamp = new Date().toISOString().slice(0, 10);
  const outPath = path.join(OUTPUT_DIR, `h1-baseline-${dateStamp}.json`);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n');
  console.log(`Baseline written to ${outPath}`);
  console.log(`Instruments: ${baseline.length}`);
  console.log(`Total portfolio value: CHF ${totalValueChf.toFixed(2)}`);
  for (const b of baseline) {
    console.log(`  ${b.ibkrSymbol} (${b.role}): ${b.currentAllocationPct}% current / ${b.targetPct}% target / drift ${b.driftPct > 0 ? '+' : ''}${b.driftPct}%`);
  }
  return output;
}

module.exports = { main, TRACKED };
if (require.main === module) main();
