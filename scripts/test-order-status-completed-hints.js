const assert = require('assert');
const fs = require('fs');
const path = require('path');

function main() {
  const source = fs.readFileSync(path.resolve(process.cwd(), 'src/brokers/interactive-brokers/client.js'), 'utf8');
  assert(source.includes('No exact broker order id match was found, but completed-order hints are available.'), 'Expected completed-order hint message');
  assert(source.includes('completedOrders: symbolHints'), 'Expected completed-order hints payload');
  console.log(JSON.stringify({ ok: true }, null, 2));
}

main();
