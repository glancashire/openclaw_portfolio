const Module = require('module');
const path = require('path');
const assert = require('assert');

function withPatchedNative(fn) {
  const target = path.resolve(process.cwd(), 'src/brokers/interactive-brokers/client.js');
  const original = Module._load;
  delete require.cache[target];
  Module._load = function(request, parent, isMain) {
    if (request === './config' || request.endsWith('/interactive-brokers/config')) {
      return {
        loadInteractiveBrokersConfig: () => ({ mode: 'native', readonly: false, host: '127.0.0.1', port: 4001, clientId: 7, accountId: 'UTEST123', baseUrl: 'https://localhost:5000/v1/api' }),
        validateInteractiveBrokersConfig: () => ({ ok: true, missing: [] }),
      };
    }
    if (request === './skillClient' || request.endsWith('/interactive-brokers/skillClient')) {
      return { InteractiveBrokersSkillClient: class {} };
    }
    if (request === './nativeClient' || request.endsWith('/interactive-brokers/nativeClient')) {
      return {
        InteractiveBrokersNativeClient: class {
          async placeOrder(order) {
            return {
              orderId: 6124,
              status: 'Inactive',
              action: order.action,
              identifier: order.conid,
              symbol: order.symbol,
              quantity: order.quantity,
              limitPrice: order.limitPrice,
              estimatedValue: Number(order.quantity) * Number(order.limitPrice),
              currency: order.currency,
              transmit: true,
              brokerReason: 'broker_error',
              brokerErrorCode: 201,
              brokerErrorMessage: 'IB native error 201 reqId=6124: Order rejected - exchange is closed',
            };
          }
          async fetchMarketSnapshot() {
            return [{ '31': 38.5, '84': 38.4, '85': 'EUR', '86': 38.5 }];
          }
        },
      };
    }
    return original.apply(this, arguments);
  };
  try {
    const { InteractiveBrokersClient } = require(target);
    return fn(InteractiveBrokersClient);
  } finally {
    Module._load = original;
  }
}

(async () => {
  await withPatchedNative(async (InteractiveBrokersClient) => {
    const client = new InteractiveBrokersClient({ portfolio: 'etf' });
    const transmitted = await client.placeOrder({
      symbol: 'EMUAA',
      conid: '243939970',
      action: 'BUY',
      orderType: 'LMT',
      quantity: 1,
      limitPrice: 38.5,
      currency: 'EUR',
      exchange: 'SMART',
      secType: 'STK',
      transmit: true,
    }, { dryRun: false, revocableOnly: true, transmitLive: true });
    assert(transmitted.ok === true, 'Expected transmitted live native path to succeed');
    assert(transmitted.mode === 'transmitted_live', `Expected transmitted_live mode, got ${transmitted.mode}`);
    assert(transmitted.order.status === 'Inactive', `Expected Inactive status, got ${transmitted.order.status}`);
    assert(transmitted.order.brokerErrorCode === 201, `Expected brokerErrorCode 201, got ${transmitted.order.brokerErrorCode}`);
    assert(/exchange is closed/i.test(String(transmitted.order.brokerErrorMessage)), 'Expected native broker error message to survive client surface');
  });

  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
