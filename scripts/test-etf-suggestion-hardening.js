const fs = require('fs');
const os = require('os');
const path = require('path');
const { suggestEtfShortlist, buildApprovedInstrumentRows, formatShortlistMarkdown } = require('../src/analysis/etfShortlistEngine');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function makePortfolio() {
  return `# Portfolio: demo\n\n## Investor Profile\n- Currency preference: CHF-first\n- ESG preference: none\n\n## Allocation Targets\n| Asset class | Target % | Min % | Max % | Notes |\n|---|---:|---:|---:|---|\n| Global equities | 60 | 50 | 70 | |\n| Swiss equities | 20 | 10 | 30 | |\n| Bonds / cash-like | 20 | 10 | 30 | |\n\n## Approved Instruments\n| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |\n|---|---|---|---:|---:|---:|---|---|---|\n| CH0032912732 | UBS SLI ETF (SMI gleichgewichtet) | Swiss equities | 20 | 10 | 30 | SIX | CHF | ibkr_symbol=UBSSLI |\n\n## Excluded Instruments\n| Ticker / ISIN | Reason |\n|---|---|\n| IE00B5BMR087 | avoid this line |\n\n## Notes / Open Questions\n- ETF issuer preferences: prefer UBS and iShares; exclude Invesco.\n`;
}

function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'etf-suggestion-hardening-'));
  const portfolioPath = path.join(dir, 'portfolio.md');
  fs.writeFileSync(portfolioPath, makePortfolio());

  const result = suggestEtfShortlist(portfolioPath);
  assert(result.suggestions.every((item) => item.tickerOrIsin !== 'IE00B5BMR087'), 'Expected excluded instrument to be filtered from suggestions');
  assert(result.rejections.some((item) => item.tickerOrIsin === 'IE00B5BMR087' && item.rejectedReasons.some((reason) => /Excluded Instruments/i.test(reason))), 'Expected excluded instrument rejection reason');

  const swiss = result.suggestions.find((item) => item.assetClass === 'Swiss equities');
  assert(swiss && swiss.approved === true, 'Expected already-approved Swiss instrument to remain surfaced');
  assert(/matches UBS issuer preference/i.test(swiss.reason), 'Expected issuer preference rationale');

  const rows = buildApprovedInstrumentRows(result, { topPerAssetClass: 1 });
  const swissRow = rows.find((row) => row[2] === 'Swiss equities');
  assert(swissRow && swissRow[3] === '20', 'Expected Swiss approved row to preserve shortlisted target split');

  const markdown = formatShortlistMarkdown(result);
  assert(/Excluded candidates filtered: 1/.test(markdown), 'Expected shortlist markdown exclusion summary');
  assert(/## Rejected candidates/.test(markdown), 'Expected rejected candidates section');

  console.log(JSON.stringify({ ok: true, result, rows }, null, 2));
}

main();
