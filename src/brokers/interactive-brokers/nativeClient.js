const { normalizeContractIntelligence } = require('./contractIntelligence');

let ibModule = null;
let testLoadIbModule = null;

function loadIbModule() {
  if (testLoadIbModule) return testLoadIbModule();
  if (!ibModule) {
    try {
      ibModule = require('@stoqey/ib');
    } catch (error) {
      error.message = `Missing optional native IB dependency @stoqey/ib: ${error.message}`;
      throw error;
    }
  }
  return ibModule;
}

const WAIT_FOR_POST_ACK_MS = 2500;

class InteractiveBrokersNativeClient {
  constructor(config, options = {}) {
    this.config = config;
    this.options = options || {};
  }

  async authenticate() {
    return this.withApi(async ({ connected }) => {
      await connected;
      return {
        ok: true,
        mode: 'native-socket',
        connected: true,
        host: this.config.host,
        port: this.config.port,
        clientId: this.config.clientId,
        readonly: this.config.readonly,
      };
    });
  }

  async fetchAccounts() {
    return this.withApi(async ({ api, connected }) => {
      await connected;
      return waitForManagedAccounts(api);
    });
  }

  async fetchPositions() {
    return this.withApi(async ({ api, connected }) => {
      await connected;
      return waitForPositions(api);
    });
  }

  async fetchLedger(accountId) {
    return this.withApi(async ({ api, connected }) => {
      await connected;
      const requestedGroup = !accountId || accountId === 'All' ? 'All' : 'All';
      const rows = await waitForAccountSummary(api, requestedGroup);
      if (!accountId || accountId === 'All') return rows;
      return rows.filter((row) => row.account === accountId);
    });
  }

  async fetchOpenOrders() {
    return this.withApi(async ({ api, connected }) => {
      await connected;
      return waitForOpenOrders(api);
    });
  }

  async searchContracts(query) {
    return this.withApi(async ({ api, connected }) => {
      await connected;
      return searchContractsViaDetails(api, query);
    });
  }

  async fetchMarketSnapshot(conids) {
    const list = Array.isArray(conids) ? conids.filter(Boolean) : [conids].filter(Boolean);
    if (!list.length) throw new Error('fetchMarketSnapshot requires at least one conid');
    return this.withApi(async ({ api, connected }) => {
      await connected;
      const results = [];
      for (const conid of list) {
        results.push(await waitForMarketSnapshot(api, buildConidContract(conid)));
      }
      return results;
    });
  }

  async placeOrder(order) {
    return this.withApi(async ({ api, connected }) => {
      await connected;
      return placeNativeOrder(api, order);
    }, {
      handshake: {
        timeoutMs: 15000,
        label: 'native order handshake',
        requireConnectedAck: false,
        requireNextValidId: true,
      },
    });
  }

  async withApi(fn, overrides = {}) {
    const { IBApi } = loadIbModule();
    const api = new IBApi({ host: this.config.host, port: this.config.port });
    const connected = waitForNativeHandshake(api, {
      timeoutMs: 15000,
      label: 'native handshake',
      ...this.options.handshake,
      ...(overrides.handshake || {}),
    });
    try {
      api.connect(this.config.clientId);
      return await fn({ api, connected });
    } finally {
      try { api.disconnect(); } catch {}
    }
  }
}

function waitForManagedAccounts(api) {
  return new Promise((resolve, reject) => {
    const onManaged = (accountsList) => {
      cleanup();
      resolve(String(accountsList || '').split(',').map((v) => v.trim()).filter(Boolean));
    };
    const onError = (err, code, reqId) => {
      cleanup();
      reject(normalizeError(err, code, reqId));
    };
    const cleanup = () => {
      clearTimeout(timer);
      const { EventName } = loadIbModule();
      api.off(EventName.managedAccounts, onManaged);
      api.off(EventName.error, onError);
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for managed accounts'));
    }, 10000);
    const { EventName } = loadIbModule();
    api.on(EventName.managedAccounts, onManaged);
    api.on(EventName.error, onError);
    api.reqManagedAccts();
  });
}

