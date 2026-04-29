const fs = require('fs');
const { readApprovedInstruments } = require('../src/analysis/approvedInstruments');
const { searchEtfInstruments } = require('../src/brokers/interactive-brokers/instruments');

async function main() {
  const portfolioPath = process.argv[2];
  if (!portfolioPath) {
    throw new Error('Usage: node scripts/resolve-interactive-brokers-conids.js <portfolio.md>');
  }

  const instruments = readApprovedInstruments(portfolioPath).filter((row) => row.ibkrSymbol && !row.ibkrConid);
  const results = [];

  for (const instrument of instruments) {
    const found = await searchEtfInstruments({ query: instrument.ibkrSymbol, portfolio: 'etf' });
    const best = found.ok ? pickBest(found.instruments, instrument) : null;
    results.push({
      tickerOrIsin: instrument.tickerOrIsin,
      name: instrument.name,
      ibkrSymbol: instrument.ibkrSymbol,
      found: found.ok,
      count: found.count || 0,
      bestMatch: best ? {
        conid: best.conid,
        symbol: best.symbol,
        name: best.name,
        exchange: best.exchange,
        currency: best.currency,
      } : null,
    });
  }

  console.log(JSON.stringify({ count: results.length, results }, null, 2));
}

function pickBest(candidates, instrument) {
  if (!Array.isArray(candidates) || !candidates.length) return null;
  const exactSymbol = candidates.find((row) => String(row.symbol || '').toUpperCase() === String(instrument.ibkrSymbol || '').toUpperCase());
  if (exactSymbol) return exactSymbol;
  const exactCurrency = candidates.find((row) => row.currency === instrument.currency);
  if (exactCurrency) return exactCurrency;
  return candidates[0];
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
