const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function usage() {
  console.error('Usage: node scripts/bootstrap-portfolio-from-json.js <json-file>');
  process.exit(1);
}

const inputPath = process.argv[2];
if (!inputPath) usage();

const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
if (!raw.name) throw new Error('Missing required field: name');

const root = path.resolve(__dirname, '..');
execFileSync(process.execPath, [path.join(__dirname, 'create-portfolio.js'), raw.name], { stdio: 'inherit' });

const slug = String(raw.name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const portfolioPath = path.join(root, 'portfolio', slug, 'portfolio.md');
let text = fs.readFileSync(portfolioPath, 'utf8');

const replacements = [
  ['Status: draft', `Status: ${raw.status || 'draft'}`],
  ['Broker: interactive-brokers', `Broker: ${raw.broker || 'interactive-brokers'}`],
  ['Base currency: CHF', `Base currency: ${raw.baseCurrency || 'CHF'}`],
  ['Broker account reference: <account_alias_or_safe_identifier>', `Broker account reference: ${raw.brokerAccountReference || '<account_alias_or_safe_identifier>'}`],
  ['Execution mode: require_confirmation', `Execution mode: ${raw.executionMode || 'require_confirmation'}`],
  ['Risk level: <low | medium | high>', `Risk level: ${raw.riskLevel || '<low | medium | high>'}`],
  ['Investment horizon: <years>', `Investment horizon: ${raw.investmentHorizon || '<years>'}`],
  ['Maximum acceptable drawdown: <%>', `Maximum acceptable drawdown: ${raw.maximumAcceptableDrawdown || '<%>'}`],
  ['Liquidity needs: <low | medium | high>', `Liquidity needs: ${raw.liquidityNeeds || '<low | medium | high>'}`],
  ['Income requirement: <none | low | medium | high>', `Income requirement: ${raw.incomeRequirement || '<none | low | medium | high>'}`],
  ['ESG preference: <none | prefer | required>', `ESG preference: ${raw.esgPreference || '<none | prefer | required>'}`],
];

for (const [from, to] of replacements) {
  text = text.replace(from, to);
}

fs.writeFileSync(portfolioPath, text);
console.log(JSON.stringify({ portfolioPath: path.relative(root, portfolioPath) }, null, 2));
