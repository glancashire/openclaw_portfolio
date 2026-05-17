#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { InteractiveBrokersClient } = require('../src/brokers/interactive-brokers/client');
const { getInteractiveBrokersReadiness } = require('../src/brokers/interactive-brokers/readiness');
const { sendEmail } = require('../lib/mailgun');

const DEFAULTS = {
  workspace: path.resolve(__dirname, '..'),
  startScript: '/home/ubuntu/ibgateway-native/start-ibc.sh',
  recipient: 'lancashire@swift.ch',
  portfolio: 'etf',
  restartWaitMs: 20000,
  detectGatewayState: defaultDetectGatewayState,
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
    return { ok: false, readiness, gatewayState: 'down', status: 'down' };
  }
  if (readiness.fallbackRequired === false || hasUsableQuote(readiness)) {
    return { ok: true, readiness, gatewayState: 'api_ready', status: 'ready' };
  }
  return { ok: true, readiness, gatewayState: 'api_ready', status: 'up_but_unpriced' };
}

async function maybeSend2faMail(readiness, state, { recipient, paths, sendEmailImpl }) {
  if (state.awaiting2faMailSentAt) return { mailed: false, reason: 'already_sent' };
  const subject = 'IBKR native gateway is waiting for 2FA approval';
  const text = [
    'The native IBKR gateway keepalive checked the gateway during daytime,',
    'and the launcher is up but the API socket is still waiting on login / second-factor approval.',
    '',
    `Readiness message: ${readiness.message || 'unknown'}`,
    `Guidance: ${readiness.guidance || 'unknown'}`,
    '',
    'No automatic retry will be attempted after this point.',
    'Ask me explicitly if you want another retry.',
  ].join('\n');
  await sendEmailImpl({ to: recipient, subject, text });
  state.awaiting2faMailSentAt = nowIso();
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

  if (firstStatus === 'awaiting_login_or_2fa') {
    state.awaiting2faSince ||= nowIso();
    const mail = await maybeSend2faMail(firstReadiness, state, { recipient: settings.recipient, paths, sendEmailImpl });
    state.lastError = 'awaiting_login_or_2fa';
    writeState(paths, state);
    const result = { ok: false, status: 'awaiting_login_or_2fa', gatewayState: firstGatewayState, restarted: false, mailed: mail.mailed, readiness: firstReadiness };
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
    state.lastError = null;
    writeState(paths, state);
    const result = { ok: true, status: 'ready', gatewayState: secondGatewayState, restarted: true, mailed: false, readiness: secondReadiness };
    console.log(JSON.stringify(result, null, 2));
    return result;
  }

  if (secondStatus === 'awaiting_login_or_2fa') {
    state.awaiting2faSince ||= nowIso();
    const mail = await maybeSend2faMail(secondReadiness, state, { recipient: settings.recipient, paths, sendEmailImpl });
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
