const { loadInteractiveBrokersConfig, validateInteractiveBrokersConfig } = require('./config');
const { logBrokerEvent } = require('../shared/safeLogger');

class InteractiveBrokersClient {
  constructor(options = {}) {
    this.options = options;
    this.config = loadInteractiveBrokersConfig();
  }

  configurationStatus() {
    return validateInteractiveBrokersConfig(this.config);
  }

  async authenticate() {
    const status = this.configurationStatus();
    if (!status.ok) {
      return {
        ok: false,
        reason: 'missing_config',
        missing: status.missing,
        log: logBrokerEvent({
          broker: 'interactive-brokers',
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
        broker: 'interactive-brokers',
        operation: 'authenticate',
        status: 'stub',
        summary: { configured: true, liveHttp: false },
        portfolio: this.options.portfolio,
      }),
    };
  }
}

module.exports = { InteractiveBrokersClient };
