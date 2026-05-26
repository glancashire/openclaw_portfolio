#!/usr/bin/env node
'use strict';

/* SPMCHA quote retry — RAW IBKR API path through withApi.
 * Tries reqMktData live (type=1), frozen (type=2), regulatory snapshot,
 * non-snapshot streaming, plus reqContractDetails.
 */

const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { InteractiveBrokersClient } = require(path.join(ROOT, 'src/brokers/interactive-brokers/client'));
const ib = require('@stoqey/ib');

(async () => {
  const client = new InteractiveBrokersClient({ portfolio: 'etf' });
  const conid = 91639399;

  await client.native.withApi(async ({ api }) => {
    const reqContract = (overrides = {}) => ({
      conId: conid,
      symbol: 'SPMCHA',
      secType: 'STK',
      exchange: 'SMART',
      primaryExch: 'EBS',
      currency: 'CHF',
      ...overrides,
    });

    // --- A: contract-details with raw conid ---
    console.log('=== A: reqContractDetails(conid=91639399) ===');
    await new Promise((resolve) => {
      const reqId = 90001;
      const rows = [];
      const timer = setTimeout(() => { cleanup(); resolve(); }, 8000);
      const onDetails = (id, det) => { if (id === reqId) rows.push(det); };
      const onEnd = (id) => { if (id === reqId) { console.log('rows:', JSON.stringify(rows.map(r => ({ symbol: r.contract?.symbol, exchange: r.contract?.exchange, primaryExchange: r.contract?.primaryExchange, currency: r.contract?.currency, longName: r.longName, marketName: r.marketName, validExchanges: r.validExchanges }))).slice(0, 1500)); cleanup(); resolve(); } };
      const onError = (err, code, id) => { if (id === reqId) { console.log('error', code, err?.message || String(err)); cleanup(); resolve(); } };
      const cleanup = () => { clearTimeout(timer); api.off(ib.EventName.contractDetails, onDetails); api.off(ib.EventName.contractDetailsEnd, onEnd); api.off(ib.EventName.error, onError); };
      api.on(ib.EventName.contractDetails, onDetails);
      api.on(ib.EventName.contractDetailsEnd, onEnd);
      api.on(ib.EventName.error, onError);
      api.reqContractDetails(reqId, reqContract());
    });

    // --- B: contract-details with explicit primaryExch=EBS ---
    console.log('\n=== B: reqContractDetails (explicit EBS, no SMART) ===');
    await new Promise((resolve) => {
      const reqId = 90002;
      const rows = [];
      const timer = setTimeout(() => { cleanup(); resolve(); }, 8000);
      const onDetails = (id, det) => { if (id === reqId) rows.push(det); };
      const onEnd = (id) => { if (id === reqId) { console.log('rows:', JSON.stringify(rows.map(r => ({ symbol: r.contract?.symbol, exchange: r.contract?.exchange, primaryExchange: r.contract?.primaryExchange, currency: r.contract?.currency, longName: r.longName, validExchanges: r.validExchanges }))).slice(0, 1500)); cleanup(); resolve(); } };
      const onError = (err, code, id) => { if (id === reqId) { console.log('error', code, err?.message || String(err)); cleanup(); resolve(); } };
      const cleanup = () => { clearTimeout(timer); api.off(ib.EventName.contractDetails, onDetails); api.off(ib.EventName.contractDetailsEnd, onEnd); api.off(ib.EventName.error, onError); };
      api.on(ib.EventName.contractDetails, onDetails);
      api.on(ib.EventName.contractDetailsEnd, onEnd);
      api.on(ib.EventName.error, onError);
      api.reqContractDetails(reqId, { conId: conid, symbol: 'SPMCHA', secType: 'STK', exchange: 'EBS', currency: 'CHF' });
    });

    // --- C: reqMatchingSymbols (search by symbol) ---
    console.log('\n=== C: reqMatchingSymbols("SPMCHA") ===');
    await new Promise((resolve) => {
      const reqId = 90003;
      const timer = setTimeout(() => { cleanup(); resolve(); }, 5000);
      const onSym = (id, contractDescriptions) => {
        if (id !== reqId) return;
        console.log('matching:', JSON.stringify(contractDescriptions.map((d) => ({ symbol: d.contract?.symbol, conId: d.contract?.conId, secType: d.contract?.secType, primaryExchange: d.contract?.primaryExch, currency: d.contract?.currency }))).slice(0, 1500));
        cleanup(); resolve();
      };
      const cleanup = () => { clearTimeout(timer); api.off(ib.EventName.symbolSamples, onSym); };
      api.on(ib.EventName.symbolSamples, onSym);
      api.reqMatchingSymbols(reqId, 'SPMCHA');
    });

    // --- D: reqMatchingSymbols by ISIN ---
    console.log('\n=== D: reqMatchingSymbols("CH0130595124") ===');
    await new Promise((resolve) => {
      const reqId = 90004;
      const timer = setTimeout(() => { cleanup(); resolve(); }, 5000);
      const onSym = (id, contractDescriptions) => {
        if (id !== reqId) return;
        console.log('matching:', JSON.stringify(contractDescriptions.map((d) => ({ symbol: d.contract?.symbol, conId: d.contract?.conId, secType: d.contract?.secType, primaryExchange: d.contract?.primaryExch, currency: d.contract?.currency }))).slice(0, 1500));
        cleanup(); resolve();
      };
      const cleanup = () => { clearTimeout(timer); api.off(ib.EventName.symbolSamples, onSym); };
      api.on(ib.EventName.symbolSamples, onSym);
      api.reqMatchingSymbols(reqId, 'CH0130595124');
    });

    // --- E: live streaming reqMktData (snapshot=false, marketDataType=1) ---
    console.log('\n=== E: reqMarketDataType(1=live) + streaming reqMktData ===');
    api.reqMarketDataType(1);
    await new Promise((resolve) => {
      const reqId = 90005;
      const ticks = {};
      const timer = setTimeout(() => { cleanup(); console.log('streaming ticks (live):', JSON.stringify(ticks)); resolve(); }, 10000);
      const onPrice = (id, t, p) => { if (id === reqId && Number.isFinite(p) && p > 0) ticks[`p${t}`] = p; };
      const onSize = (id, t, s) => { if (id === reqId && Number.isFinite(s) && s > 0) ticks[`s${t}`] = s; };
      const onString = (id, t, v) => { if (id === reqId) ticks[`str${t}`] = v; };
      const onError = (err, code, id) => { if (id === reqId && code !== 2104 && code !== 2106 && code !== 2158) console.log('mktData err code=', code, err?.message); };
      const cleanup = () => { clearTimeout(timer); try { api.cancelMktData(reqId); } catch {}; api.off(ib.EventName.tickPrice, onPrice); api.off(ib.EventName.tickSize, onSize); api.off(ib.EventName.tickString, onString); api.off(ib.EventName.error, onError); };
      api.on(ib.EventName.tickPrice, onPrice);
      api.on(ib.EventName.tickSize, onSize);
      api.on(ib.EventName.tickString, onString);
      api.on(ib.EventName.error, onError);
      api.reqMktData(reqId, reqContract(), '', false, false);
    });

    // --- F: frozen marketDataType=2 ---
    console.log('\n=== F: reqMarketDataType(2=frozen) + streaming ===');
    api.reqMarketDataType(2);
    await new Promise((resolve) => {
      const reqId = 90006;
      const ticks = {};
      const timer = setTimeout(() => { cleanup(); console.log('streaming ticks (frozen):', JSON.stringify(ticks)); resolve(); }, 8000);
      const onPrice = (id, t, p) => { if (id === reqId && Number.isFinite(p) && p > 0) ticks[`p${t}`] = p; };
      const cleanup = () => { clearTimeout(timer); try { api.cancelMktData(reqId); } catch {}; api.off(ib.EventName.tickPrice, onPrice); };
      api.on(ib.EventName.tickPrice, onPrice);
      api.reqMktData(reqId, reqContract(), '', false, false);
    });

    // --- G: historical bars ---
    console.log('\n=== G: reqHistoricalData (1 D, 1 day, TRADES) ===');
    await new Promise((resolve) => {
      const reqId = 90007;
      const bars = [];
      const timer = setTimeout(() => { cleanup(); console.log(`historical bars: ${bars.length}`, JSON.stringify(bars).slice(0, 1500)); resolve(); }, 8000);
      const onBar = (id, b) => { if (id === reqId) bars.push(b); };
      const onEnd = (id) => { if (id === reqId) { cleanup(); console.log(`historical bars: ${bars.length}`, JSON.stringify(bars).slice(0, 1500)); resolve(); } };
      const onError = (err, code, id) => { if (id === reqId && !(code >= 2100 && code < 2200)) { console.log('historical err code=', code, err?.message); cleanup(); resolve(); } };
      const cleanup = () => { clearTimeout(timer); api.off(ib.EventName.historicalData, onBar); api.off(ib.EventName.historicalDataEnd, onEnd); api.off(ib.EventName.error, onError); };
      api.on(ib.EventName.historicalData, onBar);
      api.on(ib.EventName.historicalDataEnd, onEnd);
      api.on(ib.EventName.error, onError);
      api.reqHistoricalData(reqId, reqContract(), '', '5 D', '1 day', 'TRADES', 1, 1, false);
    });
  });

  process.exit(0);
})().catch((e) => { console.error(e.stack || String(e)); process.exit(1); });
