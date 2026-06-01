const { IBApi, EventName } = require('@stoqey/ib');

const host = '127.0.0.1';
const port = 4001;
const symbol = process.argv[2] || 'CSPX';
const contracts = [
  { symbol, secType: 'STK', exchange: 'LSEETF' },
  { symbol, secType: 'STK', exchange: 'LSE' },
  { symbol, secType: 'STK', exchange: 'AEB' },
  { symbol, secType: 'STK', exchange: 'SMART', primaryExch: 'AEB' },
  { localSymbol: symbol, secType: 'STK', exchange: 'LSEETF' },
  { localSymbol: symbol, secType: 'STK', exchange: 'LSE' },
  { localSymbol: symbol, secType: 'STK', exchange: 'AEB' },
];

async function main() {
  for (let i = 0; i < contracts.length; i++) {
    const result = await run(contracts[i], 7000 + i);
    console.log(JSON.stringify({ contract: contracts[i], result }, null, 2));
  }
}

function run(contract, clientId) {
  return new Promise((resolve) => {
    const api = new IBApi({ host, port });
    const reqId = 7001;
    const rows = [];
    const done = (result) => {
      clearTimeout(timer);
      try { api.removeAllListeners(); } catch {}
      try { api.disconnect(); } catch {}
      resolve(result);
    };
    const timer = setTimeout(() => done({ timeout: true, count: rows.length, rows }), 10000);
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
      });
    });
    api.on(EventName.contractDetailsEnd, (rid) => {
      if (rid !== reqId) return;
      done({ ok: true, count: rows.length, rows });
    });
    api.connect(clientId);
  });
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
