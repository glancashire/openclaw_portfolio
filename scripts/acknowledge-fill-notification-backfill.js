const path = require('path');
const {
  loadFillNotificationState,
  saveFillNotificationState,
  acknowledgeBackfilledFills,
} = require('../src/reporting/fillNotificationState');

function main() {
  const args = process.argv.slice(2);
  const portfolioDirArg = args.find((arg) => !arg.startsWith('--'));
  const portfolioDir = portfolioDirArg ? path.resolve(portfolioDirArg) : path.join(process.cwd(), 'portfolio', 'etf');
  const orderIds = args
    .filter((arg) => /^\d+$/.test(arg))
    .map((arg) => Number(arg))
    .filter((arg) => Number.isFinite(arg) && arg > 0);

  if (!orderIds.length) {
    console.error('Usage: node scripts/acknowledge-fill-notification-backfill.js <portfolio-dir> <orderId> [orderId...]');
    process.exit(1);
  }

  const repoRoot = path.resolve(portfolioDir, '..', '..');
  const state = loadFillNotificationState(repoRoot);
  const next = acknowledgeBackfilledFills(state, orderIds);
  saveFillNotificationState(repoRoot, next);

  console.log(JSON.stringify({
    ok: true,
    portfolioDir,
    acknowledged: orderIds,
    state: next,
  }, null, 2));
}

main();
