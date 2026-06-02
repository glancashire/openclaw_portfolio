#!/usr/bin/env node
'use strict';

/* SPMCHA diagnostic probe — runs through the same native client the runner uses. */

const path = require('path');
const { InteractiveBrokersClient } = require(path.join(__dirname, '..', '..', 'src/brokers/interactive-brokers/client'));

(async () => {
  const client = new InteractiveBrokersClient({ portfolio: 'etf' });
  console.log('=== SPMCHA contract probe via native client ===');

  // 1. Search by symbol
  try {
    const search = await client.native.searchContracts({ symbol: 'SPMCHA', secType: 'STK' });
    console.log('searchContracts(SPMCHA):', JSON.stringify(search, null, 2).slice(0, 4000));
  } catch (e) { console.log('searchContracts error:', e.message); }

  // 2. Snapshot
  try {
    const snap = await client.native.fetchMarketSnapshot([91639399]);
    console.log('fetchMarketSnapshot([91639399]):', JSON.stringify(snap, null, 2));
  } catch (e) { console.log('snapshot error:', e.message); }

  // 3. Compare against the working CHSPI conid (150029461) for sanity
  try {
    const snap2 = await client.native.fetchMarketSnapshot([150029461]);
    console.log('fetchMarketSnapshot([CHSPI 150029461]):', JSON.stringify(snap2, null, 2));
  } catch (e) { console.log('CHSPI snapshot error:', e.message); }

  // 4. Inspect open orders / completed orders raw
  try {
    const open = await client.native.fetchOpenOrders();
    console.log('fetchOpenOrders:', JSON.stringify(open, null, 2));
  } catch (e) { console.log('open-orders error:', e.message); }

  process.exit(0);
})().catch((e) => { console.error(e.stack || String(e)); process.exit(1); });
