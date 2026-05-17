const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { main, classify, probeNativeData } = require('./ibkr-native-keepalive');

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

  const restartSequence = [];
  const result = await main({
    workspace: tmpDir,
    restartWaitMs: 0,
    startScript: '/bin/true',
    detectGatewayState: () => 'down',
    getReadiness: async () => {
      restartSequence.push('probe');
      return restartSequence.length === 1
        ? { authenticated: false, reachable: false, fallbackRequired: true, reason: 'native_error', message: 'down' }
        : { authenticated: true, reachable: true, fallbackRequired: false, marketDataProbe: { conid: '1' }, message: 'ready' };
    },
    sendEmail: async () => { throw new Error('should not mail in restart success path'); },
  });
  assert(result && result.ok === true, 'main returns ok on restart recovery');

  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
