const { IBApi, EventName, IBApiTickType } = require('@stoqey/ib');

const host = '127.0.0.1';
const port = 4001;

const contracts = [
  { label: 'IBM', contract: { symbol: 'IBM', secType: 'STK', currency: 'USD', exchange: 'SMART', primaryExch: 'NYSE' } },
  { label: 'SPY', contract: { symbol: 'SPY', secType: 'STK', currency: 'USD', exchange: 'SMART', primaryExch: 'ARCA' } },
  { label: 'IVV', contract: { symbol: 'IVV', secType: 'STK', currency: 'USD', exchange: 'SMART', primaryExch: 'ARCA' } },
];

async function main() {
  for (let i = 0; i < contracts.length; i++) {
    const item = contracts[i];
    const details = await getDetails(item.contract, 120 + i);
    console.log(JSON.stringify({ label: item.label, phase: 'details', contract: item.contract, details }, null, 2));
    const conid = details.rows?.[0]?.conid;
    if (conid) {
      const market = await getSnapshot({ conId: Number(conid), exchange: 'SMART', secType: 'STK' }, 220 + i);
      console.log(JSON.stringify({ label: item.label, phase: 'snapshot', conid, market }, null, 2));
    }
  }
}

function getDetails(contract, clientId) {
  return new Promise((resolve) => {
    const api = new IBApi({ host, port });
    const reqId = 9001;
    const rows = [];
    const done = (result) => {
      clearTimeout(timer);
      try { api.removeAllListeners(); } catch {}
      try { api.disconnect(); } catch {}
      resolve(result);
    };
    const timer = setTimeout(() => done({ timeout: true, count: rows.length, rows }), 12000);
    api.on(EventName.error, (err, code, rid) => {
      if (rid && rid !== reqId) return;
      if ([2104, 2106, 2158].includes(Number(code))) return;
      done({ error: String(err), code, reqId: rid, count: rows.length, rows });
    });
    api.on(EventName.nextValidId, () => api.reqContractDetails(reqId, contract));
    api.on(EventName.contractDetails, (rid, details) => {
      if (rid !== reqId) return;
      rows.push({
        conid: details?.summary?.conId ?? null,
        symbol: details?.summary?.symbol ?? null,
        localSymbol: details?.summary?.localSymbol ?? null,
        primaryExch: details?.summary?.primaryExch ?? null,
        exchange: details?.summary?.exchange ?? null,
        currency: details?.summary?.currency ?? null,
        longName: details?.longName ?? null,
        marketName: details?.marketName ?? null,
        secType: details?.summary?.secType ?? null,
      });
    });
    api.on(EventName.contractDetailsEnd, (rid) => {
      if (rid !== reqId) return;
      done({ ok: true, count: rows.length, rows });
    });
    api.connect(clientId);
  });
}

function getSnapshot(contract, clientId) {
  return new Promise((resolve) => {
    const api = new IBApi({ host, port });
    const reqId = 9101;
    const state = { conid: String(contract.conId), fields: {} };
    const done = (result) => {
      clearTimeout(timer);
      try { api.removeAllListeners(); } catch {}
      try { api.cancelMktData(reqId); } catch {}
      try { api.disconnect(); } catch {}
      resolve(result);
    };
    const timer = setTimeout(() => done({ timeout: true, state }), 13000);
    api.on(EventName.error, (err, code, rid) => {
      if (rid && rid !== reqId) return;
      if ([2104, 2106, 2158].includes(Number(code))) return;
      done({ error: String(err), code, reqId: rid, state });
    });
    api.on(EventName.nextValidId, () => {
      api.reqMarketDataType(3);
      api.reqMktData(reqId, contract, '', true, false);
    });
    api.on(EventName.tickPrice, (rid, tickType, price) => {
      if (rid !== reqId) return;
      state.fields[tickType] = price;
      if (tickType === IBApiTickType.LAST || tickType === IBApiTickType.DELAYED_LAST) state.last = price;
      if (tickType === IBApiTickType.BID || tickType === IBApiTickType.DELAYED_BID) state.bid = price;
      if (tickType === IBApiTickType.ASK || tickType === IBApiTickType.DELAYED_ASK) state.ask = price;
      if (tickType === IBApiTickType.CLOSE) state.close = price;
    });
    api.on(EventName.tickSize, (rid, tickType, size) => {
      if (rid !== reqId) return;
      state.fields[`size_${tickType}`] = size;
    });
    api.on(EventName.tickString, (rid, tickType, value) => {
      if (rid !== reqId) return;
      state.fields[`str_${tickType}`] = value;
    });
    api.on(EventName.marketDataType, (rid, marketDataType) => {
      if (rid !== reqId) return;
      state.marketDataType = marketDataType;
    });
    api.on(EventName.tickSnapshotEnd, (rid) => {
      if (rid !== reqId) return;
      done({ ok: true, state });
    });
    api.connect(clientId);
  });
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