function waitForOpenOrders(api) {
  return new Promise((resolve, reject) => {
    const rows = [];
    const seen = new Set();
    const onOpenOrder = (orderId, contract, order, orderState) => {
      const key = String(orderId);
      if (seen.has(key)) return;
      seen.add(key);
      rows.push({
        orderId,
        permId: order?.permId ?? null,
        symbol: contract?.symbol || null,
        secType: contract?.secType || null,
        action: order?.action || null,
        orderType: order?.orderType || null,
        quantity: Number(order?.totalQuantity ?? 0),
        status: orderState?.status || null,
        filled: 0,
        remaining: Number(order?.totalQuantity ?? 0),
        limitPrice: Number.isFinite(Number(order?.lmtPrice)) ? Number(order.lmtPrice) : null,
        stopPrice: Number.isFinite(Number(order?.auxPrice)) ? Number(order.auxPrice) : null,
      });
    };
    const onEnd = () => {
      cleanup();
      resolve(rows);
    };
    const onError = (err, code, reqId) => {
      if (isIgnorableCode(code)) return;
      cleanup();
      reject(normalizeError(err, code, reqId));
    };
    const cleanup = () => {
      clearTimeout(timer);
      const { EventName } = loadIbModule();
      api.off(EventName.openOrder, onOpenOrder);
      api.off(EventName.openOrderEnd, onEnd);
      api.off(EventName.error, onError);
    };
    const timer = setTimeout(() => {
      cleanup();
      resolve(rows);
    }, 15000);
    const { EventName } = loadIbModule();
    api.on(EventName.openOrder, onOpenOrder);
    api.on(EventName.openOrderEnd, onEnd);
    api.on(EventName.error, onError);
    api.reqOpenOrders();
  });
}

function waitForPositions(api) {
  return new Promise((resolve, reject) => {
    const positions = [];
    let sawPosition = false;
    const onPosition = (account, contract, position, avgCost) => {
      sawPosition = true;
      positions.push({ account, contract, position, avgCost });
    };
    const onEnd = () => {
      cleanup();
      resolve(positions);
    };
    const onError = (err, code, reqId) => {
      if (isIgnorableCode(code)) return;
      cleanup();
      reject(normalizeError(err, code, reqId));
    };
    const cleanup = () => {
      clearTimeout(timer);
      try { api.cancelPositions(); } catch {}
      const { EventName } = loadIbModule();
      api.off(EventName.position, onPosition);
      api.off(EventName.positionEnd, onEnd);
      api.off(EventName.error, onError);
    };
    const timer = setTimeout(() => {
      cleanup();
      resolve(sawPosition ? positions : []);
    }, 15000);
    const { EventName } = loadIbModule();
    api.on(EventName.position, onPosition);
    api.on(EventName.positionEnd, onEnd);
    api.on(EventName.error, onError);
    api.reqPositions();
  });
}

function waitForAccountSummary(api, accountGroup) {
  return new Promise((resolve, reject) => {
    const reqId = nextRequestId();
    const rows = [];
    const tags = 'AccountType,NetLiquidation,TotalCashValue,SettledCash,BuyingPower,AvailableFunds,CashBalance';
    const onSummary = (incomingReqId, account, tag, value, currency) => {
      if (incomingReqId !== reqId) return;
      rows.push({ account, tag, value, currency });
    };
    const onEnd = (incomingReqId) => {
      if (incomingReqId !== reqId) return;
      cleanup();
      resolve(rows);
    };
    const onError = (err, code, incomingReqId) => {
      if (incomingReqId && incomingReqId !== reqId) return;
      if (isIgnorableCode(code)) return;
      cleanup();
      reject(normalizeError(err, code, incomingReqId));
    };
    const cleanup = () => {
      clearTimeout(timer);
      try { api.cancelAccountSummary(reqId); } catch {}
      const { EventName } = loadIbModule();
      api.off(EventName.accountSummary, onSummary);
      api.off(EventName.accountSummaryEnd, onEnd);
      api.off(EventName.error, onError);
    };
    const timer = setTimeout(() => {
      cleanup();
      resolve(rows);
    }, 15000);
    const { EventName } = loadIbModule();
    api.on(EventName.accountSummary, onSummary);
    api.on(EventName.accountSummaryEnd, onEnd);
    api.on(EventName.error, onError);
    api.reqAccountSummary(reqId, accountGroup, tags);
  });
}

