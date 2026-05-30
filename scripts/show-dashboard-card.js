'use strict';

const fs = require('fs');
const path = require('path');

function fmtChf(value) {
  return new Intl.NumberFormat('en-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0));
}

function fmtPct(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  const n = Number(value);
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function main() {
  const portfolio = process.argv[2] || 'etf';
  const summaryPath = path.join(process.cwd(), 'portfolio', portfolio, 'summary.json');
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  const pl = summary.profitLoss || {};
  const totals = pl.totals || {};
  const rows = Array.isArray(pl.rows) ? pl.rows.slice() : [];
  rows.sort((a, b) => Number(b.valueChf || 0) - Number(a.valueChf || 0));
  const topLoss = rows.slice().sort((a, b) => Number(a.unrealizedProfitChf || 0) - Number(b.unrealizedProfitChf || 0)).slice(0, 3);

  const lines = [];
  lines.push(`## ETF Dashboard Card`);
  lines.push(`| Metric | Value |`);
  lines.push(`|---|---:|`);
  lines.push(`| Total value | CHF ${fmtChf(summary.holdings?.totalValueChf || 0)} |`);
  lines.push(`| Cash | CHF ${fmtChf(summary.holdings?.cashChf || 0)} |`);
  lines.push(`| Invested | CHF ${fmtChf(summary.holdings?.investedChf || 0)} |`);
  const accountProfit = Number(summary.holdings?.accountProfitChf || 0);
  if (summary.holdings?.depositedCapitalChf != null) {
    lines.push(`| Account P/L vs deposited capital | ${accountProfit >= 0 ? '+' : '-'}CHF ${fmtChf(Math.abs(accountProfit))} (${fmtPct(summary.holdings?.accountProfitPct)}) |`);
  }
  const totalProfit = Number(totals.totalProfitChf || 0);
  lines.push(`| Holdings unrealized P/L | ${totalProfit >= 0 ? '+' : '-'}CHF ${fmtChf(Math.abs(totalProfit))} (${fmtPct(totals.totalProfitPct)}) |`);
  lines.push(`| Cost-basis coverage | ${totals.coveredCount || 0}/${totals.totalCount || rows.length} holdings |`);
  lines.push(`| Broker posture | ${summary.status?.brokerHealth || 'unknown'} / ${summary.status?.executionPosture || 'unknown'} |`);
  lines.push('');
  lines.push(`### Instruments`);
  lines.push(`| Instrument | Value CHF | P/L CHF | P/L % | Quote source | Quote quality |`);
  lines.push(`|---|---:|---:|---:|---|---|`);
  for (const row of rows) {
    const pnl = Number(row.unrealizedProfitChf || 0);
    lines.push(`| ${row.name || row.tickerOrIsin} | ${fmtChf(row.valueChf || 0)} | ${pnl >= 0 ? '+' : '-'}${fmtChf(Math.abs(pnl))} | ${fmtPct(row.unrealizedProfitPct)} | ${row.quoteSource || '—'} | ${row.quoteQuality || '—'} |`);
  }
  lines.push('');
  lines.push('### Main contributors to current unrealized loss');
  lines.push(`| Instrument | P/L CHF | Explanation |`);
  lines.push(`|---|---:|---|`);
  for (const row of topLoss) {
    const pnl = Number(row.unrealizedProfitChf || 0);
    lines.push(`| ${row.name || row.tickerOrIsin} | ${pnl >= 0 ? '+' : '-'}${fmtChf(Math.abs(pnl))} | Current valuation is below recorded cost basis for the current held quantity. |`);
  }
  console.log(lines.join('\n'));
}

main();
