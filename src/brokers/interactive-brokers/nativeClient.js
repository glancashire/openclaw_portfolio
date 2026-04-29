const { IBApi, EventName } = require('@stoqey/ib');

class InteractiveBrokersNativeClient {
  constructor(config) {
    this.config = config;
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
      return waitForAccountSummary(api, accountId || 'All');
    });
  }

  async withApi(fn) {
    const api = new IBApi({ host: this.config.host, port: this.config.port });
    const connected = waitForEvent(api, EventName.nextValidId, 10000);
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
      api.off(EventName.managedAccounts, onManaged);
      api.off(EventName.error, onError);
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for managed accounts'));
    }, 10000);
    api.on(EventName.managedAccounts, onManaged);
    api.on(EventName.error, onError);
    api.reqManagedAccts();
  });
}

function waitForPositions(api) {
  return new Promise((resolve, reject) => {
    const positions = [];
    const onPosition = (account, contract, position, avgCost) => {
      positions.push({ account, contract, position, avgCost });
    };
    const onEnd = () => {
      cleanup();
      resolve(positions);
    };
    const onError = (err, code, reqId) => {
      cleanup();
      reject(normalizeError(err, code, reqId));
    };
    const cleanup = () => {
      clearTimeout(timer);
      try { api.cancelPositions(); } catch {}
      api.off(EventName.position, onPosition);
      api.off(EventName.positionEnd, onEnd);
      api.off(EventName.error, onError);
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for positions'));
    }, 15000);
    api.on(EventName.position, onPosition);
    api.on(EventName.positionEnd, onEnd);
    api.on(EventName.error, onError);
    api.reqPositions();
  });
}

function waitForAccountSummary(api, accountGroup) {
  return new Promise((resolve, reject) => {
    const reqId = 9001;
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
      cleanup();
      reject(normalizeError(err, code, incomingReqId));
    };
    const cleanup = () => {
      clearTimeout(timer);
      try { api.cancelAccountSummary(reqId); } catch {}
      api.off(EventName.accountSummary, onSummary);
      api.off(EventName.accountSummaryEnd, onEnd);
      api.off(EventName.error, onError);
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for account summary'));
    }, 15000);
    api.on(EventName.accountSummary, onSummary);
    api.on(EventName.accountSummaryEnd, onEnd);
    api.on(EventName.error, onError);
    api.reqAccountSummary(reqId, accountGroup, tags);
  });
}

function waitForEvent(api, eventName, timeoutMs) {
  return new Promise((resolve, reject) => {
    const onEvent = (...args) => {
      cleanup();
      resolve(args);
    };
    const onError = (err, code, reqId) => {
      cleanup();
      reject(normalizeError(err, code, reqId));
    };
    const cleanup = () => {
      clearTimeout(timer);
      api.off(eventName, onEvent);
      api.off(EventName.error, onError);
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${eventName}`));
    }, timeoutMs);
    api.on(eventName, onEvent);
    api.on(EventName.error, onError);
  });
}

function normalizeError(err, code, reqId) {
  if (err instanceof Error) return err;
  return new Error(`IB native error${code ? ` ${code}` : ''}${reqId ? ` reqId=${reqId}` : ''}: ${String(err)}`);
}

module.exports = { InteractiveBrokersNativeClient };
