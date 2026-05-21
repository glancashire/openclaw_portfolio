const assert = require('assert');
const { InteractiveBrokersClient } = require('../src/brokers/interactive-brokers/client');

async function main() {
  const client = new InteractiveBrokersClient({ portfolio: 'etf' });
  client.native = {
    recentOrderError(orderId) {
      if (String(orderId) !== '9119') return null;
      return {
        orderId: 9119,
        status: 'Inactive',
        brokerReason: 'broker_error',
        brokerErrorCode: 201,
        brokerErrorMessage: 'IB native error 201 reqId=9119: Order rejected - exchange is closed',
      };
    },
    clearOrderError() {},
    fetchOpenOrders: async () => [],
  };
  client.skill = {
    fetchOpenOrders: async () => [],
    fetchExecutions: async () => [],
    fetchCompletedOrders: async () => [],
  };

  const result = await client.getOrderStatus(9119);
  assert.strictEqual(result.ok, true, 'expected fallback status lookup to succeed');
  assert.strictEqual(result.source, 'native_recent_error');
  assert.strictEqual(result.order.status, 'Inactive');
  assert.strictEqual(result.order.brokerErrorCode, 201);
  assert(/exchange is closed/i.test(String(result.order.brokerErrorMessage)), 'expected native broker error message to survive fallback');
  console.log(JSON.stringify({ ok: true, source: result.source, order: result.order }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