async function searchContractsViaDetails(api, query) {
  const attempts = buildSearchContracts(query);
  const all = [];
  const seen = new Set();
  for (const contract of attempts) {
    const rows = await waitForContractDetails(api, contract);
    for (const row of rows) {
      const key = String(row.conid || '') || JSON.stringify([row.symbol, row.exchange, row.currency, row.name]);
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(row);
    }
    if (all.length) break;
  }
  return all;
}

function waitForContractDetails(api, contract) {
  return new Promise((resolve, reject) => {
    const reqId = nextRequestId();
    const rows = [];
    const onDetails = (incomingReqId, details) => {
      if (incomingReqId !== reqId) return;
      rows.push(normalizeContractDetails(details));
    };
    const onEnd = (incomingReqId) => {
      if (incomingReqId !== reqId) return;
      cleanup();
      resolve(rows);
    };
    const onError = (err, code, incomingReqId) => {
      if (incomingReqId && incomingReqId !== reqId) return;
      if (isIgnorableCode(code)) return;
      cleanup();
      reject(normalizeError(err, code, incomingReqId));
    };
    const cleanup = () => {
      clearTimeout(timer);
      const { EventName } = loadIbModule();
      api.off(EventName.contractDetails, onDetails);
      api.off(EventName.contractDetailsEnd, onEnd);
      api.off(EventName.error, onError);
    };
    const timer = setTimeout(() => {
      cleanup();
      resolve(rows);
    }, 15000);
    const { EventName } = loadIbModule();
    api.on(EventName.contractDetails, onDetails);
    api.on(EventName.contractDetailsEnd, onEnd);
    api.on(EventName.error, onError);
    api.reqContractDetails(reqId, contract);
  });
}

function waitForMarketSnapshot(api, contract) {
  return new Promise((resolve, reject) => {
    const reqId = nextRequestId();
    const state = { conid: String(contract.conId), currency: contract.currency || null };
    const onTickPrice = (incomingReqId, tickType, price) => {
      if (incomingReqId !== reqId) return;
      if (!Number.isFinite(price) || price <= 0) return;
      const { IBApiTickType } = loadIbModule();
      if (tickType === IBApiTickType.LAST || tickType === IBApiTickType.DELAYED_LAST) state['31'] = price;
      if (tickType === IBApiTickType.BID || tickType === IBApiTickType.DELAYED_BID) state['84'] = price;
      if (tickType === IBApiTickType.ASK || tickType === IBApiTickType.DELAYED_ASK) state['86'] = price;
      if (tickType === IBApiTickType.CLOSE || tickType === IBApiTickType.DELAYED_CLOSE) {
        state.close = price;
        state['7295'] = price;
      }
    };
    const onTickString = (incomingReqId, tickType, value) => {
      if (incomingReqId !== reqId) return;
      if (tickType === 45) state.lastTimestamp = value;
    };
    const onSnapshotEnd = (incomingReqId) => {
      if (incomingReqId !== reqId) return;
      cleanup();
      if (!state['31'] && state.close) state['31'] = state.close;
      state['85'] = state.currency || null;
      resolve(state);
    };
    const onError = (err, code, incomingReqId) => {
      if (incomingReqId && incomingReqId !== reqId) return;
      if (isIgnorableCode(code)) return;
      cleanup();
      reject(normalizeError(err, code, incomingReqId));
    };
    const cleanup = () => {
      clearTimeout(timer);
      try { api.cancelMktData(reqId); } catch {}
      const { EventName } = loadIbModule();
      api.off(EventName.tickPrice, onTickPrice);
      api.off(EventName.tickString, onTickString);
      api.off(EventName.tickSnapshotEnd, onSnapshotEnd);
      api.off(EventName.error, onError);
    };
    const timer = setTimeout(() => {
      cleanup();
      if (!state['31'] && state.close) state['31'] = state.close;
      state['85'] = state.currency || null;
      resolve(state);
    }, 15000);
    const { EventName } = loadIbModule();
    api.on(EventName.tickPrice, onTickPrice);
    api.on(EventName.tickString, onTickString);
    api.on(EventName.tickSnapshotEnd, onSnapshotEnd);
    api.on(EventName.error, onError);
    api.reqMarketDataType(3);
    api.reqMktData(reqId, contract, '', true, false);
  });
}

