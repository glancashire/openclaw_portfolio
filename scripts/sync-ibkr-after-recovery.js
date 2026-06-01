#!/usr/bin/env node
'use strict';

/**
 * scripts/sync-ibkr-after-recovery.js
 *
 * After IBKR recovery (2FA + auth ok), run the broker syncs in the right
 * order, with the right argument shape, with one retry-on-preserve for the
 * common race where the first authenticated read returns empty.
 *
 * This wraps:
 *   1. node scripts/sync-ibkr-accounting-snapshot.js etf
 *   2. node scripts/sync-interactive-brokers-holdings.js portfolio/etf
 *
 * Then prints a compact one-line summary.
 *
 * Why this exists: invoking these scripts manually after a recovery is a
 * known foot-gun (wrong arg shape, wrong order, parallel runs). This script
 * is the documented "after 2FA, run this" entry point in the recovery
 * runbook.
 */

const { spawnSync } = require('child_process');
const path = require('path');

const portfolioName = process.argv.find((a) => a.startsWith('--portfolio='))?.split('=')[1] || 'etf';
const repoRoot = path.resolve(__dirname, '..');

function run(command, args) {
  const start = Date.now();
  const result = spawnSync('node', [command, ...args], { cwd: repoRoot, encoding: 'utf8' });
  const ms = Date.now() - start;
  let parsed = null;
  if (result.stdout) {
    // Each script prints a JSON summary on the last lines.
    const text = result.stdout.trim();
    try {
      const lastBrace = text.lastIndexOf('{');
      if (lastBrace !== -1) parsed = JSON.parse(text.slice(lastBrace));
    } catch {
      parsed = null;
    }
  }
  return { exitCode: result.status, stdout: result.stdout || '', stderr: result.stderr || '', parsed, ms };
}

function isPreservedOrEmpty(parsed, exitCode) {
  if (exitCode === 4) return true; // accounting preserve path uses exit code 4
  if (!parsed) return false;
  if (parsed.reason === 'preserved_last_known_good') return true;
  if (parsed.cashChf === 0 && parsed.count === 0) return true;
  if (parsed.positionCount === 0) return true;
  return false;
}

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  const summary = { portfolio: portfolioName, accounting: null, holdings: null, retried: false, ok: true };

  console.log(`[sync-after-recovery] portfolio=${portfolioName}`);
  console.log('[sync-after-recovery] step 1/2 — accounting snapshot');
  let accounting = run('scripts/sync-ibkr-accounting-snapshot.js', [portfolioName]);
  console.log(`  exitCode=${accounting.exitCode} ms=${accounting.ms} positions=${accounting.parsed?.positionCount ?? '?'}`);

  if (isPreservedOrEmpty(accounting.parsed, accounting.exitCode)) {
    console.log('[sync-after-recovery] accounting returned empty/preserved; retrying once after 7s');
    summary.retried = true;
    await delay(7000);
    accounting = run('scripts/sync-ibkr-accounting-snapshot.js', [portfolioName]);
    console.log(`  retry exitCode=${accounting.exitCode} ms=${accounting.ms} positions=${accounting.parsed?.positionCount ?? '?'}`);
  }
  summary.accounting = { exitCode: accounting.exitCode, ms: accounting.ms, parsed: accounting.parsed };

  console.log('[sync-after-recovery] step 2/2 — holdings sync');
  let holdings = run('scripts/sync-interactive-brokers-holdings.js', [`portfolio/${portfolioName}`]);
  console.log(`  exitCode=${holdings.exitCode} ms=${holdings.ms} count=${holdings.parsed?.count ?? '?'} cashChf=${holdings.parsed?.cashChf ?? '?'}`);

  if (isPreservedOrEmpty(holdings.parsed, holdings.exitCode)) {
    console.log('[sync-after-recovery] holdings returned empty/preserved; retrying once after 7s');
    summary.retried = true;
    await delay(7000);
    holdings = run('scripts/sync-interactive-brokers-holdings.js', [`portfolio/${portfolioName}`]);
    console.log(`  retry exitCode=${holdings.exitCode} ms=${holdings.ms} count=${holdings.parsed?.count ?? '?'} cashChf=${holdings.parsed?.cashChf ?? '?'}`);
  }
  summary.holdings = { exitCode: holdings.exitCode, ms: holdings.ms, parsed: holdings.parsed };

  summary.ok = accounting.exitCode === 0 && holdings.exitCode === 0;

  console.log('\n[sync-after-recovery] summary:');
  console.log(JSON.stringify(summary, null, 2));
  process.exit(summary.ok ? 0 : 5);
})().catch((e) => {
  console.error('[sync-after-recovery] unexpected error:', e?.message || e);
  process.exit(1);
});
