const fs = require('fs');
const path = require('path');
const assert = require('assert');

function main() {
  const source = fs.readFileSync(path.resolve(process.cwd(), 'src/brokers/interactive-brokers/nativeClient.js'), 'utf8');
  assert(source.includes('if (overrides.includeSymbol === true && overrides.symbol) contract.symbol = overrides.symbol;'), 'Expected symbol to be opt-in only for conid contracts');
  assert(source.includes('if (overrides.includePrimaryExch === true && overrides.primaryExch) contract.primaryExch = overrides.primaryExch;'), 'Expected primaryExch to be opt-in only for conid contracts');
  assert(source.includes("const contract = buildConidContract(order?.conid, {\n      exchange: order?.exchange || 'SMART',\n      secType: order?.secType || 'STK',\n      currency: order?.currency || undefined,\n    });"), 'Expected native order placement to build conid contracts without symbol/primaryExch overrides');
  console.log(JSON.stringify({ ok: true }, null, 2));
}

main();