function waitForNativeHandshake(api, {
  timeoutMs = 15000,
  label = 'native handshake',
  settleDelayMs = 250,
  requireConnectedAck = false,
  requireNextValidId = false,
} = {}) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let sawValidId = false;
    let sawManagedAccounts = false;
    let sawConnectionAck = false;
    let lastIgnoredError = null;
    let settleTimer = null;

    const clearSettleTimer = () => {
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = null;
    };

    const finish = (value, isError = false) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (isError) reject(value);
      else resolve(value);
    };

    const buildSuccess = () => ({
      ok: true,
      sawValidId,
      sawManagedAccounts,
      sawConnectionAck,
      lastIgnoredError,
    });

    const hasHandshakeSignal = () => (sawValidId || sawManagedAccounts || sawConnectionAck);
    const hasStrongReadinessSignal = () => (sawValidId || sawManagedAccounts);

    const scheduleResolve = () => {
      if (!hasHandshakeSignal()) return;
      if (requireConnectedAck && !sawConnectionAck) return;
      if (requireNextValidId && !sawValidId) return;
      clearSettleTimer();
      if (hasStrongReadinessSignal()) {
        finish(buildSuccess());
        return;
      }
      settleTimer = setTimeout(() => {
        finish(buildSuccess());
      }, settleDelayMs);
    };

    const onNextValidId = (validOrderId) => {
      sawValidId = true;
      seedNextValidOrderId(validOrderId);
      scheduleResolve();
    };
    const onManagedAccounts = () => {
      sawManagedAccounts = true;
      scheduleResolve();
    };
    const onConnected = () => {
      sawConnectionAck = true;
      scheduleResolve();
    };
    const onError = (err, code, reqId) => {
      if (isIgnorableCode(code)) {
        lastIgnoredError = normalizeError(err, code, reqId).message;
        return;
      }
      finish(normalizeError(err, code, reqId), true);
    };
    const cleanup = () => {
      clearTimeout(timer);
      clearSettleTimer();
      const { EventName } = loadIbModule();
      api.off(EventName.nextValidId, onNextValidId);
      api.off(EventName.managedAccounts, onManagedAccounts);
      api.off(EventName.connected, onConnected);
      api.off(EventName.error, onError);
    };

    const timer = setTimeout(() => {
      finish(new Error(`Timed out waiting for ${label}`), true);
    }, timeoutMs);

    const { EventName } = loadIbModule();
    api.on(EventName.nextValidId, onNextValidId);
    api.on(EventName.managedAccounts, onManagedAccounts);
    api.on(EventName.connected, onConnected);
    api.on(EventName.error, onError);
  });
}

function buildSearchContracts(query) {
  const symbol = String(query || '').trim().toUpperCase();
  return [
    { symbol, secType: 'STK', exchange: 'SMART' },
    { symbol, secType: 'STK', exchange: 'SMART', primaryExch: 'LSEETF' },
    { symbol, secType: 'STK', exchange: 'SMART', primaryExch: 'LSE' },
    { symbol, secType: 'STK', exchange: 'LSEETF' },
    { symbol, secType: 'STK', exchange: 'LSE' },
    { symbol, secType: 'STK', exchange: 'AEB' },
    { symbol, secType: 'STK', exchange: 'SMART', primaryExch: 'AEB' },
    { localSymbol: symbol, secType: 'STK', exchange: 'LSEETF' },
    { localSymbol: symbol, secType: 'STK', exchange: 'LSE' },
    { localSymbol: symbol, secType: 'STK', exchange: 'AEB' },
    { symbol, secType: 'STK', exchange: 'SMART', primaryExch: 'EBS' },
    { symbol, secType: 'STK', exchange: 'SMART', primaryExch: 'SWB' },
  ];
}

