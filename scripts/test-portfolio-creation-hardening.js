const fs = require('fs');
const os = require('os');
const path = require('path');
const { applyAnswersToPortfolio } = require('../src/workflows/applyPortfolioAnswers');
const { activationReadiness, nextQuestions } = require('../src/workflows/portfolioDraftState');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function writeFile(p, text) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
}

function makeDraftPortfolio() {
  return `# Portfolio: Demo\n\n## Status\n- Status: draft\n- Created: 2026-05-01\n- Last reviewed: 2026-05-01\n- Base currency: <currency>\n- Broker: interactive-brokers\n- Broker account reference: <account>\n\n## Strategy Summary\nETF portfolio draft awaiting investor profile, approved ETF universe, and broker-account details.\n\n## Investor Profile\n- Risk level: <risk>\n- Investment horizon: <years>\n- Maximum acceptable drawdown: <drawdown>\n- ESG preference: <esg>\n\n## Allocation Targets\n| Asset class | Target % | Min % | Max % | Notes |\n|---|---:|---:|---:|---|\n| Global equities | 60 | 50 | 70 | |\n\n## Geographic Targets\n| Region | Target % | Min % | Max % |\n|---|---:|---:|---:|\n| Switzerland | 20 | 10 | 30 |\n\n## Industry / Sector Constraints\n| Sector | Min % | Max % | Notes |\n|---|---:|---:|---|\n| Technology | 0 | 30 | |\n\n## Approved Instruments\n| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |\n|---|---|---|---:|---:|---:|---|---|---|\n| AAA | ETF A | Global equities | 60 | 50 | 70 | SIX | CHF | |\n\n## Excluded Instruments\n| Ticker / ISIN | Reason |\n|---|---|\n| none | none |\n\n## Rebalancing Policy\n- Rebalance threshold: absolute drift > 5 percentage points or relative drift > 20%\n\n## Market Entry Policy\n- Initial deployment mode: staged\n\n## Automation Permissions\n- Generate trade proposals automatically: yes\n\n## Notes / Open Questions\n- ETF issuer preferences: prefer UBS and iShares\n- Already-held instruments note: none\n- Confirm broker account alias/reference.\n- Confirm investment horizon and maximum acceptable drawdown.\n- Confirm initial capital and expected portfolio size.\n- Confirm any excluded or already-held instruments.\n`;
}

function makeSupportFile(title) {
  return `# ${title}\n`;
}

function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-creation-hardening-'));
  const portfolioPath = path.join(dir, 'portfolio.md');
  writeFile(portfolioPath, makeDraftPortfolio());
  writeFile(path.join(dir, 'holdings.md'), makeSupportFile('Holdings'));
  writeFile(path.join(dir, 'trades.md'), makeSupportFile('Trades'));
  writeFile(path.join(dir, 'history.md'), makeSupportFile('History'));
  writeFile(path.join(dir, 'dashboard.md'), makeSupportFile('Dashboard'));

  let readiness = activationReadiness(dir);
  assert(readiness.ready === false, 'Expected initial draft to be blocked');
  assert(readiness.pendingQuestionKeys.length > 0, 'Expected pending draft questions');

  applyAnswersToPortfolio(portfolioPath, {
    brokerAccountReference: 'demo-account',
    baseCurrency: 'CHF',
    investmentHorizon: '10',
    riskLevel: 'medium',
    maximumAcceptableDrawdown: '30%',
    esgPreference: 'none',
    initialCapital: '5000',
    excludedInstruments: 'none',
    alreadyHeldInstruments: 'none',
  });

  readiness = activationReadiness(dir);
  assert(readiness.ready === true, 'Expected answered draft with full files to be ready');
  assert(nextQuestions(portfolioPath).length === 0, 'Expected no remaining draft questions');

  fs.unlinkSync(path.join(dir, 'dashboard.md'));
  const missingFile = activationReadiness(dir);
  assert(missingFile.ready === false, 'Expected missing generated file to block readiness');
  assert(missingFile.missingFiles.includes('dashboard.md'), 'Expected dashboard.md missing-file blocker');

  writeFile(path.join(dir, 'dashboard.md'), makeSupportFile('Dashboard'));
  writeFile(portfolioPath, makeDraftPortfolio());
  const placeholderBlocked = activationReadiness(dir);
  assert(placeholderBlocked.ready === false, 'Expected placeholders to block readiness');
  assert(placeholderBlocked.unresolvedPlaceholders.length > 0, 'Expected placeholder lines to be reported');

  console.log(JSON.stringify({
    ok: true,
    readyAfterAnswers: readiness,
    missingFile,
    placeholderBlocked,
  }, null, 2));
}

main();
