#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { getInteractiveBrokersReadiness } = require('../src/brokers/interactive-brokers/readiness');
const { sendEmail } = require('../lib/mailgun');

const WORKSPACE = path.resolve(__dirname, '..');
const STATE_DIR = path.join(WORKSPACE, 'runtime', 'ibkr');
const STATE_PATH = path.join(STATE_DIR, 'native-gateway-keepalive-state.json');
const START_SCRIPT = '/home/ubuntu/ibgateway-native/start-ibc.sh';
const RECIPIENT = 'lancashire@swift.ch';

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
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

function writeState(state) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function nowIso() {
  return new Date().toISOString();
}

function isDaytimeUTC(date = new Date()) {
  const hour = date.getUTCHours();
  return hour >= 8 && hour < 20;
}

function classify(readiness) {
  if (readiness?.authenticated && readiness?.reachable && readiness?.fallbackRequired === false) return 'ready';
  const message = String(readiness?.message || '').toLowerCase();
  const guidance = String(readiness?.guidance || '').toLowerCase();
  if (message.includes('ecconnrefused 127.0.0.1:4001') || guidance.includes('ecconnrefused 127.0.0.1:4001')) return 'awaiting_login_or_2fa';
  return 'down';
}

function startGateway() {
  execFileSync(START_SCRIPT, { stdio: 'inherit' });
}

async function maybeSend2faMail(readiness, state) {
  if (state.awaiting2faMailSentAt) return { mailed: false, reason: 'already_sent' };
  const subject = 'IBKR native gateway is waiting for 2FA approval';
  const text = [
    'The native IBKR gateway keepalive restarted the gateway during daytime,',
    'but the API socket is still waiting on login / second-factor approval.',
    '',
    `Readiness message: ${readiness.message || 'unknown'}`,
    `Guidance: ${readiness.guidance || 'unknown'}`,
    '',
    'No automatic retry will be attempted after this point.',
    'Ask me explicitly if you want another retry.',
  ].join('\n');
  await sendEmail({ to: RECIPIENT, subject, text });
  state.awaiting2faMailSentAt = nowIso();
  writeState(state);
  return { mailed: true };
}

async function main() {
  const state = readState();
  const firstReadiness = await getInteractiveBrokersReadiness({ portfolio: 'etf' });
  const firstStatus = classify(firstReadiness);

  if (firstStatus === 'ready') {
    state.lastReadyAt = nowIso();
    state.awaiting2faSince = null;
    state.awaiting2faMailSentAt = null;
    state.lastError = null;
    writeState(state);
    console.log(JSON.stringify({ ok: true, status: 'ready', restarted: false, mailed: false, readiness: firstReadiness }, null, 2));
    return;
  }

  if (!isDaytimeUTC()) {
    state.lastError = 'gateway_not_ready_outside_daytime_window';
    writeState(state);
    console.log(JSON.stringify({ ok: false, status: firstStatus, restarted: false, mailed: false, skipped: 'outside_daytime_window', readiness: firstReadiness }, null, 2));
    return;
  }

  if (firstStatus === 'awaiting_login_or_2fa') {
    state.awaiting2faSince ||= nowIso();
    const mail = await maybeSend2faMail(firstReadiness, state);
    state.lastError = 'awaiting_login_or_2fa';
    writeState(state);
    console.log(JSON.stringify({ ok: false, status: 'awaiting_login_or_2fa', restarted: false, mailed: mail.mailed, readiness: firstReadiness }, null, 2));
    return;
  }

  startGateway();
  state.lastRestartAt = nowIso();
  writeState(state);

  await new Promise((resolve) => setTimeout(resolve, 20000));
  const secondReadiness = await getInteractiveBrokersReadiness({ portfolio: 'etf' });
  const secondStatus = classify(secondReadiness);

  if (secondStatus === 'ready') {
    state.lastReadyAt = nowIso();
    state.awaiting2faSince = null;
    state.awaiting2faMailSentAt = null;
    state.lastError = null;
    writeState(state);
    console.log(JSON.stringify({ ok: true, status: 'ready', restarted: true, mailed: false, readiness: secondReadiness }, null, 2));
    return;
  }

  if (secondStatus === 'awaiting_login_or_2fa') {
    state.awaiting2faSince ||= nowIso();
    const mail = await maybeSend2faMail(secondReadiness, state);
    state.lastError = 'awaiting_login_or_2fa';
    writeState(state);
    console.log(JSON.stringify({ ok: false, status: 'awaiting_login_or_2fa', restarted: true, mailed: mail.mailed, readiness: secondReadiness }, null, 2));
    return;
  }

  state.lastError = secondReadiness?.message || 'gateway_not_ready_after_restart';
  writeState(state);
  console.log(JSON.stringify({ ok: false, status: secondStatus, restarted: true, mailed: false, readiness: secondReadiness }, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || String(error));
    process.exit(1);
  });
}

module.exports = { main, classify, isDaytimeUTC };
