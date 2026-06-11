#!/usr/bin/env node
'use strict';
/* One-shot: subscribe to a SIX name and a control (SXR8) and surface every error code */
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { InteractiveBrokersClient } = require(path.join(ROOT, 'src/brokers/interactive-brokers/client'));
const ib = require('@stoqey/ib');

(async () => {
  const client = new InteractiveBrokersClient({ portfolio: 'etf' });
  const allErrors = [];
  const ticks = { sxr8: {}, spmcha: {} };
  await client.native.withApi(async ({ api }) => {
    api.on(ib.EventName.error, (err, code, id) => {
      const msg = err?.message || String(err);
      allErrors.push({ code, reqId: id, msg: msg.slice(0, 240) });
    });
    api.on(ib.EventName.tickPrice, (id, t, p) => {
      const bucket = id === 31000 ? ticks.sxr8 : id === 31001 ? ticks.spmcha : null;
      if (bucket && Number.isFinite(p)) bucket[`p${t}`] = p;
    });
    api.on(ib.EventName.tickGeneric, (id, t, v) => {
      const bucket = id === 31000 ? ticks.sxr8 : id === 31001 ? ticks.spmcha : null;
      if (bucket) bucket[`g${t}`] = v;
    });
    api.reqMarketDataType(1);
    api.reqMktData(31000, { conId: 75776072, symbol: 'SXR8', secType: 'STK', exchange: 'SMART', primaryExch: 'IBIS2', currency: 'EUR' }, '', false, false);
    api.reqMktData(31001, { conId: 91639399, symbol: 'SPMCHA', secType: 'STK', exchange: 'SMART', primaryExch: 'EBS', currency: 'CHF' }, '', false, false);
    await new Promise((r) => setTimeout(r, 7000));
    try { api.cancelMktData(31000); } catch {}
    try { api.cancelMktData(31001); } catch {}
  });
  console.log('=== Errors ===');
  console.log(JSON.stringify(allErrors, null, 2));
  console.log('\n=== Ticks ===');
  console.log(JSON.stringify(ticks, null, 2));
  process.exit(0);
})().catch((e) => { console.error(e.stack || String(e)); process.exit(1); });
