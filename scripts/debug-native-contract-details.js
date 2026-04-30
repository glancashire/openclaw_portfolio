const { IBApi, EventName } = require('@stoqey/ib');

const host = '127.0.0.1';
const port = 4001;
const clientId = 111;
const query = process.argv[2] || 'CSPX';

const templates = [
  { symbol: query, secType: 'STK', exchange: 'SMART', currency: 'USD' },
  { symbol: query, secType: 'STK', exchange: 'LSEETF', currency: 'USD' },
  { symbol: query, secType: 'STK', exchange: 'LSE', currency: 'USD' },
  { symbol: query, secType: 'ETF', exchange: 'SMART', currency: 'USD' },
  { symbol: query, secType: 'IND', exchange: 'SMART', currency: 'USD' },
];

async function main() {
  for (const contract of templates) {
    const result = await run(contract);
    console.log(JSON.stringify({ contract, result }, null, 2));
  }
}

function run(contract) {
  return new Promise((resolve, reject) => {
    const api = new IBApi({ host, port });
    let reqId = 5001;
    const rows = [];
    const cleanup = () => {
      clearTimeout(timer);
      api.removeAllListeners();
      try { api.disconnect(); } catch {}
    };
    const timer = setTimeout(() => {
      cleanup();
      resolve({ timeout: true, rows });
    }, 15000);
    api.on(EventName.error, (err, code, rid) => {
      if (rid && rid !== reqId) return;
      cleanup();
      resolve({ error: String(err), code, reqId: rid, rows });
    });
    api.on(EventName.nextValidId, () => {
      api.reqContractDetails(reqId, contract);
    });
    api.on(EventName.contractDetails, (rid, details) => {
      if (rid !== reqId) return;
      rows.push(details);
    });
    api.on(EventName.contractDetailsEnd, (rid) => {
      if (rid !== reqId) return;
      cleanup();
      resolve({ ok: true, count: rows.length, rows });
    });
    api.connect(clientId);
  });
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
