'use strict';

const { loadInteractiveBrokersConfig, redactInteractiveBrokersConfig, validateInteractiveBrokersConfig } = require('../brokers/interactive-brokers/config');
const { evaluateExecutionAuthority } = require('./executionAuthority');

async function evaluateEffectiveConfig({ portfolioDir } = {}) {
  const rawBrokerConfig = loadInteractiveBrokersConfig();
  const brokerConfig = redactInteractiveBrokersConfig(rawBrokerConfig);
  const brokerConfigStatus = validateInteractiveBrokersConfig(rawBrokerConfig);
  const executionAuthority = await evaluateExecutionAuthority({ portfolioDir });

  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    portfolio: executionAuthority.portfolio,
    brokerConfigStatus,
    brokerConfig,
    executionAuthority,
    effectiveConfig: {
      brokerMode: brokerConfig.mode,
      brokerRuntime: brokerConfig.runtime,
      readonly: brokerConfig.readonly,
      baseUrl: brokerConfig.baseUrl,
      host: brokerConfig.host,
      port: brokerConfig.port,
      executionMode: executionAuthority.executionMode,
      brokerAccountReference: executionAuthority.brokerAccountReference,
      liveExecutionPossibleNow: executionAuthority.effectiveAuthority.liveExecutionPossibleNow,
      requiresExplicitOperatorAction: executionAuthority.effectiveAuthority.requiresExplicitOperatorAction,
    },
  };
}

module.exports = {
  evaluateEffectiveConfig,
};
