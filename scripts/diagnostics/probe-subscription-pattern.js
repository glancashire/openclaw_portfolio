#!/usr/bin/env node
'use strict';

/* Subscription pattern detection — run against multiple venues to discriminate
 * between (a) market-closed (b) missing-subscription (c) thin-instrument.
 *
 * NESN: SIX large-cap (most liquid Swiss stock — should always have L1)
 * SPMCHA: SIX mid-cap ETF (thin but real)
 * AAPL: NASDAQ (US market open right now — should have full L1 if we have NASDAQ)
 * SXR8: IBIS2 (control — known working this morning and just now)
 *
 * Captures errors verbosely; codes 354, 10089, 10090, 10168 indicate
 * missing subscription. Code 322 is "no market data permission".
 */

const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { InteractiveBrokersClient } = require(path.join(ROOT, 'src/brokers/interactive-brokers/client'));
const ib = require('@stoqey/ib');

const PROBES = [
  { label: 'NESN @ EBS (SIX large-cap; SIX closes 17:30 CEST)', symbol: 'NESN', primaryExch: 'EBS', currency: 'CHF', secType: 'STK' },
  { label: 'AAPL @ NASDAQ (US open until 22:00 CEST)', symbol: 'AAPL', primaryExch: 'NASDAQ', currency: 'USD', secType: 'STK' },
  { label: 'SXR8 @ IBIS2 (XETRA; closes 17:35 CEST)', conid: 75776072, symbol: 'SXR8', primaryExch: 'IBIS2', currency: 'EUR', secType: 'STK' },
  { label: 'SPMCHA @ EBS', conid: 91639399, symbol: 'SPMCHA', primaryExch: 'EBS', currency: 'CHF', secType: 'STK' },
];

async function probe(api, p) {
  return new Promise((resolve) => {
    const reqId = Math.floor(Math.random() * 100000) + 40000;
    const ticks = {};
    const errors = [];
    const generic = []; // capture tick generic
    const timer = setTimeout(() => { cleanup(); resolve({ ticks, errors, generic }); }, 8000);
    const onPrice = (id, t, p2, attr) => {
      if (id !== reqId) return;
      ticks[`tickPrice_${t}`] = { price: p2, attr };
    };
    const onSize = (id, t, s) => {
      if (id !== reqId) return;
      ticks[`tickSize_${t}`] = s;
    };
    const onString = (id, t, v) => {
      if (id !== reqId) return;
      ticks[`tickString_${t}`] = v;
    };
    const onGeneric = (id, t, v) => {
      if (id !== reqId) return;
      generic.push({ t, v });
    };
    const onError = (err, code, id) => {
      if (id !== reqId) return;
      errors.push({ code, msg: err?.message || String(err) });
    };
    const cleanup = () => {
      clearTimeout(timer);
      try { api.cancelMktData(reqId); } catch {}
      api.off(ib.EventName.tickPrice, onPrice);
      api.off(ib.EventName.tickSize, onSize);
      api.off(ib.EventName.tickString, onString);
      api.off(ib.EventName.tickGeneric, onGeneric);
      api.off(ib.EventName.error, onError);
    };
    api.on(ib.EventName.tickPrice, onPrice);
    api.on(ib.EventName.tickSize, onSize);
    api.on(ib.EventName.tickString, onString);
    api.on(ib.EventName.tickGeneric, onGeneric);
    api.on(ib.EventName.error, onError);
    const contract = { symbol: p.symbol, secType: p.secType, exchange: 'SMART', primaryExch: p.primaryExch, currency: p.currency };
    if (p.conid) contract.conId = p.conid;
    api.reqMktData(reqId, contract, '', false, false);
  });
}

(async () => {
  const client = new InteractiveBrokersClient({ portfolio: 'etf' });
  await client.native.withApi(async ({ api }) => {
    api.reqMarketDataType(1);
    for (const p of PROBES) {
      console.log(`\n=== ${p.label} ===`);
      const r = await probe(api, p);
      // compact tick view
      const flat = {};
      for (const [k, v] of Object.entries(r.ticks)) {
        if (typeof v === 'object' && 'price' in v) flat[k] = v.price;
        else flat[k] = v;
      }
      console.log(`  ticks: ${JSON.stringify(flat)}`);
      const interestingErrors = r.errors.filter((e) => ![2104, 2106, 2107, 2108, 2158].includes(e.code));
      if (interestingErrors.length) console.log(`  errors: ${JSON.stringify(interestingErrors)}`);
      const bid = flat.tickPrice_1;
      const ask = flat.tickPrice_2;
      const last = flat.tickPrice_4;
      const close = flat.tickPrice_9;
      const verdict = (Number.isFinite(bid) && bid > 0 && Number.isFinite(ask) && ask > 0)
        ? '✅ live bid/ask'
        : Number.isFinite(last)
          ? '🟡 last only (no live two-sided book)'
          : '❌ no live data';
      console.log(`  bid=${bid} ask=${ask} last=${last} close=${close}`);
      console.log(`  verdict: ${verdict}`);
    }
  });
  process.exit(0);
})().catch((e) => { console.error(e.stack || String(e)); process.exit(1); });
