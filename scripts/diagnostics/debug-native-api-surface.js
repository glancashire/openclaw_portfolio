const { IBApi, EventName } = require('@stoqey/ib');

const host = '127.0.0.1';
const port = 4001;
const clientId = 150;

async function main() {
  const results = {};
  results.nextValidId = await probeNextValidId();
  results.currentTime = await probeCurrentTime();
  results.managedAccounts = await probeManagedAccounts();
  results.positions = await probePositions();
  results.accountSummary = await probeAccountSummary();
  results.openOrders = await probeOpenOrders();
  results.executions = await probeExecutions();
  console.log(JSON.stringify(results, null, 2));
}

function withApi(run) {
  return new Promise((resolve) => {
    const api = new IBApi({ host, port });
    const done = (result) => {
      try { api.removeAllListeners(); } catch {}
      try { api.disconnect(); } catch {}
      resolve(result);
    };
    api.on(EventName.error, (err, code, reqId) => {
      if ([2104, 2106, 2158].includes(Number(code))) return;
    });
    api.on(EventName.nextValidId, (orderId) => run(api, done, orderId));
    api.connect(clientId + Math.floor(Math.random() * 1000));
  });
}

function probeNextValidId() {
  return withApi((api, done, orderId) => done({ ok: true, orderId }));
}

function probeCurrentTime() {
  return withApi((api, done) => {
    const timer = setTimeout(() => done({ timeout: true }), 8000);
    api.on(EventName.currentTime, (time) => {
      clearTimeout(timer);
      done({ ok: true, time });
    });
    api.reqCurrentTime();
  });
}

function probeManagedAccounts() {
  return withApi((api, done) => {
    const timer = setTimeout(() => done({ timeout: true }), 8000);
    api.on(EventName.managedAccounts, (accountsList) => {
      clearTimeout(timer);
      done({ ok: true, accounts: String(accountsList || '').split(',').map((v) => v.trim()).filter(Boolean) });
    });
    api.reqManagedAccts();
  });
}

function probePositions() {
  return withApi((api, done) => {
    const rows = [];
    const timer = setTimeout(() => {
      try { api.cancelPositions(); } catch {}
      done({ ok: true, timeout: true, count: rows.length, rows });
    }, 12000);
    api.on(EventName.position, (account, contract, position, avgCost) => {
      rows.push({ account, conId: contract?.conId ?? null, symbol: contract?.symbol ?? null, position, avgCost });
    });
    api.on(EventName.positionEnd, () => {
      clearTimeout(timer);
      done({ ok: true, count: rows.length, rows });
    });
    api.on(EventName.error, (err, code, reqId) => {
      if ([2104, 2106, 2158].includes(Number(code))) return;
      clearTimeout(timer);
      done({ error: String(err), code, reqId, count: rows.length, rows });
    });
    api.reqPositions();
  });
}

function probeAccountSummary() {
  return withApi((api, done) => {
    const reqId = 11001;
    const rows = [];
    const timer = setTimeout(() => {
      try { api.cancelAccountSummary(reqId); } catch {}
      done({ ok: true, timeout: true, count: rows.length, rows });
    }, 12000);
    api.on(EventName.accountSummary, (rid, account, tag, value, currency) => {
      if (rid !== reqId) return;
      rows.push({ account, tag, value, currency });
    });
    api.on(EventName.accountSummaryEnd, (rid) => {
      if (rid !== reqId) return;
      clearTimeout(timer);
      done({ ok: true, count: rows.length, rows });
    });
    api.on(EventName.error, (err, code, rid) => {
      if (rid && rid !== reqId) return;
      if ([2104, 2106, 2158].includes(Number(code))) return;
      clearTimeout(timer);
      done({ error: String(err), code, reqId: rid, count: rows.length, rows });
    });
    api.reqAccountSummary(reqId, 'All', 'AccountType,NetLiquidation,TotalCashValue,SettledCash,BuyingPower,AvailableFunds,CashBalance');
  });
}

function probeOpenOrders() {
  return withApi((api, done) => {
    const rows = [];
    const timer = setTimeout(() => done({ ok: true, timeout: true, count: rows.length, rows }), 12000);
    api.on(EventName.openOrder, (orderId, contract, order, state) => {
      rows.push({ orderId, symbol: contract?.symbol ?? null, action: order?.action ?? null, status: state?.status ?? null });
    });
    api.on(EventName.openOrderEnd, () => {
      clearTimeout(timer);
      done({ ok: true, count: rows.length, rows });
    });
    api.on(EventName.error, (err, code, reqId) => {
      if ([2104, 2106, 2158].includes(Number(code))) return;
      clearTimeout(timer);
      done({ error: String(err), code, reqId, count: rows.length, rows });
    });
    api.reqOpenOrders();
  });
}

function probeExecutions() {
  return withApi((api, done) => {
    const reqId = 11002;
    const rows = [];
    const timer = setTimeout(() => done({ ok: true, timeout: true, count: rows.length, rows }), 12000);
    api.on(EventName.execDetails, (rid, contract, execution) => {
      if (rid !== reqId) return;
      rows.push({ execId: execution?.execId ?? null, symbol: contract?.symbol ?? null, side: execution?.side ?? null, shares: execution?.shares ?? null });
    });
    api.on(EventName.execDetailsEnd, (rid) => {
      if (rid !== reqId) return;
      clearTimeout(timer);
      done({ ok: true, count: rows.length, rows });
    });
    api.on(EventName.error, (err, code, rid) => {
      if (rid && rid !== reqId) return;
      if ([2104, 2106, 2158].includes(Number(code))) return;
      clearTimeout(timer);
      done({ error: String(err), code, reqId: rid, count: rows.length, rows });
    });
    api.reqExecutions(reqId, {});
  });
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
