#!/usr/bin/env node
'use strict';
/* Quick probe:
 *   1. Try DELAYED market data (reqMarketDataType=3) on SIX names
 *   2. Fetch contractDetails for SPMCHA & CHSPI to see broker-reported minTick
 */
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { InteractiveBrokersClient } = require(path.join(ROOT, '..', 'src/brokers/interactive-brokers/client'));
const ib = require('@stoqey/ib');

const TICK_NAMES = {
  0: 'bidSize', 1: 'bid', 2: 'ask', 3: 'askSize', 4: 'last', 5: 'lastSize',
  6: 'high', 7: 'low', 8: 'volume', 9: 'close', 14: 'open', 45: 'lastTimestamp',
  66: 'delayedBid', 67: 'delayedAsk', 68: 'delayedLast', 75: 'delayedClose', 88: 'delayedHigh', 89: 'delayedLow',
};

const PROBES = [
  { label: 'SPMCHA', conid: 91639399, primaryExch: 'EBS', currency: 'CHF', symbol: 'SPMCHA' },
  { label: 'CHSPI/UBSSLI', conid: 150029461, primaryExch: 'EBS', currency: 'CHF', symbol: 'UBSSLI' },
];

async function probe(api, p, mdType) {
  const reqId = Math.floor(Math.random() * 100000) + 30000;
  const ticks = {};
  const errors = [];
  api.reqMarketDataType(mdType);
  const onPrice = (id, t, v) => { if (id === reqId && Number.isFinite(v) && v > 0) ticks[TICK_NAMES[t] || `t${t}`] = v; };
  const onSize = (id, t, v) => { if (id === reqId && Number.isFinite(v) && v > 0) ticks[TICK_NAMES[t] || `s${t}`] = v; };
  const onString = (id, t, v) => { if (id === reqId && v) ticks[TICK_NAMES[t] || `str${t}`] = v; };
  const onError = (err, code, id) => {
    if (id !== reqId) return;
    if ([2104, 2106, 2107, 2108, 2158].includes(code)) return;
    errors.push({ code, message: err?.message || String(err) });
  };
  api.on(ib.EventName.tickPrice, onPrice);
  api.on(ib.EventName.tickSize, onSize);
  api.on(ib.EventName.tickString, onString);
  api.on(ib.EventName.error, onError);
  const contract = { conId: p.conid, symbol: p.symbol, secType: 'STK', exchange: 'SMART', primaryExch: p.primaryExch, currency: p.currency };
  api.reqMktData(reqId, contract, '', false, false);
  await new Promise((r) => setTimeout(r, 7000));
  try { api.cancelMktData(reqId); } catch {}
  api.off(ib.EventName.tickPrice, onPrice);
  api.off(ib.EventName.tickSize, onSize);
  api.off(ib.EventName.tickString, onString);
  api.off(ib.EventName.error, onError);
  return { ticks, errors };
}

async function getDetails(api, conid) {
  const reqId = Math.floor(Math.random() * 100000) + 40000;
  return new Promise((resolve) => {
    let det = null;
    const timer = setTimeout(() => { cleanup(); resolve(null); }, 5000);
    const onDet = (id, d) => { if (id === reqId) det = d; };
    const onEnd = (id) => { if (id === reqId) { cleanup(); resolve(det); } };
    const cleanup = () => { clearTimeout(timer); api.off(ib.EventName.contractDetails, onDet); api.off(ib.EventName.contractDetailsEnd, onEnd); };
    api.on(ib.EventName.contractDetails, onDet);
    api.on(ib.EventName.contractDetailsEnd, onEnd);
    api.reqContractDetails(reqId, { conId: conid, exchange: 'SMART' });
  });
}

(async () => {
  const client = new InteractiveBrokersClient({ portfolio: 'etf' });
  await client.native.withApi(async ({ api }) => {
    console.log('=== Test 1: DELAYED market data (type 3) on SIX names ===\n');
    for (const p of PROBES) {
      const r = await probe(api, p, 3);
      console.log(`${p.label}: ticks=${JSON.stringify(r.ticks)}`);
      if (r.errors.length) console.log(`  errors=${JSON.stringify(r.errors)}`);
    }

    console.log('\n=== Test 2: DELAYED_FROZEN (type 4) on SIX names ===\n');
    for (const p of PROBES) {
      const r = await probe(api, p, 4);
      console.log(`${p.label}: ticks=${JSON.stringify(r.ticks)}`);
      if (r.errors.length) console.log(`  errors=${JSON.stringify(r.errors)}`);
    }

    console.log('\n=== Test 3: Contract details (minTick) ===\n');
    for (const p of PROBES) {
      const d = await getDetails(api, p.conid);
      if (!d) { console.log(`${p.label}: no details`); continue; }
      console.log(`${p.label}: minTick=${d.minTick}, validExchanges=${d.validExchanges}, marketRuleIds=${d.marketRuleIds}, longName=${d.longName}`);
    }
  });
  process.exit(0);
})().catch((e) => { console.error(e.stack || String(e)); process.exit(1); });
