#!/usr/bin/env node
'use strict';

/* Check market-data subscription status by probing live quotes on multiple venues.
 *
 * - SIX (EBS) instruments: SPMCHA, UBSSLI/CHSPI, NESN (Nestle reference).
 * - Control: SXR8 on IBIS2 (EUR; known-working subscription).
 *
 * For each: subscribes to live streaming reqMktData, captures bid/ask/last/close
 * tick events for 8s, and reports any error codes IBKR sends (10089/10090 etc.
 * indicate missing market-data subscription).
 */

const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { InteractiveBrokersClient } = require(path.join(ROOT, 'src/brokers/interactive-brokers/client'));
const ib = require('@stoqey/ib');

const TICK_NAMES = {
  0: 'bidSize', 1: 'bid', 2: 'ask', 3: 'askSize', 4: 'last', 5: 'lastSize',
  6: 'high', 7: 'low', 8: 'volume', 9: 'close', 14: 'open',
  45: 'lastTimestamp', 88: 'delayedBid', 87: 'delayedAsk',
};

const PROBES = [
  { label: 'SPMCHA (SIX/EBS — Swiss mid-cap ETF)', conid: 91639399, symbol: 'SPMCHA', primaryExch: 'EBS', currency: 'CHF' },
  { label: 'UBSSLI/CHSPI (SIX/EBS — Swiss large-cap ETF)', conid: 150029461, symbol: 'UBSSLI', primaryExch: 'EBS', currency: 'CHF' },
  { label: 'NESN (SIX/EBS — Nestle, large-cap reference)', symbol: 'NESN', primaryExch: 'EBS', currency: 'CHF', resolveBySymbol: true },
  { label: 'SXR8 (IBIS — EUR control, known working)', conid: 75776072, symbol: 'SXR8', primaryExch: 'IBIS2', currency: 'EUR' },
];

async function resolveConid(api, symbol, primaryExch, currency) {
  return new Promise((resolve) => {
    const reqId = Math.floor(Math.random() * 100000) + 10000;
    let found = null;
    const timer = setTimeout(() => { cleanup(); resolve(null); }, 5000);
    const onDetails = (id, det) => {
      if (id !== reqId) return;
      if (det.contract?.primaryExchange === primaryExch || det.contract?.exchange === primaryExch) {
        found = det.contract.conId;
      } else if (!found) {
        found = det.contract.conId;
      }
    };
    const onEnd = (id) => { if (id === reqId) { cleanup(); resolve(found); } };
    const cleanup = () => { clearTimeout(timer); api.off(ib.EventName.contractDetails, onDetails); api.off(ib.EventName.contractDetailsEnd, onEnd); };
    api.on(ib.EventName.contractDetails, onDetails);
    api.on(ib.EventName.contractDetailsEnd, onEnd);
    api.reqContractDetails(reqId, { symbol, secType: 'STK', exchange: 'SMART', primaryExch, currency });
  });
}

