const fs = require('fs');
const os = require('os');
const path = require('path');
const { applyAnswersToPortfolio } = require('../src/workflows/applyPortfolioAnswers');
const { guidedQuestions, activationReadiness, nextQuestions } = require('../src/workflows/portfolioDraftState');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function writeFile(p, text) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
}

function makeDraftPortfolio() {
  return `# Portfolio: Demo

## Status
- Status: draft
- Created: 2026-05-01
- Last reviewed: 2026-05-01
- Base currency: <currency>
- Broker: interactive-brokers
- Broker account reference: <account>

## Strategy Summary
ETF portfolio draft awaiting investor profile, approved ETF universe, and broker-account details.

## Investor Profile
- Risk level: <risk>
- Investment horizon: <years>
- Maximum acceptable drawdown: <drawdown>
- ESG preference: <esg>

## Allocation Targets
| Asset class | Target % | Min % | Max % | Notes |
|---|---:|---:|---:|---|
| Global equities | 60 | 50 | 70 | |

## Geographic Targets
| Region | Target % | Min % | Max % |
|---|---:|---:|---:|
| Switzerland | 20 | 10 | 30 |

## Industry / Sector Constraints
| Sector | Min % | Max % | Notes |
|---|---:|---:|---|
| Technology | 0 | 30 | |

## Approved Instruments
| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |
|---|---|---|---:|---:|---:|---|---|---|
| AAA | ETF A | Global equities | 60 | 50 | 70 | SIX | CHF | |

## Excluded Instruments
| Ticker / ISIN | Reason |
|---|---|
| none | none |

## Rebalancing Policy
- Rebalance threshold: absolute drift > 5 percentage points or relative drift > 20%

## Market Entry Policy
- Initial deployment mode: staged

## Automation Permissions
- Generate trade proposals automatically: yes

## Notes / Open Questions
- ETF issuer preferences: prefer UBS and iShares
- Already-held instruments note: none
- Confirm broker account alias/reference.
- Confirm investment horizon and maximum acceptable drawdown.
- Confirm initial capital and expected portfolio size.
- Confirm any excluded or already-held instruments.
`;
}

function makeSupportFile(title) {
  return `# ${title}\n`;
}

function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-guided-intake-'));
  const portfolioPath = path.join(dir, 'portfolio.md');
  writeFile(portfolioPath, makeDraftPortfolio());
  writeFile(path.join(dir, 'holdings.md'), makeSupportFile('Holdings'));
  writeFile(path.join(dir, 'trades.md'), makeSupportFile('Trades'));
  writeFile(path.join(dir, 'history.md'), makeSupportFile('History'));
  writeFile(path.join(dir, 'dashboard.md'), makeSupportFile('Dashboard'));

  const initialGuided = guidedQuestions(portfolioPath);
  assert(initialGuided.length > 0, 'Expected guided questions for draft');
  assert(initialGuided.some((item) => item.key === 'brokerAccountReference' && /Interactive Brokers account alias/i.test(item.guidance)), 'Expected broker-account guided hint');
  assert(initialGuided.some((item) => item.key === 'maximumAcceptableDrawdown' && item.answerFormat === 'percentage'), 'Expected answer format metadata');

  let readiness = activationReadiness(dir);
  assert(readiness.guidedQuestions.length === initialGuided.length, 'Expected readiness guided questions to align with draft questions');
  assert(readiness.blockers.some((line) => /Unanswered draft questions remain/i.test(line)), 'Expected guided-question blocker');

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

  const afterAnswers = guidedQuestions(portfolioPath);
  assert(afterAnswers.length === 0, 'Expected guided questions to clear after answers');
  assert(nextQuestions(portfolioPath).length === 0, 'Expected raw question list to clear after answers');

  readiness = activationReadiness(dir);
  assert(readiness.ready === true, 'Expected readiness after answers');
  assert(readiness.guidedQuestions.length === 0, 'Expected no guided blockers after answers');

  console.log(JSON.stringify({ ok: true, initialGuided, readiness }, null, 2));
}

main();
