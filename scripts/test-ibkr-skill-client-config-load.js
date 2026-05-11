const assert = require('assert');
const { InteractiveBrokersSkillClient } = require('../src/brokers/interactive-brokers/skillClient');

function main() {
  const client = new InteractiveBrokersSkillClient({ portfolio: 'etf' });
  assert(client.config, 'Expected resolved config');
  assert(client.config.host, 'Expected host to be loaded from broker config');
  assert(Number.isInteger(Number(client.config.port)), `Expected numeric port, got ${client.config.port}`);
  assert(Number.isInteger(Number(client.config.clientId)), `Expected numeric clientId, got ${client.config.clientId}`);
  console.log(JSON.stringify({ ok: true, config: { host: client.config.host, port: client.config.port, clientId: client.config.clientId } }, null, 2));
}

main();
