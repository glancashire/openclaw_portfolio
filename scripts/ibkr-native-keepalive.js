#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { getInteractiveBrokersReadiness } = require('../src/brokers/interactive-brokers/readiness');
const { sendEmail } = require('../lib/mailgun');

const DEFAULTS = {
  workspace: path.resolve(__dirname, '..'),
  startScript: '/home/ubuntu/ibgateway-native/start-ibc.sh',
  recipient: 'lancashire@swift.ch',
  portfolio: 'etf',
  restartWaitMs: 20000,
  detectGatewayState: defaultDetectGatewayState,
  allowAutoRestart: false,
};

function buildPaths(workspace) {
  const stateDir = path.join(workspace, 'runtime', 'ibkr');
  return {
    stateDir,
    statePath: path.join(stateDir, 'native-gateway-keepalive-state.json'),
  };
}

function readState(statePath) {
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return {
      lastRestartAt: null,
      lastReadyAt: null,
      awaiting2faSince: null,
      awaiting2faMailSentAt: null,
      downMailSentAt: null,
      lastError: null,
    };
  }
}

function writeState(paths, state) {
  fs.mkdirSync(paths.stateDir, { recursive: true });
  fs.writeFileSync(paths.statePath, JSON.stringify(state, null, 2));
}

function nowIso() {
  return new Date().toISOString();
}

function isDaytimeUTC(date = new Date()) {
  const hour = date.getUTCHours();
  return hour >= 8 && hour < 20;
}

function defaultDetectGatewayState() {
  try {
    const output = execFileSync('bash', ['-lc', "(ss -ltnp 2>/dev/null || netstat -ltnp 2>/dev/null) | grep -E ':4001|:7462' || true"], { encoding: 'utf8' });
    const has4001 = /:4001\b/.test(output);
    const has7462 = /:7462\b/.test(output);
    if (has4001) return 'api_ready';
    if (has7462) return 'launcher_waiting';
    return 'down';
  } catch {
    return 'unknown';
  }
}

function classify(readiness, gatewayState = 'unknown') {
  if (readiness?.authenticated && readiness?.reachable && readiness?.fallbackRequired === false) return 'ready';
  if (gatewayState === 'launcher_waiting') return 'awaiting_login_or_2fa';
  if (gatewayState === 'api_ready') return 'ready';
  return 'down';
}

function startGateway(startScript) {
  execFileSync(startScript, { stdio: 'inherit' });
}

function hasUsableQuote(readiness) {
  const probe = readiness?.marketDataProbe;
  const detail = String(readiness?.marketDataDetail || '');
  return Boolean(probe) && !/no usable price fields/i.test(detail);
}

async function probeNativeData({ portfolio, getReadiness }) {
  const readiness = await getReadiness({ portfolio });
  if (!readiness?.authenticated || !readiness?.reachable) {
    return { ok: false, readiness, status: 'down' };
  }
  if (readiness.fallbackRequired === false || hasUsableQuote(readiness)) {
    return { ok: true, readiness, gatewayState: 'api_ready', status: 'ready' };
  }
  return { ok: true, readiness, gatewayState: 'api_ready', status: 'up_but_unpriced' };
}

async function maybeSendOperatorMail(kind, readiness, state, { recipient, paths, sendEmailImpl }) {
  if (kind === 'awaiting_login_or_2fa' && state.awaiting2faMailSentAt) return { mailed: false, reason: 'already_sent' };
  if (kind === 'down' && state.downMailSentAt) return { mailed: false, reason: 'already_sent' };

  const subject = kind === 'awaiting_login_or_2fa'
    ? 'IBKR native gateway is waiting for login / 2FA approval'
    : 'IBKR native gateway is down and needs operator relaunch';

  const text = kind === 'awaiting_login_or_2fa'
    ? [
      'The native IBKR gateway keepalive checked the gateway during daytime,',
      'and the launcher is up but the API socket is still waiting on login / second-factor approval.',
      '',
      `Readiness message: ${readiness?.message || 'unknown'}`,
      `Guidance: ${readiness?.guidance || 'unknown'}`,
      '',
      'I did not auto-retry again.',
      'Please relaunch or approve login/2FA when you are present, then ask me explicitly if you want another retry.',
    ].join('\n')
    : [
      'The native IBKR gateway keepalive checked the gateway during daytime and could not get a usable native quote/readiness path.',
      'The gateway appears down.',
      '',
      `Readiness message: ${readiness?.message || 'unknown'}`,
      `Guidance: ${readiness?.guidance || 'unknown'}`,
      '',
      'I intentionally did not auto-restart it to avoid triggering an unnecessary login / 2FA flow while the operator may be away.',
      'Please relaunch it when you are present, then trigger the login / 2FA flow intentionally if needed.',
    ].join('\n');

  await sendEmailImpl({ to: recipient, subject, text });
  if (kind === 'awaiting_login_or_2fa') state.awaiting2faMailSentAt = nowIso();
  if (kind === 'down') state.downMailSentAt = nowIso();
  writeState(paths, state);
  return { mailed: true };
}

