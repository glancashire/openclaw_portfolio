const fs = require('fs');
const path = require('path');

function formatReport({ portfolioName, period, start = '', end = '', generated = '', trades = [] }) {
  const tradeRows = trades.length
    ? trades.map((t) => `| ${t.date} | ${t.action} | ${t.instrument} | ${t.amount} | ${t.reason} |`).join('\n')
    : '| YYYY-MM-DD | <action> | <instrument> | 0 | No trades recorded |';

  return `# Portfolio Report: ${portfolioName}\n\n## Period\n- Report type: ${period}\n- Period start: ${start}\n- Period end: ${end}\n- Generated: ${generated}\n\n## Executive Summary\nShort summary pending performance and allocation engine implementation.\n\n## Performance\n| Metric | Value |\n|---|---:|\n| Start value CHF | |\n| End value CHF | |\n| Change CHF | |\n| Change % | |\n\n## Allocation Review\n| Asset class | Start % | End % | Target % | Drift % |\n|---|---:|---:|---:|---:|\n\n## Trades During Period\n| Date | Action | Instrument | Amount CHF | Reason |\n|---|---|---|---:|---|\n${tradeRows}\n\n## Strategy Compliance\n- On strategy: yes/no\n- Rebalance needed: yes/no\n- Risk limits breached: yes/no\n\n## What Worked\n- <point>\n\n## What Did Not Work\n- <point>\n\n## Recommended Changes\n- <recommendation>\n\n## Next Actions\n- <action>\n`;
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

module.exports = { formatReport, writeReport };
