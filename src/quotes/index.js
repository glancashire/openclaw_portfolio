'use strict';

const { loadInteractiveBrokersConfig } = require('../brokers/interactive-brokers/config');
const ibkrWebApiProvider = require('./providers/ibkrWebApiProvider');
const ibkrTwsProvider = require('./providers/ibkrTwsProvider');
const yahooProvider = require('./providers/yahooProvider');
const { resolveQuoteWithRuntime, resolveQuotesWithRuntime, snapshotProviderHealth } = require('./serviceRuntime');

const PROVIDER_REGISTRY = Object.freeze({
  ibkr_web_api: ibkrWebApiProvider,
  ibkr_tws: ibkrTwsProvider,
  yahoo_last_close: yahooProvider,
});

const DEFAULT_PROVIDER_ORDER = Object.freeze(['ibkr_web_api', 'ibkr_tws', 'yahoo_last_close']);

function configuredProviderOrder() {
  const cfg = loadInteractiveBrokersConfig();
  const envOrder = String(process.env.QUOTE_PROVIDER_ORDER || '').trim();
  const raw = envOrder || String(cfg.quoteProviderOrder || '').trim();
  if (!raw) return DEFAULT_PROVIDER_ORDER.slice();
  const order = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .filter((value) => PROVIDER_REGISTRY[value]);
  return order.length ? order : DEFAULT_PROVIDER_ORDER.slice();
}

function providersFromOrder(order = configuredProviderOrder()) {
  return order.map((id) => PROVIDER_REGISTRY[id]).filter(Boolean);
}

function defaultProviders() {
  return providersFromOrder();
}

async function getQuote(context = {}, options = {}) {
  const providers = options.providers || defaultProviders();
  return resolveQuoteWithRuntime({ providers, context, options });
}

async function getQuotes(contexts = [], options = {}) {
  const providers = options.providers || defaultProviders();
  return resolveQuotesWithRuntime({ contexts, providers, options });
}

module.exports = {
  PROVIDER_REGISTRY,
  DEFAULT_PROVIDER_ORDER,
  configuredProviderOrder,
  providersFromOrder,
  defaultProviders,
  getQuote,
  getQuotes,
  snapshotProviderHealth,
};
