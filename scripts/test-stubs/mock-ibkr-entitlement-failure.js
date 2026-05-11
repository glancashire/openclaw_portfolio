'use strict';

const Module = require('module');
const path = require('path');

const pricingPath = path.join(process.cwd(), 'src', 'brokers', 'interactive-brokers', 'pricing.js');
const originalLoad = Module._load;

Module._load = function(request, parent, isMain) {
  const resolved = Module._resolveFilename(request, parent, isMain);
  if (resolved === pricingPath) {
    const actual = originalLoad.apply(this, arguments);
    return {
      ...actual,
      fetchLatestPrice: async ({ conid }) => ({
        ok: false,
        conid,
        reason: 'http_error',
        error: 'Requested market data is not subscribed. Displaying delayed market data.',
      }),
    };
  }
  return originalLoad.apply(this, arguments);
};
