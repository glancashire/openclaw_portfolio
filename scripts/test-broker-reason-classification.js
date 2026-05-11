const assert = require('assert');
const { classifyBrokerOrderBlock } = require('../src/execution/tradeState');

function main() {
  const closed = classifyBrokerOrderBlock({
    status: 'Inactive',
    brokerErrorCode: 201,
    brokerErrorMessage: 'IB native error 201 reqId=9105: Order rejected - exchange is closed',
  }, 'inactive');
  assert.strictEqual(closed.blockCode, 'exchange_closed_at_submit');
  assert(/exchange was closed at submission time/i.test(closed.blockReason));
  assert(/retry during the venue trading session/i.test(closed.nextAction));

  const contract = classifyBrokerOrderBlock({
    status: 'cancelled',
    brokerErrorMessage: 'No security definition has been found for the request',
  }, 'cancelled');
  assert.strictEqual(contract.blockCode, 'contract_resolution_failed');

  const funds = classifyBrokerOrderBlock({
    status: 'failed',
    brokerErrorMessage: 'Insufficient funds / buying power',
  }, 'failed');
  assert.strictEqual(funds.blockCode, 'insufficient_funds_or_buying_power');

  const empty = classifyBrokerOrderBlock({ status: 'submitted' }, 'submitted');
  assert.strictEqual(empty.blockCode, '');

  console.log(JSON.stringify({ ok: true, closed, contract, funds }, null, 2));
}

main();
