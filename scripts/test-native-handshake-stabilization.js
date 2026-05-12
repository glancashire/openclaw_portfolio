const assert = require('assert');
const { EventEmitter } = require('events');
const native = require('../src/brokers/interactive-brokers/nativeClient');

class FakeApi extends EventEmitter {
  connect() {}
  disconnect() {}
}

async function main() {
  const EventName = {
    nextValidId: 'nextValidId',
    managedAccounts: 'managedAccounts',
    connected: 'connected',
    error: 'error',
  };

  native.__setTestLoadIbModule(() => ({ EventName }));
  try {
    const api1 = new FakeApi();
    const p1 = native.waitForNativeHandshake(api1, { timeoutMs: 100, settleDelayMs: 10 });
    api1.emit(EventName.connected);
    api1.emit(EventName.managedAccounts, 'DU123');
    const r1 = await p1;
    assert.equal(r1.ok, true);
    assert.equal(r1.sawConnectionAck, true);
    assert.equal(r1.sawManagedAccounts, true);

    const api2 = new FakeApi();
    const p2 = native.waitForNativeHandshake(api2, { timeoutMs: 100, settleDelayMs: 10 });
    api2.emit(EventName.connected);
    const r2 = await p2;
    assert.equal(r2.ok, true);
    assert.equal(r2.sawConnectionAck, true);
    assert.equal(r2.sawValidId, false);
    assert.equal(r2.sawManagedAccounts, false);

    const api3 = new FakeApi();
    const p3 = native.waitForNativeHandshake(api3, { timeoutMs: 100, settleDelayMs: 10, requireConnectedAck: true });
    api3.emit(EventName.nextValidId, 101);
    await assert.rejects(p3, /Timed out waiting/);

    const api4 = new FakeApi();
    const p4 = native.waitForNativeHandshake(api4, { timeoutMs: 100, settleDelayMs: 10 });
    api4.emit(EventName.error, 'hard fail', 500, 1);
    await assert.rejects(p4, /hard fail/);

    const api5 = new FakeApi();
    const p5 = native.waitForNativeHandshake(api5, { timeoutMs: 100, settleDelayMs: 10 });
    api5.emit(EventName.error, 'farm connected', 2104, 0);
    api5.emit(EventName.connected);
    const r5 = await p5;
    assert.equal(r5.ok, true);
    assert.match(String(r5.lastIgnoredError || ''), /2104|farm connected/i);

    console.log(JSON.stringify({ ok: true }, null, 2));
  } finally {
    native.__resetTestLoadIbModule();
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
