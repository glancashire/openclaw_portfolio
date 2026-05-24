#!/usr/bin/env node
'use strict';

const path = require('path');
const { syncMarketCalendar } = require('../src/execution/marketCalendarSync');

const args = process.argv.slice(2);
const portfolioDir = args.find((a) => !a.startsWith('--')) || 'portfolio/etf';
const resolvedDir = path.resolve(process.cwd(), portfolioDir);
const dryRun = args.includes('--dry-run');
const jsonOutput = args.includes('--json');

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage: node scripts/sync-market-calendar.js [portfolio-dir] [--dry-run] [--json]

Sync IBKR contract hours for approved instruments and persist a market-calendar artifact.

Options:
  --dry-run   Show what would be synced without writing the artifact
  --json      Output JSON instead of human-readable text
  -h, --help  Show this help
`);
  process.exit(0);
}

async function main() {
  const now = new Date();

  if (dryRun) {
    // For dry-run, we import but don't connect to broker
    const { readApprovedInstruments } = require('../src/analysis/approvedInstruments');
    const { hasIbkrIdentity } = require('../src/execution/marketCalendarSync');
    const portfolioPath = path.join(resolvedDir, 'portfolio.md');
    const instruments = readApprovedInstruments(portfolioPath);
    const summary = {
      ok: true,
      dryRun: true,
      portfolio: path.basename(resolvedDir),
      totalInstruments: instruments.length,
      withIdentity: instruments.filter(hasIbkrIdentity).length,
      withoutIdentity: instruments.filter((i) => !hasIbkrIdentity(i)).length,
      instruments: instruments.map((i) => ({
        tickerOrIsin: i.tickerOrIsin,
        name: i.name,
        hasIdentity: hasIbkrIdentity(i),
        ibkrConid: i.ibkrConid || null,
      })),
    };
    if (jsonOutput) {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      console.log(`Market calendar sync (dry-run) for ${summary.portfolio}`);
      console.log(`  Total instruments: ${summary.totalInstruments}`);
      console.log(`  With IBKR identity: ${summary.withIdentity}`);
      console.log(`  Without identity: ${summary.withoutIdentity}`);
      for (const i of summary.instruments) {
        console.log(`    ${i.hasIdentity ? '✓' : '✗'} ${i.tickerOrIsin} — ${i.name || '(unnamed)'}${i.ibkrConid ? ` [conid ${i.ibkrConid}]` : ''}`);
      }
    }
    return;
  }

  const result = await syncMarketCalendar({ portfolioDir: resolvedDir, now });

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Market calendar sync for ${result.portfolio}`);
    console.log(`  Broker ready: ${result.brokerReady}`);
    console.log(`  Coverage: ${result.coverage.synced}/${result.coverage.totalApprovedInstruments} synced, ${result.coverage.missingIdentity} missing identity, ${result.coverage.syncFailed} failed`);
    console.log(`  Artifact: ${result.artifactPath}`);
    for (const row of result.instruments) {
      const status = row.syncStatus === 'ok' ? '✓' : row.syncStatus === 'missing_identity' ? '?' : '✗';
      console.log(`    ${status} ${row.tickerOrIsin} — ${row.name || '(unnamed)'} [${row.syncStatus}]`);
    }
  }
}

main().catch((err) => {
  console.error('Market calendar sync failed:', err.message || err);
  process.exit(1);
});
