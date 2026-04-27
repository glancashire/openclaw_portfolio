const fs = require('fs');
const path = require('path');
const { recentTrades, latestHistory } = require('./portfolioData');

function formatReport({ portfolioName, period, start = '', end = '', generated = '', trades = [], latestSnapshot = null }) {
  const tradeRows = trades.length
    ? trades.map((t) => `| ${t.date} | ${t.action} | ${t.instrument} | ${t.amount} | ${t.reason} |`).join('\n')
    : '| YYYY-MM-DD | <action> | <instrument> | 0 | No trades recorded |';

  return `# Portfolio Report: ${portfolioName}\n\n## Period\n- Report type: ${period}\n- Period start: ${start}\n- Period end: ${end}\n- Generated: ${generated}\n\n## Executive Summary\n${latestSnapshot ? `Latest snapshot: CHF ${latestSnapshot.totalValue} total, CHF ${latestSnapshot.cash} cash.` : 'Short summary pending performance and allocation engine implementation.'}\n\n## Performance\n| Metric | Value |\n|---|---:|\n| Start value CHF | |\n| End value CHF | ${latestSnapshot ? latestSnapshot.totalValue : ''} |\n| Change CHF | ${latestSnapshot ? latestSnapshot.dailyChange : ''} |\n| Change % | ${latestSnapshot ? latestSnapshot.dailyChangePct : ''} |\n\n## Allocation Review\n| Asset class | Start % | End % | Target % | Drift % |\n|---|---:|---:|---:|---:|\n\n## Trades During Period\n| Date | Action | Instrument | Amount CHF | Reason |\n|---|---|---|---:|---|\n${tradeRows}\n\n## Strategy Compliance\n- On strategy: yes/no\n- Rebalance needed: yes/no\n- Risk limits breached: yes/no\n\n## What Worked\n- <point>\n\n## What Did Not Work\n- <point>\n\n## Recommended Changes\n- <recommendation>\n\n## Next Actions\n- <action>\n`;
}

function writeReport({ portfolioDir, period, dateStamp, content }) {
  const portfolioName = path.basename(portfolioDir);
  const outDir = path.join(portfolioDir, 'reports', period);
  fs.mkdirSync(outDir, { recursive: true });
  const fileName = `portfolio_report_${portfolioName}_${period}_${dateStamp}.md`;
  const outPath = path.join(outDir, fileName);
  fs.writeFileSync(outPath, content);
  return outPath;
}

function generateAndWriteReport({ portfolioDir, period, dateStamp }) {
  const trades = recentTrades(path.join(portfolioDir, 'trades.md'));
  const latestSnapshot = latestHistory(path.join(portfolioDir, 'history.md'));
  const portfolioName = path.basename(portfolioDir);
  const content = formatReport({
    portfolioName,
    period,
    generated: new Date().toISOString(),
    trades,
    latestSnapshot,
  });
  return writeReport({ portfolioDir, period, dateStamp, content });
}

module.exports = { formatReport, writeReport, generateAndWriteReport };
