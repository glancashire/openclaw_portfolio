#!/usr/bin/env node
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { InteractiveBrokersClient } = require(path.join(ROOT, 'src/brokers/interactive-brokers/client'));
const ib = require('@stoqey/ib');

(async () => {
  const client = new InteractiveBrokersClient({ portfolio: 'etf' });
  const errors = [];
  const events = [];
  await client.native.withApi(async ({ api }) => {
    api.on(ib.EventName.error, (err, code, id) => {
      events.push({ kind: 'error', code, id, msg: (err?.message || String(err)).slice(0, 240) });
    });
    api.on(ib.EventName.marketDataType, (id, type) => events.push({ kind: 'mktDataType', id, type }));
    api.on(ib.EventName.tickPrice, (id, t, p, attribs) => events.push({ kind: 'tickPrice', id, tickType: t, price: p, attribs }));
    api.on(ib.EventName.tickGeneric, (id, t, v) => events.push({ kind: 'tickGeneric', id, tickType: t, value: v }));
    api.on(ib.EventName.tickString, (id, t, v) => events.push({ kind: 'tickString', id, tickType: t, value: String(v).slice(0, 80) }));
    api.on(ib.EventName.tickReqParams, (id, minTick, bbo, snapshotPermissions) => events.push({ kind: 'tickReqParams', id, minTick, bbo, snapshotPermissions }));
    
    console.log('Step 1: reqMarketDataType(1) — request LIVE');
    api.reqMarketDataType(1);
    await new Promise((r) => setTimeout(r, 1500));
    
    console.log('Step 2: reqMktData SXR8 (control)');
    api.reqMktData(40001, { conId: 75776072, symbol: 'SXR8', secType: 'STK', exchange: 'SMART', primaryExch: 'IBIS2', currency: 'EUR' }, '', false, false);
    await new Promise((r) => setTimeout(r, 4000));
    try { api.cancelMktData(40001); } catch {}
    
    console.log('Step 3: reqMktData SPMCHA (SIX)');
    api.reqMktData(40002, { conId: 91639399, symbol: 'SPMCHA', secType: 'STK', exchange: 'SMART', primaryExch: 'EBS', currency: 'CHF' }, '', false, false);
    await new Promise((r) => setTimeout(r, 4000));
    try { api.cancelMktData(40002); } catch {}
    
    console.log('Step 4: try with reqMarketDataType(3) (delayed) on SXR8');
    api.reqMarketDataType(3);
    await new Promise((r) => setTimeout(r, 1000));
    api.reqMktData(40003, { conId: 75776072, symbol: 'SXR8', secType: 'STK', exchange: 'SMART', primaryExch: 'IBIS2', currency: 'EUR' }, '', false, false);
    await new Promise((r) => setTimeout(r, 4000));
    try { api.cancelMktData(40003); } catch {}
  });

  console.log('\n=== Events (' + events.length + ' total) ===');
  for (const e of events) console.log(JSON.stringify(e));
  process.exit(0);
})().catch((e) => { console.error(e.stack || String(e)); process.exit(1); });
