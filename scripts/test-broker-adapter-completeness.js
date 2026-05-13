const Module = require('module');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const originalLoad = Module._load;
Module._load = function patched(request, parent, isMain) {
  if (request.endsWith('/config') || request === './config') {
    return {
      loadInteractiveBrokersConfig: () => ({
        mode: 'http',
        readonly: false,
        baseUrl: 'https://127.0.0.1:65535',
        host: '127.0.0.1',
        port: 4002,
        clientId: 7,
        accountId: 'DU123',
      }),
      validateInteractiveBrokersConfig: () => ({ ok: true, missing: [] }),
    };
  }
  if (request.endsWith('/shared/safeLogger') || request === '../shared/safeLogger') {
    return { logBrokerEvent: (payload) => payload };
  }
  if (request.endsWith('/types') || request === './types') {
    return {
      normaliseOrder: (value) => value,
      normaliseOrderQuote: (value) => value,
      normaliseCancelResult: (value) => value,
    };
  }
  if (request.endsWith('/nativeClient') || request === './nativeClient') {
    return { InteractiveBrokersNativeClient: class {} };
  }
  if (request.endsWith('/skillClient') || request === './skillClient') {
    return {
      InteractiveBrokersSkillClient: class {
        async authenticate() {
          return { ok: false, error: 'skill unavailable' };
        }
      },
    };
  }
  return originalLoad(request, parent, isMain);
};

const { InteractiveBrokersClient, aggregateExecutionFills } = require('../src/brokers/interactive-brokers/client');
Module._load = originalLoad;

async function main() {
  const client = new InteractiveBrokersClient({ portfolio: 'demo' });

  const blocked = await client.placeOrder({ symbol: 'VT', action: 'BUY', quantity: 1, orderType: 'MKT' }, { dryRun: false, revocableOnly: false });
  assert(blocked.ok === false, 'Expected blocked live order');
  assert(blocked.reason === 'policy_blocked', 'Expected policy_blocked reason');
  assert(blocked.diagnostics?.operation === 'place_order', 'Expected operation diagnostics');
  assert(blocked.diagnostics?.mode === 'skill', 'Expected skill-mode diagnostics when skill surface is present');

  const unavailableStatus = await client.getOrderStatus('abc');
  assert(unavailableStatus.ok === false, 'Expected unavailable status lookup');
  assert(unavailableStatus.reason === 'not_available', 'Expected not_available status lookup');
  assert(/current broker client mode/i.test(unavailableStatus.message), 'Expected clear status lookup message');
  assert(unavailableStatus.log?.status === 'not_available', 'Expected status lookup log');

  const auth = await client.authenticate();
  assert(auth.ok === false, 'Expected failed skill auth');
  assert(auth.diagnostics?.mode === 'skill', 'Expected skill-mode auth diagnostics');
  assert(auth.diagnostics?.reason === 'skill_error', 'Expected auth diagnostics');

  const fills = aggregateExecutionFills([
    { orderId: '11', shares: 2, price: 100, symbol: 'VT', currency: 'USD', time: '2026-05-06T08:00:00Z', execId: 'a' },
    { orderId: '11', shares: 1, price: 103, symbol: 'VT', currency: 'USD', time: '2026-05-06T08:01:00Z', execId: 'b' },
  ], '11');
  assert(fills.quantity === 3, 'Expected aggregated fill quantity');
  assert(fills.estimatedValue === 303, 'Expected aggregated fill value');
  assert(fills.avgFillPrice === 101, 'Expected rounded average fill price');

  console.log(JSON.stringify({ ok: true }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
