'use strict';
/**
 * check-cash-influx-and-send-dashboard.js
 *
 * Checks if broker cash increased since last known state.
 * If it did, syncs holdings and sends the dashboard email.
 *
 * State file: runtime/dashboard-triggers/last-known-cash.json
 */

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

async function main() {
  const stateDir = path.join(ROOT, 'runtime', 'dashboard-triggers');
  const stateFile = path.join(stateDir, 'last-known-cash.json');
  fs.mkdirSync(stateDir, { recursive: true });

  // Load last known cash
  let lastCash = 0;
  if (fs.existsSync(stateFile)) {
    try { lastCash = JSON.parse(fs.readFileSync(stateFile, 'utf8')).cashChf || 0; } catch (_) {}
  }

  // Fetch current broker cash
  const { InteractiveBrokersClient } = require('../src/brokers/interactive-brokers/client');
  const client = new InteractiveBrokersClient({ portfolio: 'etf' });
  const ledger = await client.fetchLedger({ accountId: 'U25624150' });
  const currentCash = Number(ledger?.SettledCash || ledger?.TotalCashValue || 0);

  // Fallback: read from holdings if ledger returns nothing
  let cashToCompare = currentCash;
  if (!cashToCompare) {
    const holdingsMd = fs.readFileSync(path.join(ROOT, 'portfolio', 'etf', 'holdings.md'), 'utf8');
    const m = holdingsMd.match(/- Broker account cash CHF: ([\d.]+)/);
    cashToCompare = m ? Number(m[1]) : 0;
  }

  const influx = cashToCompare - lastCash;
  console.log(`Last known cash: CHF ${lastCash}`);
  console.log(`Current cash: CHF ${cashToCompare}`);
  console.log(`Difference: CHF ${influx.toFixed(2)}`);

  // Update state regardless
  fs.writeFileSync(stateFile, JSON.stringify({ cashChf: cashToCompare, updatedAt: new Date().toISOString() }));

  // Threshold: only trigger if cash increased by more than CHF 500 (avoids noise from FX/dividends)
  if (influx < 500) {
    console.log('No significant cash influx detected. Skipping dashboard email.');
    return;
  }

  console.log(`Cash influx detected: +CHF ${influx.toFixed(2)}. Syncing and sending dashboard.`);

  // Sync holdings first
  const { execSync } = require('child_process');
  execSync('node scripts/sync-interactive-brokers-holdings.js etf', { cwd: ROOT, stdio: 'inherit' });

  // Send dashboard email
  execSync(`node scripts/send-portfolio-dashboard-email.js etf --reason="Cash influx detected: +CHF ${influx.toFixed(0)}"`, { cwd: ROOT, stdio: 'inherit' });
}

main().catch((e) => { console.error(e.stack || e); process.exit(1); });