async function main(options = {}) {
  const settings = { ...DEFAULTS, ...options };
  const paths = buildPaths(settings.workspace);
  const state = readState(paths.statePath);
  const getReadiness = settings.getReadiness || ((args) => getInteractiveBrokersReadiness(args));
  const sendEmailImpl = settings.sendEmail || sendEmail;
  const detectGatewayState = settings.detectGatewayState || defaultDetectGatewayState;

  const firstProbe = await probeNativeData({ portfolio: settings.portfolio, getReadiness });
  const firstGatewayState = firstProbe.gatewayState || detectGatewayState();
  const firstReadiness = firstProbe.readiness;
  const firstStatus = classify(firstReadiness, firstGatewayState);

  if (firstStatus === 'ready') {
    state.lastReadyAt = nowIso();
    state.awaiting2faSince = null;
    state.awaiting2faMailSentAt = null;
    state.downMailSentAt = null;
    state.lastError = null;
    writeState(paths, state);
    const result = { ok: true, status: 'ready', gatewayState: firstGatewayState, restarted: false, mailed: false, readiness: firstReadiness };
    console.log(JSON.stringify(result, null, 2));
    return result;
  }

  if (!isDaytimeUTC()) {
    state.lastError = 'gateway_not_ready_outside_daytime_window';
    writeState(paths, state);
    const result = { ok: false, status: firstStatus, gatewayState: firstGatewayState, restarted: false, mailed: false, skipped: 'outside_daytime_window', readiness: firstReadiness };
    console.log(JSON.stringify(result, null, 2));
    return result;
  }

  if (firstGatewayState === 'launcher_waiting') {
    state.awaiting2faSince ||= nowIso();
    const mail = await maybeSendOperatorMail('awaiting_login_or_2fa', firstReadiness, state, { recipient: settings.recipient, paths, sendEmailImpl });
    state.lastError = 'awaiting_login_or_2fa';
    writeState(paths, state);
    const result = { ok: false, status: 'awaiting_login_or_2fa', gatewayState: firstGatewayState, restarted: false, mailed: mail.mailed, readiness: firstReadiness };
    console.log(JSON.stringify(result, null, 2));
    return result;
  }

  if (firstStatus === 'down') {
    const mail = await maybeSendOperatorMail('down', firstReadiness, state, { recipient: settings.recipient, paths, sendEmailImpl });
    state.lastError = firstReadiness?.message || 'gateway_down_operator_action_required';
    writeState(paths, state);
    const result = {
      ok: false,
      status: firstStatus,
      gatewayState: firstGatewayState,
      restarted: false,
      mailed: mail.mailed,
      operatorActionRequired: 'relaunch_gateway_when_present',
      readiness: firstReadiness,
    };
    console.log(JSON.stringify(result, null, 2));
    return result;
  }

  if (!settings.allowAutoRestart) {
    const mail = await maybeSendOperatorMail('down', firstReadiness, state, { recipient: settings.recipient, paths, sendEmailImpl });
    state.lastError = firstReadiness?.message || 'gateway_down_operator_action_required';
    writeState(paths, state);
    const result = {
      ok: false,
      status: firstStatus,
      gatewayState: firstGatewayState,
      restarted: false,
      mailed: mail.mailed,
      operatorActionRequired: 'relaunch_gateway_when_present',
      readiness: firstReadiness,
    };
    console.log(JSON.stringify(result, null, 2));
    return result;
  }

  startGateway(settings.startScript);
  state.lastRestartAt = nowIso();
  writeState(paths, state);

  await new Promise((resolve) => setTimeout(resolve, settings.restartWaitMs));
  const secondProbe = await probeNativeData({ portfolio: settings.portfolio, getReadiness });
  const secondGatewayState = secondProbe.gatewayState || detectGatewayState();
  const secondReadiness = secondProbe.readiness;
  const secondStatus = classify(secondReadiness, secondGatewayState);

  if (secondStatus === 'ready') {
    state.lastReadyAt = nowIso();
    state.awaiting2faSince = null;
    state.awaiting2faMailSentAt = null;
    state.downMailSentAt = null;
    state.lastError = null;
    writeState(paths, state);
    const result = { ok: true, status: 'ready', gatewayState: secondGatewayState, restarted: true, mailed: false, readiness: secondReadiness };
    console.log(JSON.stringify(result, null, 2));
    return result;
  }

  if (secondGatewayState === 'launcher_waiting') {
    state.awaiting2faSince ||= nowIso();
    const mail = await maybeSendOperatorMail('awaiting_login_or_2fa', secondReadiness, state, { recipient: settings.recipient, paths, sendEmailImpl });
    state.lastError = 'awaiting_login_or_2fa';
    writeState(paths, state);
    const result = { ok: false, status: 'awaiting_login_or_2fa', gatewayState: secondGatewayState, restarted: true, mailed: mail.mailed, readiness: secondReadiness };
    console.log(JSON.stringify(result, null, 2));
    return result;
  }

  state.lastError = secondReadiness?.message || 'gateway_not_ready_after_restart';
  writeState(paths, state);
  const result = { ok: false, status: secondStatus, gatewayState: secondGatewayState, restarted: true, mailed: false, readiness: secondReadiness };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || String(error));
    process.exit(1);
  });
}

module.exports = { main, classify, isDaytimeUTC, buildPaths, defaultDetectGatewayState, probeNativeData };
