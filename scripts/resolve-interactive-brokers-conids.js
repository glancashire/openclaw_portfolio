const fs = require('fs');
const { readApprovedInstruments } = require('../src/analysis/approvedInstruments');
const { searchEtfInstruments } = require('../src/brokers/interactive-brokers/instruments');
const { pickBestContractIntelligence } = require('../src/brokers/interactive-brokers/contractIntelligence');

async function main() {
  const portfolioPath = process.argv[2];
  if (!portfolioPath) {
    throw new Error('Usage: node scripts/resolve-interactive-brokers-conids.js <portfolio.md>');
  }

  const instruments = readApprovedInstruments(portfolioPath).filter((row) => row.ibkrSymbol && !row.ibkrConid);
  const results = [];

  for (const instrument of instruments) {
    const found = await searchEtfInstruments({ query: instrument.ibkrSymbol, portfolio: 'etf' });
    const best = found.ok ? pickBestContractIntelligence(found.instruments, instrument) : null;
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
        localSymbol: best.localSymbol,
        primaryExch: best.primaryExch,
        exchange: best.exchange,
        currency: best.currency,
        venueKey: best.venueKey,
      } : null,
    });
  }

  console.log(JSON.stringify({ count: results.length, results }, null, 2));
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
