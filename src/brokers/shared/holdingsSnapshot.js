const fs = require('fs');
const path = require('path');
const { readApprovedInstruments } = require('../../analysis/approvedInstruments');

function formatHoldingRow(holding) {
  const fx = holding.currency === 'CHF' ? 1 : '';
  return `| ${holding.isin || holding.identifier || holding.ticker || ''} | ${holding.name || ''} | ${holding.assetClass || 'Unknown'} | ${holding.quantity || 0} | ${formatHoldingPrice(holding)} | ${holding.currency || 'CHF'} | ${fx} | ${holding.marketValue || 0} | ${holding.allocation || 0} | ${holding.target || 0} | ${holding.drift || 0} |`;
}

function formatHoldingPrice(holding) {
  const price = holding?.price || 0;
  return holding?.priceBasis === 'avg_cost_fallback' ? `${price} (avg cost)` : String(price);
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
  const localSymbol = normalizeUpper(holding?.localSymbol);
  const primaryExchange = normalizeUpper(holding?.primaryExchange);
  const exchange = normalizeUpper(holding?.exchange);
  const name = normalizeUpper(holding?.name);
  return approved.find((instrument) => {
    const tickerOrIsin = normalizeUpper(instrument?.tickerOrIsin);
    const ibkrConid = normalizeRaw(instrument?.ibkrConid);
    const ibkrConidUpper = normalizeUpper(instrument?.ibkrConid);
    const ibkrSymbol = normalizeUpper(instrument?.ibkrSymbol);
    const ibkrLocalSymbol = normalizeUpper(instrument?.ibkrLocalSymbol);
    const ibkrPrimaryExchange = normalizeUpper(instrument?.ibkrPrimaryExchange);
    const instrumentName = normalizeUpper(instrument?.name);
    return (
      tickerOrIsin === isin ||
      tickerOrIsin === identifierUpper ||
      tickerOrIsin === ticker ||
      instrumentName === name ||
      (ibkrConid && ibkrConid === identifier) ||
      (ibkrConidUpper && ibkrConidUpper === identifierUpper) ||
      (ibkrSymbol && ibkrSymbol === ticker) ||
      (ibkrLocalSymbol && ibkrLocalSymbol === localSymbol) ||
      (ibkrPrimaryExchange && ibkrPrimaryExchange === primaryExchange && ((ibkrSymbol && ibkrSymbol === ticker) || (ibkrLocalSymbol && ibkrLocalSymbol === localSymbol) || tickerOrIsin === isin)) ||
      (ibkrPrimaryExchange && ibkrPrimaryExchange === exchange && ((ibkrSymbol && ibkrSymbol === ticker) || (ibkrLocalSymbol && ibkrLocalSymbol === localSymbol)))
    );
  });
}

function writeHoldingsSnapshot({ portfolioDir, holdings = [], cashChf = 0, cashBasis = 'unknown', cashDetail = null, source = 'simulated', broker = 'interactive-brokers', normaliseHolding = (h) => h, portfolioCashChf = null, portfolioCashBasis = null }) {
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
  const hasTrustedPortfolioCash = Number.isFinite(Number(portfolioCashChf));
  const effectivePortfolioCashChf = hasTrustedPortfolioCash ? Number(portfolioCashChf) : null;
  const effectivePortfolioCashBasis = hasTrustedPortfolioCash ? (portfolioCashBasis || 'portfolio_override') : (portfolioCashBasis || 'unknown_untrusted');
  const total = hasTrustedPortfolioCash ? (invested + effectivePortfolioCashChf) : invested;
  const rows = normalized.length ? normalized.map((holding) => formatHoldingRow(holding)).join('\n') : '';
  const blockingUnmatched = normalized.filter((h) => h.assetClass === 'Unknown' && !h.unmatchedIgnorable);
  const allMatched = blockingUnmatched.length === 0;
  const fallbackCount = normalized.filter((holding) => holding.priceBasis === 'avg_cost_fallback').length;
  const marketSnapshotCount = normalized.filter((holding) => holding.priceBasis === 'market_snapshot').length;

  const cashDetailLine = cashDetail && typeof cashDetail === 'object'
    ? `\n- Cash detail (CHF ledger tags): ${Object.entries(cashDetail).filter(([, value]) => Number.isFinite(value)).map(([key, value]) => `${key}=${value}`).join(', ') || 'none'}`
    : '';

  const content = `# Holdings: ${path.basename(portfolioDir)}\n\n## Last Sync\n- Date/time: ${new Date().toISOString().replace('T', ' ').slice(0, 19)}\n- Source: ${source}\n- Broker: ${broker}\n- Base currency: CHF\n- Total value CHF: ${total}\n- Portfolio cash CHF: ${hasTrustedPortfolioCash ? effectivePortfolioCashChf : 'unknown'}\n- Portfolio cash basis: ${effectivePortfolioCashBasis}\n- Broker account cash CHF: ${cashChf}\n- Broker account cash basis: ${cashBasis}\n- Invested value CHF: ${invested}\n\n## Current Holdings\n| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |\n|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|\n${rows}\n\n## Cash\n| Scope | Currency | Amount | FX rate to CHF | Value CHF | Basis |\n|---|---|---:|---:|---:|---|\n| Portfolio | CHF | ${hasTrustedPortfolioCash ? effectivePortfolioCashChf : 'unknown'} | ${hasTrustedPortfolioCash ? '1' : 'n/a'} | ${hasTrustedPortfolioCash ? effectivePortfolioCashChf : 'unknown'} | ${effectivePortfolioCashBasis} |\n| Broker account | CHF | ${cashChf} | 1 | ${cashChf} | ${cashBasis} |\n\n## Data Quality\n- All holdings matched to approved instruments: ${allMatched ? 'yes' : 'no'}\n- Unmatched holdings: ${allMatched ? 'none' : blockingUnmatched.map((holding) => holding.ticker || holding.isin || holding.identifier || holding.name || 'unknown').join(', ')}\n- Pricing source: ${source}\n- Holdings using market snapshot pricing: ${marketSnapshotCount}\n- Holdings using avg-cost fallback pricing: ${fallbackCount}\n- Warnings:\n - ${normalized.length ? 'Instrument-level target mapping is not implemented yet.' : 'No holdings yet.'}\n - ${fallbackCount > 0 ? 'Some holdings are shown with avg-cost fallback rather than broker market snapshot pricing.' : 'All holdings use broker market snapshot pricing or CHF cash.'}\n - Portfolio cash is marked unknown unless sourced from a trusted portfolio-local accounting path.\n - Portfolio cash and broker account cash may differ when the portfolio is only one sleeve of a larger broker account.${cashDetailLine}\n`;

  fs.writeFileSync(outPath, content);
  return { outPath, total, invested, cashChf, portfolioCashChf: effectivePortfolioCashChf, count: normalized.length };
}

module.exports = { writeHoldingsSnapshot };
