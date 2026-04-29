const { loadInteractiveBrokersConfig, validateInteractiveBrokersConfig } = require('./config');
const { logBrokerEvent } = require('../shared/safeLogger');

class InteractiveBrokersClient {
  constructor(options = {}) {
    this.options = options;
    this.config = loadInteractiveBrokersConfig();
    this.baseUrl = this.config.baseUrl;
  }

  configurationStatus() {
    return validateInteractiveBrokersConfig(this.config);
  }

  async authenticate() {
    const status = this.configurationStatus();
    if (!status.ok) {
      return blocked('missing_config', status.missing, this.options.portfolio);
    }

    // IBKR Client Portal / Gateway auth is session-based and commonly fronted by a local gateway.
    // For the MVP, we validate reachability and auth-status endpoints before trading/account operations.
    try {
      const authStatus = await this.request('/iserver/auth/status');
      return {
        ok: true,
        mode: 'session-status',
        authStatus,
        log: logBrokerEvent({
          broker: 'interactive-brokers',
          operation: 'authenticate',
          status: 'ok',
          summary: { authenticated: authStatus?.authenticated ?? null },
          portfolio: this.options.portfolio,
        }),
      };
    } catch (error) {
      return {
        ok: false,
        reason: 'http_error',
        error: error.message,
        log: logBrokerEvent({
          broker: 'interactive-brokers',
          operation: 'authenticate',
          status: 'http_error',
          summary: { message: error.message },
          portfolio: this.options.portfolio,
        }),
      };
    }
  }

  async request(path, { method = 'GET', body } = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`IBKR request failed (${response.status}): ${text}`);
    }
    return safeJson(text);
  }

  async sessionStatus() {
    return this.request('/tickle');
  }

  async fetchAuthStatus() {
    return this.request('/iserver/auth/status');
  }

  async fetchAccounts() {
    return this.request('/portfolio/accounts');
  }

  async fetchLedger(accountId) {
    if (!accountId) throw new Error('fetchLedger requires accountId');
    return this.request(`/portfolio/${encodeURIComponent(accountId)}/ledger`);
  }

  async searchContracts(query) {
    if (!query) throw new Error('searchContracts requires query');
    return this.request(`/iserver/secdef/search?symbol=${encodeURIComponent(query)}`);
  }

  async fetchMarketSnapshot(conids, fields = ['31', '84', '85', '86']) {
    const list = Array.isArray(conids) ? conids.filter(Boolean).join(',') : String(conids || '');
    if (!list) throw new Error('fetchMarketSnapshot requires at least one conid');
    const fieldList = Array.isArray(fields) ? fields.join(',') : String(fields || '31,84,85,86');
    return this.request(`/iserver/marketdata/snapshot?conids=${encodeURIComponent(list)}&fields=${encodeURIComponent(fieldList)}`);
  }

  async fetchPositions(accountId) {
    if (!accountId) throw new Error('fetchPositions requires accountId');
    return this.request(`/portfolio/${encodeURIComponent(accountId)}/positions/0`);
  }
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function blocked(reason, missing, portfolio) {
  return {
    ok: false,
    reason,
    missing,
    log: logBrokerEvent({
      broker: 'interactive-brokers',
      operation: 'authenticate',
      status: 'blocked',
      summary: { missing },
      portfolio,
    }),
  };
}

module.exports = { InteractiveBrokersClient };
