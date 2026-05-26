#!/usr/bin/env node
'use strict';

/* SIX subscription type investigation: distinguish TRADES-only vs full L1.
 *
 * Probes NESN with marketDataType=1 (live), 2 (frozen), 3 (delayed) and
 * captures ALL tick types verbosely so we can see if any bid/ask arrives at all.
 */

const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { InteractiveBrokersClient } = require(path.join(ROOT, 'src/brokers/interactive-brokers/client'));
const ib = require('@stoqey/ib');

const TICK_NAMES = {
  0: 'bidSize', 1: 'bid', 2: 'ask', 3: 'askSize', 4: 'last', 5: 'lastSize',
  6: 'high', 7: 'low', 8: 'volume', 9: 'close', 14: 'open',
  45: 'lastTimestamp', 49: 'halted',
  66: 'delayedBid', 67: 'delayedAsk', 68: 'delayedLast', 75: 'delayedHigh', 76: 'delayedLow', 77: 'delayedVolume', 78: 'delayedClose', 79: 'delayedOpen', 88: 'delayedBidSize', 89: 'delayedAskSize',
};

async function probe(api, dataType, label) {
  console.log(`\n=== ${label} (marketDataType=${dataType}) ===`);
  api.reqMarketDataType(dataType);
  return new Promise((resolve) => {
    const reqId = Math.floor(Math.random() * 100000) + 30000;
    const ticks = {};
    const errors = [];
    const timer = setTimeout(() => { cleanup(); resolve({ ticks, errors }); }, 10000);
    const onPrice = (id, t, p) => {
      if (id !== reqId) return;
      const name = TICK_NAMES[t] || `t${t}`;
      ticks[name] = p;
    };
    const onSize = (id, t, s) => {
      if (id !== reqId) return;
      const name = TICK_NAMES[t] || `s${t}`;
      ticks[name] = s;
    };
    const onString = (id, t, v) => {
      if (id !== reqId) return;
      const name = TICK_NAMES[t] || `str${t}`;
      ticks[name] = v;
    };
    const onError = (err, code, id) => {
      if (id !== reqId) return;
      if (code === 2104 || code === 2106 || code === 2107 || code === 2108 || code === 2158) return;
      errors.push({ code, message: err?.message || String(err) });
      console.log(`  error code=${code} ${err?.message || ''}`);
    };
    const cleanup = () => {
      clearTimeout(timer);
      try { api.cancelMktData(reqId); } catch {}
      api.off(ib.EventName.tickPrice, onPrice);
      api.off(ib.EventName.tickSize, onSize);
      api.off(ib.EventName.tickString, onString);
      api.off(ib.EventName.error, onError);
    };
    api.on(ib.EventName.tickPrice, onPrice);
    api.on(ib.EventName.tickSize, onSize);
    api.on(ib.EventName.tickString, onString);
    api.on(ib.EventName.error, onError);
    // NESN — most-liquid Swiss stock, conid known to IBKR catalog
    api.reqMktData(reqId, { symbol: 'NESN', secType: 'STK', exchange: 'SMART', primaryExch: 'EBS', currency: 'CHF' }, '', false, false);
  });
}

(async () => {
  const client = new InteractiveBrokersClient({ portfolio: 'etf' });
  await client.native.withApi(async ({ api }) => {
    const live = await probe(api, 1, 'NESN live');
    console.log(`  ticks: ${JSON.stringify(live.ticks)}`);
    console.log(`  hasBid=${'bid' in live.ticks} hasAsk=${'ask' in live.ticks} hasLast=${'last' in live.ticks}`);

    const frozen = await probe(api, 2, 'NESN frozen');
    console.log(`  ticks: ${JSON.stringify(frozen.ticks)}`);
    console.log(`  hasBid=${'bid' in frozen.ticks} hasAsk=${'ask' in frozen.ticks}`);

    const delayed = await probe(api, 3, 'NESN delayed');
    console.log(`  ticks: ${JSON.stringify(delayed.ticks)}`);
    console.log(`  hasDelayedBid=${'delayedBid' in delayed.ticks} hasDelayedAsk=${'delayedAsk' in delayed.ticks}`);
  });
  process.exit(0);
})().catch((e) => { console.error(e.stack || String(e)); process.exit(1); });
