const { IBApi, EventName } = require('@stoqey/ib');

const host = '127.0.0.1';
const port = 4001;
const clientId = 112;
const symbol = process.argv[2] || 'CSPX';
const exchange = process.argv[3] || 'SMART';
const primaryExch = process.argv[4] || '';

const contract = { symbol, secType: 'STK', exchange };
if (primaryExch) contract.primaryExch = primaryExch;

const api = new IBApi({ host, port });
const reqId = 6001;
const rows = [];
const done = (result) => {
  clearTimeout(timer);
  try { api.removeAllListeners(); } catch {}
  try { api.disconnect(); } catch {}
  console.log(JSON.stringify({ contract, result }, null, 2));
};
const timer = setTimeout(() => done({ timeout: true, count: rows.length, rows }), 12000);
api.on(EventName.error, (err, code, rid) => {
  if (rid && rid !== reqId) return;
  done({ error: String(err), code, reqId: rid, count: rows.length, rows });
});
api.on(EventName.nextValidId, () => {
  api.reqContractDetails(reqId, contract);
});
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
