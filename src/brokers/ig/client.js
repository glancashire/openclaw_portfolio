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

    return {
      ok: false,
      reason: 'not_implemented',
      log: logBrokerEvent({
        broker: 'ig',
        operation: 'authenticate',
        status: 'stub',
        summary: { configured: true, liveHttp: false },
        portfolio: this.options.portfolio,
      }),
    };
  }
}

module.exports = { IgApiClient };
