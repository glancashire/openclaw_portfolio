const { loadInteractiveBrokersConfig, validateInteractiveBrokersConfig } = require('./config');
const { logBrokerEvent } = require('../shared/safeLogger');
const { InteractiveBrokersNativeClient } = require('./nativeClient');
const { InteractiveBrokersSkillClient } = require('./skillClient');

class InteractiveBrokersClient {
  constructor(options = {}) {
    this.options = options;
    this.config = loadInteractiveBrokersConfig();
    this.baseUrl = this.config.baseUrl;
    this.native = this.config.mode === 'native' ? new InteractiveBrokersNativeClient(this.config) : null;
    this.skill = this.config.mode === 'skill' ? new InteractiveBrokersSkillClient(this.config) : null;
  }

  configurationStatus() {
    return validateInteractiveBrokersConfig(this.config);
  }

  async authenticate() {
    const status = this.configurationStatus();
    if (!status.ok) {
      return blocked('missing_config', status.missing, this.options.portfolio);
    }

    if (this.native) {
      try {
        const nativeStatus = await this.native.authenticate();
        return {
          ok: true,
          mode: 'native-socket',
          authStatus: nativeStatus,
          log: logBrokerEvent({
            broker: 'interactive-brokers',
            operation: 'authenticate',
            status: 'ok',
            summary: { connected: nativeStatus?.connected ?? null, mode: 'native' },
            portfolio: this.options.portfolio,
          }),
        };
      } catch (error) {
        return {
          ok: false,
          reason: 'native_error',
          error: error.message,
          log: logBrokerEvent({
            broker: 'interactive-brokers',
            operation: 'authenticate',
            status: 'native_error',
            summary: { message: error.message },
            portfolio: this.options.portfolio,
          }),
        };
      }
    }

    if (this.skill) {
      const skillStatus = await this.skill.authenticate();
      if (skillStatus.ok) {
        return {
          ok: true,
          mode: 'skill-ib_insync',
          authStatus: skillStatus,
          log: logBrokerEvent({
            broker: 'interactive-brokers',
            operation: 'authenticate',
            status: 'ok',
            summary: { connected: true, mode: 'skill' },
            portfolio: this.options.portfolio,
          }),
        };
      }
      return {
        ok: false,
        reason: 'skill_error',
        error: skillStatus.error,
        log: logBrokerEvent({
          broker: 'interactive-brokers',
          operation: 'authenticate',
          status: 'skill_error',
          summary: { message: skillStatus.error },
          portfolio: this.options.portfolio,
        }),
      };
    }

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
    const previousTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    const relaxTls = this.baseUrl.startsWith('https://localhost') || this.baseUrl.startsWith('https://127.0.0.1');
    if (relaxTls) process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    try {
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
    } finally {
      if (relaxTls) {
        if (previousTls === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
        else process.env.NODE_TLS_REJECT_UNAUTHORIZED = previousTls;
      }
    }
  }

  async sessionStatus() {
    return this.request('/tickle');
  }

  async fetchAuthStatus() {
    return this.request('/iserver/auth/status');
  }

  async fetchAccounts() {
    if (this.native) return this.native.fetchAccounts();
    if (this.skill) return this.skill.fetchAccounts();
    return this.request('/portfolio/accounts');
  }

  async fetchLedger(accountId) {
    if (!accountId) throw new Error('fetchLedger requires accountId');
    if (this.native) return this.native.fetchLedger(accountId);
    if (this.skill) return this.skill.fetchLedger(accountId);
    return this.request(`/portfolio/${encodeURIComponent(accountId)}/ledger`);
  }

  async searchContracts(query) {
    if (!query) throw new Error('searchContracts requires query');
    if (this.native) return this.native.searchContracts(query);
    if (this.skill) return this.skill.searchContracts(query);
    return this.request(`/iserver/secdef/search?symbol=${encodeURIComponent(query)}`);
  }

  async fetchMarketSnapshot(conids, fields = ['31', '84', '85', '86']) {
    const list = Array.isArray(conids) ? conids.filter(Boolean).join(',') : String(conids || '');
    if (!list) throw new Error('fetchMarketSnapshot requires at least one conid');
    if (this.native) return this.native.fetchMarketSnapshot(Array.isArray(conids) ? conids : [conids], fields);
    if (this.skill) return this.skill.fetchMarketSnapshot(Array.isArray(conids) ? conids : [conids], fields);
    const fieldList = Array.isArray(fields) ? fields.join(',') : String(fields || '31,84,85,86');
    return this.request(`/iserver/marketdata/snapshot?conids=${encodeURIComponent(list)}&fields=${encodeURIComponent(fieldList)}`);
  }

  async fetchPositions(accountId) {
    if (this.native) return this.native.fetchPositions(accountId);
    if (this.skill) return this.skill.fetchPositions(accountId);
    if (!accountId) throw new Error('fetchPositions requires accountId');
    return this.request(`/portfolio/${encodeURIComponent(accountId)}/positions/0`);
  }

  assertWritable(action = 'broker write') {
    if (this.config.readonly) {
      throw new Error(`Interactive Brokers is configured readonly=true; refusing ${action}`);
    }
  }

  async getOrderQuote(order) {
    this.assertWritable('order quote');
    return {
      ok: false,
      reason: 'not_implemented',
      message: 'Interactive Brokers order quoting is not implemented yet.',
      order,
    };
  }

  async placeOrder(order, { dryRun = true } = {}) {
    if (dryRun !== true) this.assertWritable('live order placement');
    return {
      ok: false,
      reason: 'not_implemented',
      dryRun,
      message: dryRun
        ? 'Interactive Brokers dry-run order placement is not implemented yet.'
        : 'Interactive Brokers live order placement is not implemented yet.',
      order,
    };
  }

  async getOrderStatus(orderId) {
    return {
      ok: false,
      reason: 'not_implemented',
      message: 'Interactive Brokers order status lookup is not implemented yet.',
      orderId,
    };
  }

  async cancelOrder(orderId) {
    this.assertWritable('order cancellation');
    return {
      ok: false,
      reason: 'not_implemented',
      message: 'Interactive Brokers order cancellation is not implemented yet.',
      orderId,
    };
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
