const Module = require('module');
const path = require('path');
const assert = require('assert');

function withPatchedSkill(fn) {
  const target = path.resolve(process.cwd(), 'src/brokers/interactive-brokers/client.js');
  const original = Module._load;
  delete require.cache[target];
  Module._load = function(request, parent, isMain) {
    if (request === './config' || request.endsWith('/interactive-brokers/config')) {
      return {
        loadInteractiveBrokersConfig: () => ({ mode: 'skill', readonly: false, host: '127.0.0.1', port: 4002, clientId: 7, accountId: 'UTEST123', baseUrl: 'https://localhost:5000/v1/api' }),
        validateInteractiveBrokersConfig: () => ({ ok: true, missing: [] }),
      };
    }
    if (request === './skillClient' || request.endsWith('/interactive-brokers/skillClient')) {
      return {
        InteractiveBrokersSkillClient: class {
          async placeOrder(order, { transmit = true } = {}) {
            return {
              ok: true,
              trade: {
                orderId: 9090,
                status: transmit ? 'Submitted' : 'PreSubmitted',
                side: order.action,
                symbol: order.symbol,
                quantity: order.quantity,
                limitPrice: order.limitPrice,
                currency: order.currency,
                transmit,
              },
              errors: [],
            };
          }
          async fetchMarketSnapshot() {
            return [{ '31': 38.5, '84': 38.4, '85': 'EUR', '86': 38.5 }];
          }
        },
      };
    }
    if (request === './nativeClient' || request.endsWith('/interactive-brokers/nativeClient')) {
      return { InteractiveBrokersNativeClient: class {} };
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
  await withPatchedSkill(async (InteractiveBrokersClient) => {
    const client = new InteractiveBrokersClient({ portfolio: 'etf' });

    const blocked = await client.placeOrder({
      symbol: 'EMUAA',
      conid: '243939970',
      action: 'BUY',
      orderType: 'LMT',
      quantity: 1,
      limitPrice: 38.5,
      currency: 'EUR',
      exchange: 'SMART',
      secType: 'STK',
    }, { dryRun: false, revocableOnly: true, transmitLive: true });
    assert(blocked.ok === false, 'Expected missing explicit transmit intent to block transmitted live path');
    assert(blocked.reason === 'policy_blocked', `Expected policy_blocked, got ${blocked.reason}`);

    const staged = await client.placeOrder({
      symbol: 'EMUAA',
      conid: '243939970',
      action: 'BUY',
      orderType: 'LMT',
      quantity: 1,
      limitPrice: 38.5,
      currency: 'EUR',
      exchange: 'SMART',
      secType: 'STK',
    }, { dryRun: false, revocableOnly: true, transmitLive: false });
    assert(staged.ok === true, 'Expected staged path to remain available');
    assert(staged.mode === 'staged_not_transmitted', `Expected staged_not_transmitted mode, got ${staged.mode}`);
    assert(staged.order.transmit === false, 'Expected staged order transmit=false');

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
    assert(transmitted.ok === true, 'Expected transmitted live path to succeed with explicit intent');
    assert(transmitted.mode === 'transmitted_live', `Expected transmitted_live mode, got ${transmitted.mode}`);
    assert(transmitted.submitted === true, 'Expected transmitted path to mark submitted=true');
    assert(transmitted.order.transmit === true, 'Expected transmitted order transmit=true');
    assert(transmitted.log.status === 'transmitted_live', `Expected transmitted log status, got ${transmitted.log.status}`);
  });

  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
