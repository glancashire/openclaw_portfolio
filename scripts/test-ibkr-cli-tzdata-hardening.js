const fs = require('fs');
const path = require('path');
const assert = require('assert');

function main() {
  const source = fs.readFileSync(path.resolve(process.cwd(), 'skills/ibkr/scripts/ibkr_cli.py'), 'utf8');
  assert(source.includes('Execution decoding failed because local Python timezone data is missing for an IBKR timestamp zone.'), 'Expected explicit executions tzdata failure message');
  assert(source.includes('Completed-order decoding failed because local Python timezone data is missing for an IBKR timestamp zone.'), 'Expected explicit completed-orders tzdata failure message');
  assert(source.includes('def normalize_rows(rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:'), 'Expected normalized row serializer helper');
  console.log(JSON.stringify({ ok: true }, null, 2));
}

main();
