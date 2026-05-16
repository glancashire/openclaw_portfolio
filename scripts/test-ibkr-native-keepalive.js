'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { main, classify } = require('./ibkr-native-keepalive');

(async () => {
  assert.strictEqual(classify({ authenticated: true, reachable: true, fallbackRequired: false }, 'api_ready'), 'ready');
  assert.strictEqual(classify({ authenticated: false, reachable: false, fallbackRequired: true }, 'launcher_waiting'), 'awaiting_login_or_2fa');
  assert.strictEqual(classify({ authenticated: false, reachable: false, fallbackRequired: true }, 'down'), 'down');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ibkr-keepalive-test-'));
  const workspace = path.join(tempDir, 'workspace');
  const stateDir = path.join(workspace, 'runtime', 'ibkr');
  fs.mkdirSync(stateDir, { recursive: true });

  const mail1 = [];
  await main({
    workspace,
    recipient: 'test@example.com',
    restartWaitMs: 0,
    detectGatewayState: () => 'launcher_waiting',
    getReadiness: async () => ({
      authenticated: false,
      reachable: false,
      fallbackRequired: true,
      message: 'Interactive Brokers is not ready yet.',
      guidance: 'Approve the IBKR login challenge.',
    }),
    sendEmail: async (payload) => { mail1.push(payload); return { ok: true }; },
    startScript: '/bin/echo',
  });
  const statePath = path.join(stateDir, 'native-gateway-keepalive-state.json');
  const state1 = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  assert.strictEqual(mail1.length, 1, 'Expected a 2FA escalation mail');
  assert.strictEqual(state1.awaiting2faMailSentAt != null, true, 'Expected mail timestamp');

  const mail2 = [];
  const readinessSeq = [
    { authenticated: false, reachable: false, fallbackRequired: true, message: 'gateway down', guidance: 'restore' },
    { authenticated: true, reachable: true, fallbackRequired: false, message: 'ready', guidance: 'ok' },
  ];
  const gatewayStates = ['down', 'api_ready'];
  await main({
    workspace,
    recipient: 'test@example.com',
    restartWaitMs: 0,
    detectGatewayState: () => gatewayStates.shift(),
    getReadiness: async () => readinessSeq.shift(),
    sendEmail: async (payload) => { mail2.push(payload); return { ok: true }; },
    startScript: '/bin/echo',
  });
  assert.strictEqual(mail2.length, 0, 'No mail if recovery succeeds');

  console.log(JSON.stringify({ ok: true }, null, 2));
})().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
