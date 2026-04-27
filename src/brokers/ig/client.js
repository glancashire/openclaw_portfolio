const { loadIgConfig, validateIgConfig } = require('./config');
const { logBrokerEvent } = require('../shared/safeLogger');

class IgApiClient {
  constructor(options = {}) {
    this.options = options;
    this.config = loadIgConfig();
    this.session = null;
    this.baseUrl = options.baseUrl || 'https://demo-api.ig.com/gateway/deal';
  }

  configurationStatus() {
    return validateIgConfig(this.config);
  }

  async authenticate() {
    const status = this.configurationStatus();
    if (!status.ok) {
      return {
        ok: false,
        reason: 'missing_config',
        missing: status.missing,
        log: logBrokerEvent({
          broker: 'ig',
          operation: 'authenticate',
          status: 'blocked',
          summary: { missing: status.missing },
          portfolio: this.options.portfolio,
        }),
      };
    }

    const body = {
      identifier: this.config.identifier,
      password: this.config.password,
    };

    const response = await fetch(`${this.baseUrl}/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'Accept': 'application/json; charset=UTF-8',
        'X-IG-API-KEY': this.config.apiKey,
        'Version': '2',
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    const cst = response.headers.get('CST') || '';
    const xSecurityToken = response.headers.get('X-SECURITY-TOKEN') || '';

    if (!response.ok) {
      return {
        ok: false,
        reason: 'http_error',
        statusCode: response.status,
        body: text,
        log: logBrokerEvent({
          broker: 'ig',
          operation: 'authenticate',
          status: 'http_error',
          summary: { statusCode: response.status },
          portfolio: this.options.portfolio,
        }),
      };
    }

    this.session = {
      cst,
      xSecurityToken,
      accountId: this.config.accountId || '',
      body: safeJson(text),
    };

    return {
      ok: true,
      accountId: this.session.accountId || null,
      sessionEstablished: Boolean(cst && xSecurityToken),
      log: logBrokerEvent({
        broker: 'ig',
        operation: 'authenticate',
        status: 'ok',
        summary: { sessionEstablished: Boolean(cst && xSecurityToken) },
        portfolio: this.options.portfolio,
      }),
    };
  }

  async request(method, path, { version = '1', body } = {}) {
    if (!this.session?.cst || !this.session?.xSecurityToken) {
      throw new Error('IG session not established. Call authenticate() first.');
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Accept': 'application/json; charset=UTF-8',
        'Content-Type': 'application/json; charset=UTF-8',
        'X-IG-API-KEY': this.config.apiKey,
        'CST': this.session.cst,
        'X-SECURITY-TOKEN': this.session.xSecurityToken,
        'Version': version,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`IG request failed (${response.status}): ${text}`);
    }
    return safeJson(text);
  }

  async fetchAccounts() {
    return this.request('GET', '/accounts', { version: '1' });
  }

  async fetchPositions() {
    return this.request('GET', '/positions', { version: '2' });
  }
}

function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

module.exports = { IgApiClient };
