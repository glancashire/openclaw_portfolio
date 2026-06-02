#!/usr/bin/env node
'use strict';

/* SPMCHA quote retry — try multiple market-data tactics. */

const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { InteractiveBrokersClient } = require(path.join(ROOT, 'src/brokers/interactive-brokers/client'));

(async () => {
  const client = new InteractiveBrokersClient({ portfolio: 'etf' });
  const conid = 91639399;

  console.log('=== Tactic 1: explicit field set with live + delayed types ===');
  for (const fields of [
    ['31'],                              // last only
    ['31','86'],                         // last + ask
    ['31','84','86','88'],               // last + bid + ask + ask size
    ['7295','7296'],                     // close + open
    ['31','84','86','88','85','7295'],   // full
  ]) {
    try {
      const r = await client.native.fetchMarketSnapshot([conid], { fields });
      console.log(`fields=${JSON.stringify(fields)}:`, JSON.stringify(r));
    } catch (e) { console.log(`fields=${JSON.stringify(fields)} error:`, e.message); }
  }

  console.log('\n=== Tactic 2: regulatory snapshot via withApi (force liveDelayedPolicy) ===');
  if (typeof client.native.withApi === 'function') {
    try {
      const r = await client.native.withApi(async (api) => {
        // Try IBKR REST-style endpoints. Inspect what's available.
        const keys = Object.keys(api);
        return { apiSurface: keys.slice(0, 30) };
      });
      console.log(JSON.stringify(r, null, 2));
    } catch (e) { console.log('withApi error:', e.message); }
  }

  console.log('\n=== Tactic 3: search by ISIN ===');
  for (const params of [
    { secIdType: 'ISIN', secId: 'CH0130595124' },
    { symbol: 'SPMCHA', secType: 'ETF', currency: 'CHF', exchange: 'SMART' },
    { symbol: 'SPMCHA', secType: 'ETF', currency: 'CHF', exchange: 'EBS' },
    { symbol: 'SPMCHA', secType: 'STK', currency: 'CHF' },
    { symbol: 'SPMCHA', currency: 'CHF' },
  ]) {
    try {
      const r = await client.native.searchContracts(params);
      console.log(`search ${JSON.stringify(params)} =>`, JSON.stringify(r).slice(0, 600));
    } catch (e) { console.log(`search ${JSON.stringify(params)} error:`, e.message); }
  }

  console.log('\n=== Tactic 4: historical bars (last 5 days) ===');
  try {
    if (typeof client.native.fetchHistorical === 'function') {
      const bars = await client.native.fetchHistorical({ conid, durationStr: '5 D', barSizeSetting: '1 day', whatToShow: 'TRADES' });
      console.log('historical:', JSON.stringify(bars, null, 2).slice(0, 4000));
    } else {
      console.log('fetchHistorical not on native client surface');
    }
  } catch (e) { console.log('historical error:', e.message); }

  process.exit(0);
})().catch((e) => { console.error(e.stack || String(e)); process.exit(1); });
