const { IBApi, EventName } = require('@stoqey/ib');

const host = '127.0.0.1';
const port = 4001;
const clientId = 113;
const secId = process.argv[2] || 'IE00B5BMR087';

const contracts = [
  { secIdType: 'ISIN', secId, exchange: 'SMART', secType: 'STK' },
  { secIdType: 'ISIN', secId, exchange: 'LSEETF', secType: 'STK' },
  { secIdType: 'ISIN', secId, exchange: 'LSE', secType: 'STK' },
];

async function main() {
  for (let i = 0; i < contracts.length; i++) {
    const result = await run(contracts[i], clientId + i);
    console.log(JSON.stringify({ contract: contracts[i], result }, null, 2));
  }
}

function run(contract, cid) {
  return new Promise((resolve) => {
    const api = new IBApi({ host, port });
    const reqId = 8001;
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
        secType: details?.summary?.secType ?? null,
      });
    });
    api.on(EventName.contractDetailsEnd, (rid) => {
      if (rid !== reqId) return;
      done({ ok: true, count: rows.length, rows });
    });
    api.connect(cid);
  });
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