async function probeQuote(api, probe) {
  const reqId = Math.floor(Math.random() * 100000) + 20000;
  let conid = probe.conid;
  if (probe.resolveBySymbol && !conid) {
    conid = await resolveConid(api, probe.symbol, probe.primaryExch, probe.currency);
    if (!conid) return { probe, ticks: {}, errors: [{ code: 0, message: 'could not resolve conid' }] };
  }
  const contract = { conId: conid, symbol: probe.symbol, secType: 'STK', exchange: 'SMART', primaryExch: probe.primaryExch, currency: probe.currency };

  return new Promise((resolve) => {
    const ticks = {};
    const errors = [];
    const timer = setTimeout(() => { cleanup(); resolve({ probe, conid, ticks, errors }); }, 8000);
    const onPrice = (id, t, p) => { if (id === reqId && Number.isFinite(p) && p > 0) ticks[TICK_NAMES[t] || `t${t}`] = p; };
    const onSize = (id, t, s) => { if (id === reqId && Number.isFinite(s) && s > 0) ticks[TICK_NAMES[t] || `s${t}`] = s; };
    const onString = (id, t, v) => { if (id === reqId && v) ticks[TICK_NAMES[t] || `str${t}`] = v; };
    const onError = (err, code, id) => {
      if (id !== reqId) return;
      // Skip benign info codes
      if (code === 2104 || code === 2106 || code === 2107 || code === 2108 || code === 2158) return;
      errors.push({ code, message: err?.message || String(err) });
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
    api.reqMktData(reqId, contract, '', false, false);
  });
}

function classify(result) {
  const t = result.ticks;
  const hasBidAsk = Number.isFinite(t.bid) && Number.isFinite(t.ask);
  const hasLiveLast = Number.isFinite(t.last) && t.lastTimestamp;
  const hasDelayed = Number.isFinite(t.delayedBid) || Number.isFinite(t.delayedAsk);
  const subscriptionErrors = result.errors.filter((e) => e.code === 10089 || e.code === 10090 || e.code === 10168 || e.code === 354);
  let verdict;
  if (hasBidAsk && hasLiveLast) verdict = '✅ LIVE — bid/ask + live last';
  else if (hasBidAsk) verdict = '🟡 PARTIAL — bid/ask but no live last';
  else if (hasDelayed) verdict = '⏰ DELAYED ONLY — no live subscription';
  else if (subscriptionErrors.length > 0) verdict = '❌ MISSING SUBSCRIPTION';
  else if (Number.isFinite(t.close) && !hasBidAsk && !hasLiveLast) verdict = '❌ STALE CLOSE ONLY — no live quote feed';
  else verdict = '❓ NO DATA';
  return { verdict, hasBidAsk, hasLiveLast, hasDelayed, subscriptionErrors };
}

(async () => {
  const client = new InteractiveBrokersClient({ portfolio: 'etf' });
  console.log('Probing market data subscriptions...\n');

  const results = [];
  await client.native.withApi(async ({ api }) => {
    api.reqMarketDataType(1); // live
    for (const probe of PROBES) {
      console.log(`Probing: ${probe.label}`);
      const result = await probeQuote(api, probe);
      const c = classify(result);
      console.log(`  Ticks observed: ${JSON.stringify(result.ticks)}`);
      if (result.errors.length > 0) console.log(`  Errors: ${JSON.stringify(result.errors)}`);
      console.log(`  Verdict: ${c.verdict}\n`);
      results.push({ probe: probe.label, ...c, ticks: result.ticks, errors: result.errors });
    }
  });

  console.log('\n=== Summary ===');
  for (const r of results) {
    console.log(`${r.verdict.padEnd(45)} ${r.probe}`);
  }

  // Specific recommendation for SIX
  const sixResults = results.filter((r) => r.probe.includes('SIX/EBS'));
  const sixWorking = sixResults.filter((r) => r.hasBidAsk || r.hasLiveLast);
  console.log('\n=== SIX Subscription Verdict ===');
  if (sixWorking.length === sixResults.length && sixResults.length > 0) {
    console.log('✅ SIX (NP, L1) appears ACTIVE — live bid/ask received on all probed Swiss instruments.');
    console.log('   Safe to clear circuit breaker and retry SPMCHA.');
  } else if (sixWorking.length > 0) {
    console.log(`🟡 SIX partial — ${sixWorking.length}/${sixResults.length} Swiss instruments returned live data.`);
    console.log('   Subscription may still be propagating. Wait ~5-15 min and re-probe.');
  } else {
    console.log('❌ SIX (NP, L1) does NOT appear active — no Swiss instrument returned live bid/ask.');
    console.log('   Either subscription is still propagating (can take 5-30 min after enabling)');
    console.log('   or the market data type / packaging selected does not include real-time L1.');
  }

  process.exit(0);
})().catch((e) => { console.error(e.stack || String(e)); process.exit(1); });
