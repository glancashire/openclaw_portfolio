const fs = require('fs');
const path = require('path');
const { readApprovedInstruments } = require('../../analysis/approvedInstruments');

function resolvedFxToChf(holding) {
  const explicit = Number(holding?.fxRateToChf);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const hint = Number(holding?.matchedFxToChfHint);
  if (Number.isFinite(hint) && hint > 0) return hint;
  return String(holding?.currency || 'CHF').toUpperCase() === 'CHF' ? 1 : null;
}

function resolvedValueChf(holding) {
  const fx = resolvedFxToChf(holding);
  const nativeValue = Number(holding?.marketValueNative ?? holding?.marketValue ?? 0);
  if (Number.isFinite(nativeValue) && Number.isFinite(fx) && fx > 0) {
    return Number((nativeValue * fx).toFixed(8));
  }
  return Number(holding?.marketValue || 0);
}

function formatHoldingRow(holding) {
  const fx = resolvedFxToChf(holding);
  return `| ${holding.isin || holding.identifier || holding.ticker || ''} | ${holding.name || ''} | ${holding.assetClass || 'Unknown'} | ${holding.quantity || 0} | ${formatHoldingPrice(holding)} | ${holding.currency || 'CHF'} | ${fx ?? ''} | ${resolvedValueChf(holding)} | ${holding.allocation || 0} | ${holding.target || 0} | ${holding.drift || 0} |`;
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
      matchedFxToChfHint: matched?.fxToChfHint ?? null,
      unmatchedIgnorable: matched ? false : isIgnorableUnmatchedHolding(norm),
    };
  });

  const invested = normalized.reduce((sum, holding) => sum + resolvedValueChf(holding), 0);
  const total = invested + Number(cashChf || 0);
  const unmatched = normalized.filter((holding) => !holding.matchedApprovedInstrument && !holding.unmatchedIgnorable);

  const warnings = [
    'Instrument-level target mapping is not implemented yet.',
    'All holdings use broker market snapshot pricing or CHF cash.',
    'Portfolio cash is marked unknown unless sourced from a trusted portfolio-local accounting path.',
    'Portfolio cash and broker account cash may differ when the portfolio is only one sleeve of a larger broker account.',
  ];
  if (normalized.some((holding) => String(holding.currency || 'CHF').toUpperCase() !== 'CHF')) {
    warnings.push('Non-CHF holdings are converted to CHF in this report using approved-instrument fx_to_chf hints until a richer broker FX feed is threaded into the sync path.');
  }

  const content = `# Holdings: ${path.basename(portfolioDir)}

## Last Sync
- Date/time: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}
- Source: ${source}
- Broker: ${broker}
- Base currency: CHF
- Total value CHF: ${total}
- Portfolio cash CHF: ${portfolioCashChf == null ? 0 : portfolioCashChf}
- Portfolio cash basis: ${portfolioCashBasis || 'unknown'}
- Broker account cash CHF: ${cashChf}
- Broker account cash basis: ${cashBasis}
- Invested value CHF: ${invested}

## Current Holdings
| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |
|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|
${normalized.map(formatHoldingRow).join('\n')}

## Cash
| Scope | Currency | Amount | FX rate to CHF | Value CHF | Basis |
|---|---|---:|---:|---:|---|
| Portfolio | CHF | ${portfolioCashChf == null ? 0 : portfolioCashChf} | 1 | ${portfolioCashChf == null ? 0 : portfolioCashChf} | ${portfolioCashBasis || 'unknown'} |
| Broker account | CHF | ${cashChf} | 1 | ${cashChf} | ${cashBasis} |

## Data Quality
- All holdings matched to approved instruments: ${unmatched.length ? 'no' : 'yes'}
- Unmatched holdings: ${unmatched.length ? unmatched.map((h) => h.ticker || h.identifier || h.name).join(', ') : 'none'}
- Pricing source: ${source}
- Holdings using market snapshot pricing: ${normalized.filter((h) => h.priceBasis === 'market_snapshot').length}
- Holdings using avg-cost fallback pricing: ${normalized.filter((h) => h.priceBasis === 'avg_cost_fallback').length}
- Warnings:
${warnings.map((item) => ` - ${item}`).join('\n')}
${cashDetail ? `- Cash detail (CHF ledger tags): ${Object.entries(cashDetail).map(([key, value]) => `${key}=${value}`).join(', ')}` : ''}
`;

  fs.writeFileSync(outPath, content);
  return { outPath, total, invested, cashChf, portfolioCashChf, count: normalized.length };
}

module.exports = { writeHoldingsSnapshot, formatHoldingRow };
