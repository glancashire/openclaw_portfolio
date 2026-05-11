const fs = require('fs');
const path = require('path');
const { readApprovedInstruments } = require('../../analysis/approvedInstruments');

function formatHoldingRow(holding) {
  const fx = holding.currency === 'CHF' ? 1 : '';
  return `| ${holding.isin || holding.identifier || holding.ticker || ''} | ${holding.name || ''} | ${holding.assetClass || 'Unknown'} | ${holding.quantity || 0} | ${holding.price || 0} | ${holding.currency || 'CHF'} | ${fx} | ${holding.marketValue || 0} | ${holding.allocation || 0} | ${holding.target || 0} | ${holding.drift || 0} |`;
}

function normalizeUpper(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizeRaw(value) {
  return String(value || '').trim();
}

function isIgnorableUnmatchedHolding(holding) {
  const quantity = Number(holding?.quantity || 0);
  const ticker = normalizeUpper(holding?.ticker);
  const name = normalizeUpper(holding?.name);
  const assetClass = normalizeUpper(holding?.assetClass);
  const looksLikeFxHelper = ticker.includes('.') || name.includes('.') || ticker.includes('CASH') || name.includes('CASH') || assetClass.includes('CASH');
  return quantity === 0 && looksLikeFxHelper;
}

function matchApprovedInstrument(holding, approved) {
  const isin = normalizeUpper(holding?.isin);
  const identifier = normalizeRaw(holding?.identifier);
  const identifierUpper = normalizeUpper(holding?.identifier);
  const ticker = normalizeUpper(holding?.ticker);
  const name = normalizeUpper(holding?.name);
  return approved.find((instrument) => {
    const tickerOrIsin = normalizeUpper(instrument?.tickerOrIsin);
    const ibkrConid = normalizeRaw(instrument?.ibkrConid);
    const ibkrConidUpper = normalizeUpper(instrument?.ibkrConid);
    const ibkrSymbol = normalizeUpper(instrument?.ibkrSymbol);
    const instrumentName = normalizeUpper(instrument?.name);
    return (
      tickerOrIsin === isin ||
      tickerOrIsin === identifierUpper ||
      tickerOrIsin === ticker ||
      instrumentName === name ||
      (ibkrConid && ibkrConid === identifier) ||
      (ibkrConidUpper && ibkrConidUpper === identifierUpper) ||
      (ibkrSymbol && ibkrSymbol === ticker)
    );
  });
}

function writeHoldingsSnapshot({ portfolioDir, holdings = [], cashChf = 0, source = 'simulated', broker = 'interactive-brokers', normaliseHolding = (h) => h }) {
  const outPath = path.join(portfolioDir, 'holdings.md');
  const portfolioPath = path.join(portfolioDir, 'portfolio.md');
  const approved = fs.existsSync(portfolioPath) ? readApprovedInstruments(portfolioPath) : [];

  const normalized = holdings.map((holding) => {
    const norm = normaliseHolding(holding);
    const matched = matchApprovedInstrument(norm, approved);
    return {
      ...norm,
      assetClass: matched?.assetClass || holding.assetClass || norm.assetClass || 'Unknown',
      matchedApprovedInstrument: matched?.tickerOrIsin || null,
      unmatchedIgnorable: matched ? false : isIgnorableUnmatchedHolding(norm),
    };
  });

  const invested = normalized.reduce((sum, holding) => sum + Number(holding.marketValue || 0), 0);
  const total = invested + Number(cashChf || 0);
  const rows = normalized.length ? normalized.map((holding) => formatHoldingRow(holding)).join('\n') : '';
  const blockingUnmatched = normalized.filter((h) => h.assetClass === 'Unknown' && !h.unmatchedIgnorable);
  const allMatched = blockingUnmatched.length === 0;

  const content = `# Holdings: ${path.basename(portfolioDir)}\n\n## Last Sync\n- Date/time: ${new Date().toISOString().replace('T', ' ').slice(0, 19)}\n- Source: ${source}\n- Broker: ${broker}\n- Base currency: CHF\n- Total value CHF: ${total}\n- Cash CHF: ${cashChf}\n- Invested value CHF: ${invested}\n\n## Current Holdings\n| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |\n|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|\n${rows}\n\n## Cash\n| Currency | Amount | FX rate to CHF | Value CHF |\n|---|---:|---:|---:|\n| CHF | ${cashChf} | 1 | ${cashChf} |\n\n## Data Quality\n- All holdings matched to approved instruments: ${allMatched ? 'yes' : 'no'}\n- Unmatched holdings: ${allMatched ? 'none' : 'review instrument mapping'}\n- Pricing source: ${source}\n- Warnings:\n - ${normalized.length ? 'Instrument-level target mapping is not implemented yet.' : 'No holdings yet.'}\n`;

  fs.writeFileSync(outPath, content);
  return { outPath, total, invested, cashChf, count: normalized.length };
}

module.exports = { writeHoldingsSnapshot };
