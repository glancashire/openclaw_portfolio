'use strict';

/**
 * Execute approved trades via IB Gateway and send email notifications on fill.
 * Usage: node scripts/execute-trades.js [--dry-run]
 */

const { execSync } = require('child_process');
const path = require('path');
console.error('This script is obsolete. Use scripts/submit-orders-at-open.js or scripts/trade.js submit instead.');
process.exit(1);

