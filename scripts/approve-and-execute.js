#!/usr/bin/env node
'use strict';

/**
 * scripts/approve-and-execute.js — Phase E
 *
 * Operator entry point that:
 *   1. Validates the supplied secret against OPENCLAW_APPROVAL_SAFEWORD
 *      and OPENCLAW_APPROVAL_PIN.
 *   2. Writes runtime/approval-intent/<approvalId>.json via
 *      src/execution/approvalGate.writeApprovalIntent.
 *   3. Spawns scripts/execute-approved-basket-end-to-end.js with the
 *      portfolio + approvalId, forwarding stdout/stderr and exit code.
 *
 * Usage:
 *   node scripts/approve-and-execute.js \
 *        --approval-id=<id> \
 *        --secret=<safeword-or-pin> \
 *        [--portfolio=etf] \
 *        [--scope=basket-execute] \
 *        [--issued-at=<iso>] \
 *        [--dry-run]
 *
 * The script NEVER echoes the secret. argv is parsed manually and the
 * matched-against value is described as "safeWord" or "pin" only.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT_REAL = path.resolve(__dirname, '..');
const { writeApprovalIntent } = require(path.join(ROOT_REAL, 'src/execution/approvalGate'));

function parseArgs(argv) {
  const out = {};
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') { out.dryRun = true; continue; }
    if (!a.startsWith('--')) continue;
    const eq = a.indexOf('=');
    if (eq === -1) { out[a.slice(2)] = true; continue; }
    out[a.slice(2, eq)] = a.slice(eq + 1);
  }
  return out;
}

function fail(code, msg) {
  // Stderr only; safe to print msg as long as caller never includes the secret.
  process.stderr.write(`${msg}\n`);
  process.exit(code);
}

function main() {
  const args = parseArgs(process.argv);
  const ROOT = args.root ? path.resolve(args.root) : ROOT_REAL;
  const approvalId = String(args['approval-id'] || '').trim();
  const secret     = String(args.secret || '').trim();
  const portfolio  = String(args.portfolio || 'etf').trim();
  const scope      = String(args.scope || 'basket-execute').trim();
  const issuedAt   = args['issued-at'] ? String(args['issued-at']) : new Date().toISOString();
  const dryRun     = Boolean(args.dryRun);

  if (!approvalId) fail(1, 'approve-and-execute: --approval-id is required');
  if (!secret)     fail(1, 'approve-and-execute: --secret is required');

  const cfgSafeWord = String(process.env.OPENCLAW_APPROVAL_SAFEWORD || '').trim();
  const cfgPin      = String(process.env.OPENCLAW_APPROVAL_PIN || '').trim();
  if (!cfgSafeWord && !cfgPin) {
    fail(2, 'approve-and-execute: gate not configured (OPENCLAW_APPROVAL_SAFEWORD and OPENCLAW_APPROVAL_PIN both unset)');
  }

  let matched = null;
  if (cfgSafeWord && secret === cfgSafeWord) matched = 'safeWord';
  else if (cfgPin && secret === cfgPin)      matched = 'pin';

  if (!matched) {
    fail(2, `approve-and-execute: secret_mismatch — supplied secret does not match configured safe-word or PIN`);
  }

  const intentArgs = { approvalId, rootDir: ROOT, scope, issuedAt };
  if (matched === 'safeWord') intentArgs.safeWord = secret;
  else                        intentArgs.pin      = secret;

  let intentPath;
  try {
    intentPath = writeApprovalIntent(intentArgs);
  } catch (err) {
    fail(3, `approve-and-execute: failed to write intent artefact (${err.message})`);
  }

  // From here on, never reference `secret` again. Describe only by which field matched.
  process.stdout.write(`approve-and-execute: intent written (matched=${matched}, scope=${scope}, approvalId=${approvalId}) → ${intentPath}\n`);

  if (dryRun) {
    process.stdout.write('approve-and-execute: --dry-run set; not invoking runner.\n');
    process.exit(0);
  }

  const runnerArgs = [
    path.join(ROOT, 'scripts/execute-approved-basket-end-to-end.js'),
    `--portfolio=${portfolio}`,
    `--approval-id=${approvalId}`,
  ];
  const child = spawn(process.execPath, runnerArgs, {
    stdio: 'inherit',
    env: process.env,
    cwd: ROOT,
  });
  child.on('exit', (code, signal) => {
    if (signal) {
      process.stderr.write(`approve-and-execute: runner exited via signal ${signal}\n`);
      process.exit(128);
    }
    process.exit(code === null ? 1 : code);
  });
}

main();
