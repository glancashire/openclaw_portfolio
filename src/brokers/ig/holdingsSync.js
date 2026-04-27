const fs = require('fs');
const path = require('path');
const { IgBrokerAdapter } = require('./adapter');
const { readApprovedInstruments } = require('../../analysis/approvedInstruments');

function formatHoldingRow(holding) {
  const fx = holding.currency === 'CHF' ? 1 : '';
  return `| ${holding.isin || holding.identifier || ''} | ${holding.name || ''} | ${holding.assetClass || 'Unknown'} | ${holding.quantity || 0} | ${holding.price || 0} | ${holding.currency || 'CHF'} | ${fx} | ${holding.marketValue || 0} | ${holding.allocation || 0} | ${holding.target || 0} | ${holding.drift || 0} |`;
}

function matchApprovedInstrument(holding, approved) {
  return approved.find((instrument) =>
    instrument.tickerOrIsin === holding.isin ||
    instrument.tickerOrIsin === holding.identifier ||
    instrument.name === holding.name
  );
}

function writeHoldingsSnapshot({ portfolioDir, holdings = [], cashChf = 0, source = 'simulated', broker = 'ig' }) {
  const outPath = path.join(portfolioDir, 'holdings.md');
  const portfolioPath = path.join(portfolioDir, 'portfolio.md');
  const approved = fs.existsSync(portfolioPath) ? readApprovedInstruments(portfolioPath) : [];
  const adapter = new IgBrokerAdapter({ dryRun: true, readOnly: true, portfolio: path.basename(portfolioDir) });
  const normalized = holdings.map((holding) => {
    const norm = adapter.normalise_broker_holding(holding);
    const matched = matchApprovedInstrument(norm, approved);
    return {
      ...norm,
      assetClass: matched?.assetClass || holding.assetClass || norm.assetClass || 'Unknown',
    };
  });
  const invested = normalized.reduce((sum, holding) => sum + Number(holding.marketValue || 0), 0);
  const total = invested + Number(cashChf || 0);
  const rows = normalized.length ? normalized.map((holding) => formatHoldingRow(holding)).join('\n') : '';

  const content = `# Holdings: ${path.basename(portfolioDir)}\n\n## Last Sync\n- Date/time: ${new Date().toISOString().replace('T', ' ').slice(0, 19)}\n- Source: ${source}\n- Broker: ${broker}\n- Base currency: CHF\n- Total value CHF: ${total}\n- Cash CHF: ${cashChf}\n- Invested value CHF: ${invested}\n\n## Current Holdings\n| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |\n|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|\n${rows}\n\n## Cash\n| Currency | Amount | FX rate to CHF | Value CHF |\n|---|---:|---:|---:|\n| CHF | ${cashChf} | 1 | ${cashChf} |\n\n## Data Quality\n- All holdings matched to approved instruments: ${normalized.length && normalized.every((h) => h.assetClass !== 'Unknown') ? 'yes' : 'no'}\n- Unmatched holdings: ${normalized.length && normalized.every((h) => h.assetClass !== 'Unknown') ? 'none' : 'review instrument mapping'}\n- Pricing source: ${source}\n- Warnings:\n - ${normalized.length ? 'Instrument-level target mapping is not implemented yet.' : 'No holdings yet.'}\n`;

  fs.writeFileSync(outPath, content);
  return { outPath, total, invested, cashChf, count: normalized.length };
}

module.exports = { writeHoldingsSnapshot };
