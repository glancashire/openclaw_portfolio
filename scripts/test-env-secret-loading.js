'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const workspace = process.cwd();
const envPath = path.join(workspace, '.env');
const ibkrSecrets = path.join(workspace, 'secrets', 'interactive-brokers.json');
const mailgunSecrets = path.join(workspace, 'secrets', 'mailgun.json');
const ibkrBackup = `${ibkrSecrets}.bak-env-test`;
const mailgunBackup = `${mailgunSecrets}.bak-env-test`;
const originalEnv = { ...process.env };

function moveIfExists(from, to) {
  if (fs.existsSync(to)) fs.unlinkSync(to);
  if (fs.existsSync(from)) fs.renameSync(from, to);
}

try {
  assert(fs.existsSync(envPath), 'Expected .env to exist');
  moveIfExists(ibkrSecrets, ibkrBackup);
  moveIfExists(mailgunSecrets, mailgunBackup);

  for (const key of Object.keys(process.env)) {
    if (key.startsWith('IBKR_') || key.startsWith('MAILGUN_')) delete process.env[key];
  }

  const configPath = path.resolve(workspace, 'src/brokers/interactive-brokers/config.js');
  const mailgunPath = path.resolve(workspace, 'lib/mailgun.js');
  delete require.cache[configPath];
  delete require.cache[mailgunPath];

  const { loadInteractiveBrokersConfig } = require(configPath);
  const { loadConfig } = require(mailgunPath);

  const ibkr = loadInteractiveBrokersConfig();
  const mailgun = loadConfig();

  assert.strictEqual(ibkr.mode, 'native');
  assert.strictEqual(ibkr.accountId, 'U25624150');
  assert.strictEqual(mailgun.domain, 'mailgun.swift.ch');
  assert(/@mailgun\.swift\.ch>?$/.test(mailgun.sender), 'Expected mailgun sender from .env');

  console.log(JSON.stringify({ ok: true, ibkrMode: ibkr.mode, accountId: ibkr.accountId, mailgunDomain: mailgun.domain }, null, 2));
} finally {
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, originalEnv);
  moveIfExists(ibkrBackup, ibkrSecrets);
  moveIfExists(mailgunBackup, mailgunSecrets);
}
