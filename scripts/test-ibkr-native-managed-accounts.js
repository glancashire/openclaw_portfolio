'use strict';

const assert = require('assert');
const { EventEmitter } = require('events');
const native = require('../src/brokers/interactive-brokers/nativeClient');

class FakeApi extends EventEmitter {
  reqManagedAccts() {
    this.requested = true;
  }
}

async function main() {
  native.__setTestLoadIbModule(() => ({ EventName: { managedAccounts: 'managedAccounts', error: 'error' } }));
  try {
    {
      const api = new FakeApi();
      const promise = native.waitForManagedAccounts(api, { timeoutMs: 100 });
      process.nextTick(() => {
        api.emit('error', 'Market data farm connection is OK', 2104, 0);
        api.emit('managedAccounts', 'U25624150');
      });
      const accounts = await promise;
      assert.deepStrictEqual(accounts, ['U25624150']);
      assert.strictEqual(api.requested, true);
    }

    {
      const api = new FakeApi();
      const promise = native.waitForManagedAccounts(api, { timeoutMs: 100 });
      process.nextTick(() => {
        api.emit('error', 'fatal auth failure', 502, 0);
      });
      await assert.rejects(promise, /fatal auth failure/);
    }

    console.log(JSON.stringify({ ok: true }, null, 2));
  } finally {
    native.__resetTestLoadIbModule();
  }
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
