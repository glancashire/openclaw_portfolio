const { IBApi, EventName, IBApiTickType } = require('@stoqey/ib');

const host = '127.0.0.1';
const port = 4001;
const clientId = Number(process.argv[2] || 130);
const conId = Number(process.argv[3] || 8314); // IBM
const secType = process.argv[4] || 'STK';
const exchange = process.argv[5] || 'SMART';

const contract = { conId, secType, exchange };
const api = new IBApi({ host, port });
const reqId = 9901;
const state = { conId, secType, exchange, fields: {} };

const done = (result) => {
  clearTimeout(timer);
  try { api.removeAllListeners(); } catch {}
  try { api.cancelMktData(reqId); } catch {}
  try { api.disconnect(); } catch {}
  console.log(JSON.stringify({ contract, result }, null, 2));
};

const timer = setTimeout(() => done({ timeout: true, state }), 15000);
api.on(EventName.error, (err, code, rid) => {
  if (rid && rid !== reqId) return;
  if ([2104, 2106, 2158].includes(Number(code))) return;
  done({ error: String(err), code, reqId: rid, state });
});
api.on(EventName.nextValidId, () => {
  api.reqMarketDataType(3);
  api.reqMktData(reqId, contract, '', true, false);
});
api.on(EventName.marketDataType, (rid, marketDataType) => {
  if (rid !== reqId) return;
  state.marketDataType = marketDataType;
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
api.on(EventName.tickSnapshotEnd, (rid) => {
  if (rid !== reqId) return;
  done({ ok: true, state });
});
api.connect(clientId);
