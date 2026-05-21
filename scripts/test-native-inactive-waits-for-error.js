const assert = require('assert');
const path = require('path');

const nativePath = path.resolve(process.cwd(), 'src/brokers/interactive-brokers/nativeClient.js');
delete require.cache[nativePath];
const native = require(nativePath);

class FakeApi {
  constructor() {
    this.handlers = new Map();
  }
  on(name, fn) {
    if (!this.handlers.has(name)) this.handlers.set(name, []);
    this.handlers.get(name).push(fn);
  }
  off(name, fn) {
    const arr = this.handlers.get(name) || [];
    this.handlers.set(name, arr.filter((item) => item !== fn));
  }
  emit(name, ...args) {
    for (const fn of this.handlers.get(name) || []) fn(...args);
  }
  placeOrder(orderId, contract, order) {
    setTimeout(() => {
      this.emit('orderStatus', orderId, 'Inactive', 0, order.totalQuantity, null, null, null, null, null, null);
      setTimeout(() => {
        this.emit('error', 'Order rejected - exchange is closed', 201, orderId);
      }, 25);
    }, 0);
  }
}

(async function main() {
  native.__setTestLoadIbModule({
    EventName: {
      openOrder: 'openOrder',
      orderStatus: 'orderStatus',
      error: 'error',
    },
  });
  native.__setTestNextOrderId(7001);

  const api = new FakeApi();
  const client = { rememberOrderError() {} };
  const result = await native.__testPlaceNativeOrder(api, {
    symbol: 'UBSPX',
    conid: '808613958',
    action: 'BUY',
    quantity: 8,
    orderType: 'LMT',
    limitPrice: 123.3,
    currency: 'EUR',
    exchange: 'SMART',
    secType: 'STK',
    transmit: true,
  }, client);

  assert.strictEqual(result.status, 'Inactive');
  assert.strictEqual(result.brokerErrorCode, 201);
  assert(/exchange is closed/i.test(String(result.brokerErrorMessage)), 'expected late error event to enrich inactive ack');
  console.log(JSON.stringify({ ok: true, result }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
