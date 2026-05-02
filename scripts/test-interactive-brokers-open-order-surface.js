const { InteractiveBrokersClient } = require('../src/brokers/interactive-brokers/client');

async function main() {
  const client = new InteractiveBrokersClient({ portfolio: 'etf' });

  const missingStatus = await client.getOrderStatus('999999999');

  let cancelBlocked = null;
  try {
    cancelBlocked = await client.cancelOrder('999999999');
  } catch (error) {
    cancelBlocked = {
      ok: false,
      reason: 'exception',
      error: error.message,
    };
  }

  console.log(JSON.stringify({ missingStatus, cancelBlocked }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
