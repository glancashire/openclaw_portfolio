'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

const target = path.resolve(process.cwd(), 'scripts/ibkr-native-keepalive.js');

function runWithMocks({ readinessQueue, mailSink, startedSink }) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ibkr-keepalive-test-'));
  const stateDir = path.join(tempDir, 'runtime', 'ibkr');
  fs.mkdirSync(stateDir, { recursive: true });
  const statePath = path.join(stateDir, 'native-gateway-keepalive-state.json');
  const writes = [];
  const originalLoad = Module._load;
  const originalExit = process.exit;
  const originalNow = Date.now;
  const originalSetTimeout = global.setTimeout;
  const stateStore = {};
  const queue = [...readinessQueue];

  fs.writeFileSync = ((orig) => (p, data, options) => {
    if (String(p) === statePath) {
      stateStore[String(p)] = String(data);
      writes.push(JSON.parse(String(data)));
      return;
    }
    return orig(p, data, options);
  })(fs.writeFileSync);
  fs.readFileSync = ((orig) => (p, enc) => (String(p) === statePath ? stateStore[String(p)] : orig(p, enc)))(fs.readFileSync);
  fs.existsSync = ((orig) => (p) => (String(p) === statePath ? stateStore[String(p)] != null : orig(p)))(fs.existsSync);
  fs.mkdirSync = ((orig) => (dir, options) => orig(dir, options))(fs.mkdirSync);
  global.setTimeout = (fn) => { fn(); return 0; };
  process.exit = (code) => { throw new Error(`exit:${code}`); };
  Date.now = () => 1710000000000;

  Module._load = function(request, parent, isMain) {
    if (request === '../src/brokers/interactive-brokers/readiness') {
      return { getInteractiveBrokersReadiness: async () => queue.shift() };
    }
    if (request === '../lib/mailgun') {
      return { sendEmail: async (payload) => { mailSink.push(payload); return { ok: true }; } };
    }
    if (request === 'child_process') {
      return { execFileSync: (...args) => { startedSink.push(args); } };
    }
    return originalLoad.apply(this, arguments);
  };

  delete require.cache[target];
  const mod = require(target);
  return {
    async run() {
      try {
        await mod.main();
      } catch (error) {
        if (!String(error.message || '').startsWith('exit:')) throw error;
      }
    },
    writes,
    cleanup() {
      Module._load = originalLoad;
      process.exit = originalExit;
      Date.now = originalNow;
      global.setTimeout = originalSetTimeout;
    },
  };
}

(async () => {
  const mail1 = [];
  const start1 = [];
  const h1 = runWithMocks({
    readinessQueue: [
      { authenticated: false, reachable: false, fallbackRequired: true, message: 'Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. Detail: connect ECONNREFUSED 127.0.0.1:4001', guidance: 'Restore native connectivity first. Detail: connect ECONNREFUSED 127.0.0.1:4001' },
    ],
    mailSink: mail1,
    startedSink: start1,
  });
  await h1.run();
  assert.strictEqual(mail1.length, 1, 'Expected a 2FA escalation mail');
  assert.strictEqual(start1.length, 0, 'Should not auto-retry while awaiting 2FA');
  assert.strictEqual(h1.writes.at(-1).awaiting2faMailSentAt != null, true, 'Expected mail timestamp');
  h1.cleanup();

  const mail2 = [];
  const start2 = [];
  const h2 = runWithMocks({
    readinessQueue: [
      { authenticated: false, reachable: false, fallbackRequired: true, message: 'gateway down', guidance: 'restore' },
      { authenticated: true, reachable: true, fallbackRequired: false, message: 'ready', guidance: 'ok' },
    ],
    mailSink: mail2,
    startedSink: start2,
  });
  await h2.run();
  assert(start2.length >= 1, 'Expected restart attempt when gateway is down');
  assert.strictEqual(mail2.length, 0, 'No mail if recovery succeeds');
  h2.cleanup();

  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
