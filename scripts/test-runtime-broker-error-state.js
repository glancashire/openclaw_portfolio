const { recordBrokerError, clearBrokerErrors, brokerErrorStatus } = require('../src/execution/runtimeState');

function main() {
  clearBrokerErrors('test-portfolio');
  const first = recordBrokerError({ portfolio: 'test-portfolio', reason: 'status_error', message: 'first failure' });
  const second = recordBrokerError({ portfolio: 'test-portfolio', reason: 'status_error', message: 'second failure' });
  const third = recordBrokerError({ portfolio: 'test-portfolio', reason: 'status_error', message: 'third failure' });
  const statusAfterThree = brokerErrorStatus('test-portfolio');
  clearBrokerErrors('test-portfolio');
  const statusAfterClear = brokerErrorStatus('test-portfolio');
  console.log(JSON.stringify({ first, second, third, statusAfterThree, statusAfterClear }, null, 2));
}

main();
