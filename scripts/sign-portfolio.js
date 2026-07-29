#!/usr/bin/env node
'use strict';
// Portfolio control-file signing / verification CLI (Phase L2.A).
//
// Usage:
//   node scripts/sign-portfolio.js sign   [portfolio]   # trust current state
//   node scripts/sign-portfolio.js verify [portfolio]   # check for tampering
//   (default portfolio: etf)
//
// Requires OPENCLAW_PORTFOLIO_SIGNING_KEY in the environment. Without it,
// signing/verification is reported as "disabled" and live execution is
// unaffected (the tamper preflight fails open until an operator signs).
//
// This never prints the signing key or any file contents.
const path = require('path');
const {
  signPortfolioFiles,
  verifyPortfolioFiles,
} = require('../src/execution/portfolioSigning');

const cmd = (process.argv[2] || 'verify').toLowerCase();
const portfolio = process.argv[3] || 'etf';
const portfolioDir = path.join(__dirname, '..', 'portfolio', portfolio);

function print(obj) {
  process.stdout.write(`${JSON.stringify(obj, null, 2)}\n`);
}

if (cmd === 'sign') {
  const res = signPortfolioFiles({ portfolioDir });
  print(res);
  process.exit(res.ok ? 0 : 1);
} else if (cmd === 'verify') {
  const res = verifyPortfolioFiles({ portfolioDir });
  print(res);
  // exit non-zero only on a positive tamper detection
  process.exit(res.state === 'tampered' ? 2 : 0);
} else {
  process.stderr.write(`Unknown command "${cmd}". Use "sign" or "verify".\n`);
  process.exit(64);
}
