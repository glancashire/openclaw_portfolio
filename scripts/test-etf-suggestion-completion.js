const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  suggestEtfShortlist,
  buildApprovedInstrumentRows,
  formatShortlistMarkdown,
  replaceApprovedInstrumentsSection,
} = require('../src/analysis/etfShortlistEngine');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function makePortfolio() {
  return `# Portfolio: demo

## Investor Profile
- Currency preference: CHF-first
- ESG preference: none

## Allocation Targets
| Asset class | Target % | Min % | Max % | Notes |
|---|---:|---:|---:|---|
| Global equities | 60 | 50 | 70 | |
| Swiss equities | 20 | 10 | 30 | |
| Bonds / cash-like | 20 | 10 | 30 | |

## Geographic Targets
| Region | Target % | Min % | Max % |
|---|---:|---:|---:|
| Switzerland | 20 | 10 | 30 |
| Developed World ex-CH | 60 | 50 | 70 |
| Bonds / cash-like CHF | 20 | 10 | 30 |

## Approved Instruments
| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |
|---|---|---|---:|---:|---:|---|---|---|
| CH0032912732 | UBS SLI ETF (SMI gleichgewichtet) | Swiss equities | 20 | 10 | 30 | SIX | CHF | ibkr_symbol=UBSSLI |
| CASH-CHF | CHF cash balance | Bonds / cash-like | 20 | 10 | 30 | IBKR cash balance | CHF | |

## Excluded Instruments
| Ticker / ISIN | Reason |
|---|---|
| IE00B5BMR087 | avoid this line |

## Notes / Open Questions
- ETF issuer preferences: prefer UBS and iShares; exclude Invesco.
- Distribution preference: accumulating preferred
- Domicile preference: Switzerland or Ireland preferred
- Exchange preference: SIX, Xetra, or LSE
- Minimum fund size: medium
`;
}

function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'etf-suggestion-completion-'));
  const portfolioPath = path.join(dir, 'portfolio.md');
  fs.writeFileSync(portfolioPath, makePortfolio());

  const result = suggestEtfShortlist(portfolioPath);
  assert(result.suggestions.every((item) => item.tickerOrIsin !== 'IE00B5BMR087'), 'Expected excluded instrument to be filtered from suggestions');
  assert(result.rejections.some((item) => item.tickerOrIsin === 'LU0000000001' && item.rejectedReasons.some((reason) => /preferred venues|fund size below preference|broker-available|spread quality too wide/i.test(reason))), 'Expected weak candidate to be rejected by the new filter set');

  const globalAccepted = result.suggestions.filter((item) => item.assetClass === 'Global equities');
  assert(globalAccepted.length >= 1, 'Expected at least one accepted global-equity suggestion');
  assert(globalAccepted.every((item) => /preferred exchange|minimum fund size|broker-available|spread/i.test(item.reason)), 'Expected global suggestions to explain new filter/score dimensions');

  const unapprovedRows = buildApprovedInstrumentRows(result, { topPerAssetClass: 2 });
  assert(unapprovedRows.every((row) => row[0] !== 'LU0950668870'), 'Expected unapproved shortlist rows to stay out of approved instrument rows by default');

  const approvedRows = buildApprovedInstrumentRows(result, { topPerAssetClass: 2, requireApproval: false });
  assert(approvedRows.some((row) => row[2] === 'Global equities' && row[0] !== 'CH0032912732'), 'Expected optional non-default row generation to include an unapproved shortlist candidate when approval gate is disabled');

  let blocked = null;
  try {
    replaceApprovedInstrumentsSection(makePortfolio(), approvedRows, { approvalEvidence: ['CH0032912732', 'CASH-CHF'] });
  } catch (error) {
    blocked = error;
  }
  assert(blocked && /Cannot apply unapproved shortlist rows/i.test(blocked.message), 'Expected approval gate to block applying unapproved shortlist rows');

  const safeRows = buildApprovedInstrumentRows(result, { topPerAssetClass: 1 });
  const updated = replaceApprovedInstrumentsSection(makePortfolio(), safeRows, { approvalEvidence: safeRows.map((row) => row[0]) });
  assert(/CH0032912732/.test(updated) && /CASH-CHF/.test(updated), 'Expected approved shortlist rows to apply cleanly');

  const markdown = formatShortlistMarkdown(result);
  assert(/Distribution preference: accumulating preferred/.test(markdown), 'Expected shortlist markdown to surface distribution preference');
  assert(/approval required/.test(markdown), 'Expected shortlist markdown to surface approval state');

  console.log(JSON.stringify({ ok: true, result, safeRows }, null, 2));
}

main();