function buildConidContract(conid, overrides = {}) {
  const contract = {
    conId: Number(conid),
    exchange: overrides.exchange || 'SMART',
    secType: overrides.secType || 'STK',
  };

  if (overrides.currency) contract.currency = overrides.currency;
  if (overrides.includeSymbol === true && overrides.symbol) contract.symbol = overrides.symbol;
  if (overrides.includePrimaryExch === true && overrides.primaryExch) contract.primaryExch = overrides.primaryExch;

  return contract;
}

function placeNativeOrder(api, order) {
  return new Promise((resolve, reject) => {
    const { EventName } = loadIbModule();
    const orderId = nextOrderId();
    const contract = buildConidContract(order?.conid, {
      exchange: order?.exchange || 'SMART',
      secType: order?.secType || 'STK',
      primaryExch: order?.primaryExchange || order?.primaryExch || undefined,
      includePrimaryExch: Boolean(order?.primaryExchange || order?.primaryExch),
    });
    const nativeOrder = {
      action: String(order?.action || '').toUpperCase(),
      orderType: String(order?.orderType || 'LMT').toUpperCase(),
      totalQuantity: Number(order?.quantity || 0),
      lmtPrice: Number(order?.limitPrice || 0),
      tif: String(order?.tif || 'DAY').toUpperCase(),
      outsideRth: order?.outsideRth === true,
      goodAfterTime: order?.goodAfterTime ? String(order.goodAfterTime) : '',
      goodTillDate: order?.goodTillDate ? String(order.goodTillDate) : '',
      transmit: order?.transmit === true,
    };

    let settled = false;
    let lastAck = buildAck({
      orderId,
      symbol: order?.symbol || null,
      secType: order?.secType || null,
      action: nativeOrder.action,
      orderType: nativeOrder.orderType,
      quantity: nativeOrder.totalQuantity,
      remaining: nativeOrder.totalQuantity,
      limitPrice: nativeOrder.lmtPrice,
      transmit: nativeOrder.transmit,
      status: 'Submitted',
    });

    const finish = (value, isError = false) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (isError) reject(value);
      else resolve(value);
    };

    const onOpenOrder = (incomingOrderId, incomingContract, incomingOrder, orderState) => {
      if (String(incomingOrderId) !== String(orderId)) return;
      lastAck = buildAck({
        orderId,
        permId: incomingOrder?.permId ?? null,
        symbol: incomingContract?.symbol || order?.symbol || null,
        secType: incomingContract?.secType || order?.secType || null,
        action: incomingOrder?.action || nativeOrder.action,
        orderType: incomingOrder?.orderType || nativeOrder.orderType,
        quantity: Number(incomingOrder?.totalQuantity ?? nativeOrder.totalQuantity),
        status: orderState?.status || incomingOrder?.status || 'Submitted',
        filled: 0,
        remaining: Number(incomingOrder?.totalQuantity ?? nativeOrder.totalQuantity),
        limitPrice: Number.isFinite(Number(incomingOrder?.lmtPrice)) ? Number(incomingOrder.lmtPrice) : nativeOrder.lmtPrice,
        transmit: incomingOrder?.transmit === true,
      });
      if (shouldResolveNow(lastAck.status)) finish(lastAck);
    };

    const onOrderStatus = (incomingOrderId, status, filled, remaining, avgFillPrice, permId) => {
      if (String(incomingOrderId) !== String(orderId)) return;
      lastAck = buildAck({
        orderId,
        permId: permId ?? null,
        symbol: order?.symbol || null,
        secType: order?.secType || null,
        action: nativeOrder.action,
        orderType: nativeOrder.orderType,
        quantity: nativeOrder.totalQuantity,
        status: status || 'Submitted',
        filled: Number(filled ?? 0),
        remaining: Number(remaining ?? nativeOrder.totalQuantity),
        avgFillPrice: Number.isFinite(Number(avgFillPrice)) ? Number(avgFillPrice) : null,
        limitPrice: nativeOrder.lmtPrice,
        transmit: nativeOrder.transmit === true,
      });
      if (shouldResolveNow(lastAck.status)) finish(lastAck);
    };

    const onError = (err, code, reqId) => {
      if (isIgnorableCode(code)) return;
      if (String(reqId || '') === String(orderId)) {
        lastAck = buildAck({
          ...lastAck,
          status: 'Inactive',
          brokerReason: 'broker_error',
          brokerErrorCode: code ?? null,
          brokerErrorMessage: normalizeError(err, code, reqId).message,
        });
        finish(lastAck);
        return;
      }
      finish(normalizeError(err, code, reqId), true);
    };

    const cleanup = () => {
      clearTimeout(timer);
      api.off(EventName.openOrder, onOpenOrder);
      api.off(EventName.orderStatus, onOrderStatus);
      api.off(EventName.error, onError);
    };

    const timer = setTimeout(() => finish(lastAck), WAIT_FOR_POST_ACK_MS);

    api.on(EventName.openOrder, onOpenOrder);
    api.on(EventName.orderStatus, onOrderStatus);
    api.on(EventName.error, onError);
    api.placeOrder(orderId, contract, nativeOrder);
  });
}

