'use strict';

// Verifies the readiness bridge: a trade identified by ISIN must match a
// holdings row identified by conid (the IBKR-native shape on this account)
// via the approved-instruments crosswalk. Without this bridge every basket
// fill is silently deferred (`not_investor_ready: missing portfolio_holdings`).

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const { buildNormalizedTradeContext } = require('../lib/tradeNotificationEmail');

function withTempPortfolio(fn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-readiness-'));
  try {
    return fn(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function writeApprovedRow(dir, lines) {
  const header = [
    '# Portfolio',
    '',
    '## Approved Instruments',
    '| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |',
    '|---|---|---|---:|---:|---:|---|---|---|',
    ...lines,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(dir, 'portfolio.md'), header, 'utf8');
}

function writeHoldings(dir, body) {
  const text = [
    '# Holdings',
    '',
    '## Current Holdings',
    body.trim(),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(dir, 'holdings.md'), text, 'utf8');
}

function runIsinTradeMatchesConidHoldingScenario() {
  withTempPortfolio((dir) => {
    writeApprovedRow(dir, [
      '| IE00BLNMYC90 | Xtrackers S&P 500 Equal Weight UCITS ETF 1C | Global equities | 6 | 0 | 10 | IBIS2 | EUR | ibkr_symbol=XDEW; ibkr_conid=163606923 |',
    ]);
    writeHoldings(dir, [
      '| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |',
      '|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|',
      '| 163606923 | XDEW | Global equities | 82 | 100.16 | EUR | 0.911882 | 7489.39 | 5.29 | 6 | -0.71 |',
    ].join('\n'));

    const trade = {
      symbol: 'IE00BLNMYC90',
      tickerOrIsin: 'IE00BLNMYC90',
      action: 'BUY',
      qty: 82,
      fillQty: 82,
      fillPrice: 100.14,
      currency: 'EUR',
      costChf: 7489.39,
      orderId: '9165',
    };

    const portfolio = {
      name: 'ETF Portfolio',
      totalValueChf: 141621.37,
      cashChf: 1468.66,
      holdings: [
        // Mirror the live monitor-fills shape: position rows keyed by conid (as
        // surfaced by IBKR positions API; broker_api sync writes the conid into
        // both Ticker / ISIN and Name when the human ticker isn't available).
        {
          symbol: '163606923',
          tickerOrIsin: '163606923',
          name: 'XDEW',
          conid: '163606923',
          quantityHeld: 82,
          valueChf: 7489.39,
          allocPct: 5.29,
        },
      ],
    };

    const context = buildNormalizedTradeContext(trade, portfolio, { portfolioDir: dir });

    assert.strictEqual(context.readiness.hasTrustedPortfolioTotals, true,
      'totals should be trusted (totalValueChf + cashChf both numeric & finite)');
    assert.strictEqual(context.readiness.hasTrustedPortfolioHoldings, true,
      'ISIN-keyed trade must match conid-keyed holdings via approvedInstruments crosswalk');
    assert.strictEqual(context.readiness.hasResultingTotalHeld, true,
      'resultingTotalHeld should be discoverable via the same identity bridge');
    assert.strictEqual(context.readiness.investorEmailReady, true,
      'investorEmailReady should be true once the bridge resolves the holding');

    // The first holdings row must surface the human ticker (XDEW), not the conid,
    // so the notification email's Portfolio-after-fill table reads cleanly.
    assert.strictEqual(context.portfolio.holdings[0].symbol, 'XDEW',
      'enriched holdings row should display ibkrSymbol over the raw conid');
  });
}

function runConidTradeMatchesIsinHoldingScenario() {
  // Reverse case: trade lookup carries conid, holdings are keyed by ISIN.
  withTempPortfolio((dir) => {
    writeApprovedRow(dir, [
      '| IE000OEF25S1 | Invesco MSCI World Equal Weight UCITS ETF Acc | Global equities | 4 | 0 | 8 | IBIS2 | EUR | ibkr_symbol=MWEQ; ibkr_conid=732138353 |',
    ]);
    writeHoldings(dir, [
      '| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |',
      '|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|',
      '| IE000OEF25S1 | MWEQ | Global equities | 903 | 5.735 | EUR | 0.911882 | 4722.36 | 3.33 | 4 | -0.67 |',
    ].join('\n'));

    const trade = {
      symbol: '732138353',
      conid: '732138353',
      action: 'BUY',
      qty: 903,
      fillQty: 903,
      fillPrice: 5.735,
      currency: 'EUR',
      costChf: 4722.36,
      orderId: '9166',
    };

    const portfolio = {
      name: 'ETF Portfolio',
      totalValueChf: 141621.37,
      cashChf: 1468.66,
      holdings: [
        {
          symbol: 'IE000OEF25S1',
          tickerOrIsin: 'IE000OEF25S1',
          name: 'MWEQ',
          quantityHeld: 903,
          valueChf: 4722.36,
        },
      ],
    };

    const context = buildNormalizedTradeContext(trade, portfolio, { portfolioDir: dir });
    assert.strictEqual(context.readiness.hasTrustedPortfolioHoldings, true,
      'conid-keyed trade must still match ISIN-keyed holdings via the approved-instruments bridge');
    assert.strictEqual(context.readiness.investorEmailReady, true,
      'investorEmailReady should be true in the reverse-direction match too');
  });
}

function runUnrelatedSymbolStillFailsClosed() {
  // Negative case: the readiness bridge must NOT match unrelated holdings.
  withTempPortfolio((dir) => {
    writeApprovedRow(dir, [
      '| IE00BLNMYC90 | Xtrackers S&P 500 Equal Weight UCITS ETF 1C | Global equities | 6 | 0 | 10 | IBIS2 | EUR | ibkr_symbol=XDEW; ibkr_conid=163606923 |',
    ]);
    writeHoldings(dir, [
      '| Ticker / ISIN | Name | Asset class | Quantity | Price | Currency | FX rate to CHF | Value CHF | Allocation % | Target % | Drift % |',
      '|---|---|---|---:|---:|---|---:|---:|---:|---:|---:|',
      '| 999999999 | UNRELATED | Global equities | 10 | 100 | EUR | 0.91 | 910 | 0.6 | 0 | 0.6 |',
    ].join('\n'));

    const trade = {
      symbol: 'IE00BLNMYC90',
      tickerOrIsin: 'IE00BLNMYC90',
      action: 'BUY',
      qty: 82,
      fillQty: 82,
      fillPrice: 100.14,
      currency: 'EUR',
      orderId: '9999',
    };

    const portfolio = {
      name: 'ETF Portfolio',
      totalValueChf: 141621.37,
      cashChf: 1468.66,
      holdings: [
        { symbol: '999999999', name: 'UNRELATED', quantityHeld: 10, valueChf: 910 },
      ],
    };

    const context = buildNormalizedTradeContext(trade, portfolio, { portfolioDir: dir });
    assert.strictEqual(context.readiness.hasTrustedPortfolioHoldings, false,
      'unrelated holdings must not satisfy the trade-identity bridge');
    assert.strictEqual(context.readiness.investorEmailReady, false,
      'unrelated holdings must keep investorEmailReady=false (fail closed)');
  });
}

function runCanonicalNameResolution() {
  // After ISIN<->conid bridge: investorTrade.name AND the enriched holdings
  // row name must come from approvedInstruments (canonical) when the only
  // alternative is the polluted IBKR-positions name (local symbol). This is
  // the exact pre-fix bug the user surfaced 2026-06-03 15:50 UTC: emails
  // showed "Name: XDEW" instead of "Name: Xtrackers S&P 500 Equal Weight
  // UCITS ETF 1C".
  withTempPortfolio((dir) => {
    writeApprovedRow(dir, [
      '| IE00BLNMYC90 | Xtrackers S&P 500 Equal Weight UCITS ETF 1C | Global equities | 6 | 0 | 10 | IBIS2 | EUR | ibkr_symbol=XDEW; ibkr_conid=163606923 |',
    ]);

    const trade = {
      symbol: 'IE00BLNMYC90',
      tickerOrIsin: 'IE00BLNMYC90',
      action: 'BUY',
      qty: 82,
      fillQty: 82,
      fillPrice: 100.14,
      currency: 'EUR',
      costChf: 7489.39,
      orderId: '9165',
      // No `trade.name` supplied: the bug appeared exactly when monitor-fills
      // forwarded only the symbol and let downstream resolve the name.
    };
    const portfolio = {
      name: 'ETF Portfolio',
      totalValueChf: 141621.37,
      cashChf: 1468.66,
      holdings: [
        // IBKR positions feed: name comes back as the local symbol (XDEW).
        { symbol: '163606923', name: 'XDEW', conid: '163606923', quantityHeld: 82, valueChf: 7489.39 },
      ],
    };

    const context = buildNormalizedTradeContext(trade, portfolio, { portfolioDir: dir });
    assert.strictEqual(context.investorTrade.name,
      'Xtrackers S&P 500 Equal Weight UCITS ETF 1C',
      'investorTrade.name must come from approvedInstruments when only IBKR positions name (local symbol) is available locally');
    assert.strictEqual(context.portfolio.holdings[0].name,
      'Xtrackers S&P 500 Equal Weight UCITS ETF 1C',
      'enriched holdings row name must come from approvedInstruments, not the IBKR positions "local symbol" name');
  });
}

function main() {
  runIsinTradeMatchesConidHoldingScenario();
  runConidTradeMatchesIsinHoldingScenario();
  runUnrelatedSymbolStillFailsClosed();
  runCanonicalNameResolution();
  console.log(JSON.stringify({ ok: true, tests: 4 }, null, 2));
}

main();
