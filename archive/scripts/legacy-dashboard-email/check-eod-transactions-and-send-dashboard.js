'use strict';
/**
 * check-eod-transactions-and-send-dashboard.js
 *
 * Checks if there were any filled trades today.
 * If yes, syncs holdings and sends the dashboard email.
 * Intended to run near market close on weekdays.
 */

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

async function main() {
  const tradesMd = fs.readFileSync(path.join(ROOT, 'portfolio', 'etf', 'trades.md'), 'utf8');

  // Today's date in YYYY-MM-DD format (Europe/Zurich wall clock)
  const now = new Date();
  const zurichDate = now.toLocaleDateString('en-CA', { timeZone: 'Europe/Zurich' }); // YYYY-MM-DD

  // Look for filled trades today
  const lines = tradesMd.split('\n');
  const todayFills = lines.filter(line => {
    if (!line.startsWith('|')) return false;
    if (!line.includes(zurichDate)) return false;
    // Match filled status (the trades.md status column)
    return /\bfill(ed)?\b/i.test(line) || /\bsubmitted\b/i.test(line);
  });

  console.log(`Date (Zurich): ${zurichDate}`);
  console.log(`Trades today: ${todayFills.length}`);

  if (todayFills.length === 0) {
    console.log('No transactions today. Skipping dashboard email.');
    return;
  }

  console.log(`Found ${todayFills.length} trade(s) today. Syncing and sending dashboard.`);

  // Sync holdings
  const { execSync } = require('child_process');
  execSync('node scripts/sync-interactive-brokers-holdings.js etf', { cwd: ROOT, stdio: 'inherit' });

  // Send dashboard email
  execSync(`node scripts/send-portfolio-dashboard-email.js etf --reason="End-of-day summary: ${todayFills.length} trade(s) executed today"`, { cwd: ROOT, stdio: 'inherit' });
}

main().catch((e) => { console.error(e.stack || e); process.exit(1); });