function buildAck(base = {}) {
  return {
    orderId: base.orderId,
    permId: base.permId ?? null,
    symbol: base.symbol || null,
    secType: base.secType || null,
    action: base.action || null,
    orderType: base.orderType || null,
    quantity: Number(base.quantity ?? 0),
    status: base.status || 'Submitted',
    filled: Number(base.filled ?? 0),
    remaining: Number(base.remaining ?? 0),
    avgFillPrice: Number.isFinite(Number(base.avgFillPrice)) ? Number(base.avgFillPrice) : null,
    limitPrice: Number.isFinite(Number(base.limitPrice)) ? Number(base.limitPrice) : null,
    transmit: base.transmit === true,
    brokerReason: base.brokerReason || null,
    brokerErrorCode: base.brokerErrorCode ?? null,
    brokerErrorMessage: base.brokerErrorMessage || null,
  };
}

function shouldResolveNow(status) {
  const raw = String(status || '').trim().toLowerCase();
  return ['inactive', 'cancelled', 'filled', 'submitted', 'presubmitted', 'api_pending', 'pending_submit', 'pendingcancel'].includes(raw);
}

function normalizeContractDetails(details) {
  const normalized = normalizeContractIntelligence(details);
  return {
    conid: normalized.conid,
    symbol: normalized.symbol,
    localSymbol: normalized.localSymbol,
    primaryExch: normalized.primaryExch,
    name: normalized.name,
    description: normalized.description,
    exchange: normalized.exchange,
    currency: normalized.currency,
    secType: normalized.secType,
    isin: normalized.isin,
    venue: normalized.venue,
    venueKey: normalized.venueKey,
    raw: details,
  };
}

function isIgnorableCode(code) {
  return [2104, 2106, 2158].includes(Number(code));
}

let requestCounter = 1;
let orderCounter = null;
function seedNextValidOrderId(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return;
  if (orderCounter == null || numeric > orderCounter) orderCounter = numeric;
}
function nextRequestId() {
  const next = requestCounter;
  requestCounter += 1;
  return next;
}
function nextOrderId() {
  if (orderCounter == null) throw new Error('IB native nextValidId was not received before placing order');
  const next = orderCounter;
  orderCounter += 1;
  return next;
}

function normalizeError(err, code, reqId) {
  if (err instanceof Error) return err;
  return new Error(`IB native error${code ? ` ${code}` : ''}${reqId ? ` reqId=${reqId}` : ''}: ${String(err)}`);
}

module.exports = {
  InteractiveBrokersNativeClient,
  buildConidContract,
  waitForNativeHandshake,
  normalizeContractDetails,
  __setTestLoadIbModule(fn) { testLoadIbModule = fn; },
  __resetTestLoadIbModule() { testLoadIbModule = null; },
};
