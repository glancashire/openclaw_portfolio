'use strict';

/**
 * Deliberate failure shim — DO NOT REMOVE.
 *
 * This file is intentionally a no-op that exits with code 1 and prints an
 * obsolescence notice. It is kept on purpose so that:
 *
 * 1. Operator muscle memory (`node scripts/execute-trades.js`) lands on a
 *    clear, immediate redirect to the real execution surface instead of
 *    a "command not found" error.
 * 2. `scripts/test-trading-guards.js` can spawn this script and assert the
 *    exit-1 contract, locking in the expectation that this path stays inert.
 * 3. `scripts/test-execute-trades-shim-contract.js` provides a smaller,
 *    standalone regression test that covers the exit-1 + obsolescence-message
 *    contract independent of the larger trading-guards test.
 *
 * The active execution surfaces are:
 *   - scripts/submit-orders-at-open.js   (writable handoff for staged orders)
 *   - scripts/trade.js                   (CLI for individual order ops)
 *   - docs/execution-command-surface.md  (canonical CLI surface)
 *
 * If you want to remove this shim, delete the regression tests above first
 * and update the four docs that reference it as obsolete.
 */

console.error(
  'scripts/execute-trades.js is obsolete. ' +
  'Use scripts/submit-orders-at-open.js or scripts/trade.js submit instead. ' +
  'See docs/execution-command-surface.md.'
);
process.exit(1);
