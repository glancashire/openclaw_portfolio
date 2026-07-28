'use strict';

// Phase C — quote-service boundary.
//
// A stable client facade that separates *what callers ask for* (a normalized
// quote, a batch of quotes, provider health) from *where it is computed*
// (in-process today, a long-lived local daemon later). Callers depend only on
// this contract; swapping transports must not change caller code.
//
// Contract (transport must implement):
//   async getQuote({ context, options })   -> normalized quote payload
//   async getQuotes({ contexts, options }) -> array of normalized quote payloads
//   async getProviderHealth()              -> array of provider-health snapshots
//   readonly kind                          -> transport id string (for diagnostics)
//
// Safety posture: this boundary is read-only. Quote reads never issue broker
// writes; broker order submission stays in the execution layer. A daemon
// transport MUST preserve that separation.

const {
  resolveQuoteWithRuntime,
  resolveQuotesWithRuntime,
} = require('./serviceRuntime');
const { snapshotProviderHealth } = require('./runtime');
const { defaultProviders } = require('./index');

/**
 * In-process transport: runs provider resolution in the current process using
 * the existing runtime (cache + provider health + cooldown). This is the
 * default and the reference implementation of the transport contract.
 */
function createInProcessTransport({ providers } = {}) {
  const resolveProviders = (options = {}) => options.providers || providers || defaultProviders();
  return {
    kind: 'in_process',
    async getQuote({ context = {}, options = {} } = {}) {
      return resolveQuoteWithRuntime({ providers: resolveProviders(options), context, options });
    },
    async getQuotes({ contexts = [], options = {} } = {}) {
      return resolveQuotesWithRuntime({ providers: resolveProviders(options), contexts, options });
    },
    async getProviderHealth() {
      return snapshotProviderHealth();
    },
  };
}

function assertTransport(transport) {
  for (const method of ['getQuote', 'getQuotes', 'getProviderHealth']) {
    if (typeof transport[method] !== 'function') {
      throw new TypeError(`Quote transport is missing required method: ${method}`);
    }
  }
  return transport;
}

/**
 * QuoteServiceClient — the single seam callers should depend on. Today it wraps
 * the in-process transport; a future daemon slots in by passing a transport
 * that speaks IPC/HTTP while honouring the same contract.
 */
class QuoteServiceClient {
  constructor({ transport } = {}) {
    this.transport = assertTransport(transport || createInProcessTransport());
  }

  get transportKind() {
    return this.transport.kind || 'unknown';
  }

  async getQuote(context = {}, options = {}) {
    return this.transport.getQuote({ context, options });
  }

  async getQuotes(contexts = [], options = {}) {
    return this.transport.getQuotes({ contexts, options });
  }

  async getProviderHealth() {
    return this.transport.getProviderHealth();
  }
}

let sharedClient = null;

/** Process-wide default client (in-process transport). */
function getQuoteServiceClient() {
  if (!sharedClient) sharedClient = new QuoteServiceClient();
  return sharedClient;
}

/** Test/daemon hook: swap the shared client's transport (or reset with null). */
function setQuoteServiceTransport(transport) {
  sharedClient = transport ? new QuoteServiceClient({ transport }) : null;
  return sharedClient;
}

module.exports = {
  QuoteServiceClient,
  createInProcessTransport,
  getQuoteServiceClient,
  setQuoteServiceTransport,
  assertTransport,
};
