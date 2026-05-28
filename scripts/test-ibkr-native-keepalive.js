const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { main, classify, probeNativeData } = require('./ibkr-native-keepalive');


const RealDate = Date;
class FakeDate extends RealDate {
  constructor(...args) {
    super(...(args.length ? args : ['2026-05-28T12:00:00Z']));
  }
  static now() { return new RealDate('2026-05-28T12:00:00Z').getTime(); }
  static parse(value) { return RealDate.parse(value); }
  static UTC(...args) { return RealDate.UTC(...args); }
}
global.Date = FakeDate;

(async function run() {
  const tmpDir = path.join(__dirname, '..', 'runtime', 'test-ibkr-keepalive');
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  assert.strictEqual(classify({ authenticated: true, reachable: true, fallbackRequired: false }, 'down'), 'ready');
  assert.strictEqual(classify({ authenticated: false, reachable: false, fallbackRequired: true }, 'launcher_waiting'), 'awaiting_login_or_2fa');
  assert.strictEqual(classify({ authenticated: false, reachable: false, fallbackRequired: true }, 'down'), 'down');

  const readyProbe = await probeNativeData({
    portfolio: 'etf',
    getReadiness: async () => ({ authenticated: true, reachable: true, fallbackRequired: false, marketDataProbe: { conid: '1' } }),
  });
  assert.strictEqual(readyProbe.status, 'ready');

  const unpricedProbe = await probeNativeData({
    portfolio: 'etf',
    getReadiness: async () => ({ authenticated: true, reachable: true, fallbackRequired: true, marketDataDetail: 'no usable price fields', marketDataProbe: null }),
  });
  assert.strictEqual(unpricedProbe.status, 'up_but_unpriced');

  let mailedDown = 0;
  const downResult = await main({
    workspace: tmpDir,
    restartWaitMs: 0,
    detectGatewayState: () => 'down',
    getReadiness: async () => ({ authenticated: false, reachable: false, fallbackRequired: true, reason: 'native_error', message: 'down', guidance: 'restore gateway' }),
    sendEmail: async () => { mailedDown += 1; },
  });
  assert.strictEqual(downResult.ok, false);
  assert.strictEqual(downResult.restarted, false);
  assert.strictEqual(downResult.mailed, true);
  assert.strictEqual(mailedDown, 1, 'expected one down notification mail');

  const secondDownResult = await main({
    workspace: tmpDir,
    restartWaitMs: 0,
    detectGatewayState: () => 'down',
    getReadiness: async () => ({ authenticated: false, reachable: false, fallbackRequired: true, reason: 'native_error', message: 'down', guidance: 'restore gateway' }),
    sendEmail: async () => { mailedDown += 1; },
  });
  assert.strictEqual(secondDownResult.mailed, false, 'expected no duplicate down mail once already sent');

  const waitingDir = path.join(__dirname, '..', 'runtime', 'test-ibkr-keepalive-waiting');
  fs.rmSync(waitingDir, { recursive: true, force: true });
  fs.mkdirSync(waitingDir, { recursive: true });
  let mailed2fa = 0;
  const waitingResult = await main({
    workspace: waitingDir,
    restartWaitMs: 0,
    detectGatewayState: () => 'launcher_waiting',
    getReadiness: async () => ({ authenticated: false, reachable: false, fallbackRequired: true, reason: 'native_error', message: 'waiting', guidance: 'approve login' }),
    sendEmail: async () => { mailed2fa += 1; },
  });
  assert.strictEqual(waitingResult.status, 'awaiting_login_or_2fa');
  assert.strictEqual(waitingResult.restarted, false);
  assert.strictEqual(waitingResult.mailed, true);
  assert.strictEqual(mailed2fa, 1, 'expected one 2FA mail');

  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
}).finally(() => {
  global.Date = RealDate;
});
