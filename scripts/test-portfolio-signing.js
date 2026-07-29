'use strict';
// Phase L2.A — portfolio control-file signing + tamper detection.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  signPortfolioFiles,
  verifyPortfolioFiles,
  requireTrustedPortfolio,
  PortfolioTamperError,
} = require('../src/execution/portfolioSigning');

let passed = 0;
function ok(cond, msg) { assert.ok(cond, msg); passed += 1; }

// Build a throwaway repo layout: <root>/portfolio/<name>/portfolio.md
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sign-test-'));
const portfolioDir = path.join(root, 'portfolio', 'etf');
fs.mkdirSync(portfolioDir, { recursive: true });
const portfolioFile = path.join(portfolioDir, 'portfolio.md');
fs.writeFileSync(portfolioFile, '# Portfolio\nStatus: active\n');

const KEY = 'test-signing-key-abc123';
const env = { OPENCLAW_PORTFOLIO_SIGNING_KEY: KEY };

// 1) No key → disabled, fails open
let r = verifyPortfolioFiles({ portfolioDir, env: {} });
ok(r.ok === true && r.state === 'disabled', 'no key → disabled/ok');
r = signPortfolioFiles({ portfolioDir, env: {} });
ok(r.ok === false && r.state === 'disabled', 'sign without key → disabled');

// 2) Key set, not yet signed → unsigned, fails open
r = verifyPortfolioFiles({ portfolioDir, env });
ok(r.ok === true && r.state === 'unsigned', 'key set, no manifest → unsigned/ok');

// 3) Sign → verified
r = signPortfolioFiles({ portfolioDir, env });
ok(r.ok === true && r.state === 'signed' && r.signed.includes('portfolio.md'), 'sign → signed');
ok(fs.existsSync(r.manifestPath), 'manifest persisted');
const manifest = JSON.parse(fs.readFileSync(r.manifestPath, 'utf8'));
ok(!JSON.stringify(manifest).includes(KEY), 'manifest never contains the key');
ok(manifest.files['portfolio.md'] && !('content' in manifest.files['portfolio.md']), 'manifest stores no file content');

r = verifyPortfolioFiles({ portfolioDir, env });
ok(r.ok === true && r.state === 'verified', 'unchanged file → verified');

// 4) Tamper → detected
fs.appendFileSync(portfolioFile, '\nStatus: TAMPERED\n');
r = verifyPortfolioFiles({ portfolioDir, env });
ok(r.ok === false && r.state === 'tampered' && r.tampered.includes('portfolio.md'), 'edited file → tampered');
ok(r.reason === 'signature_mismatch', 'tamper reason is signature_mismatch');

// 5) Enforcement throws only on tamper
assert.throws(
  () => requireTrustedPortfolio({ portfolioDir, env }),
  (e) => e instanceof PortfolioTamperError && e.code === 'PORTFOLIO_TAMPER_DETECTED',
  'requireTrustedPortfolio throws on tamper',
);
passed += 1;

// 6) Re-sign restores trust
r = signPortfolioFiles({ portfolioDir, env });
ok(r.ok === true, 're-sign ok');
r = verifyPortfolioFiles({ portfolioDir, env });
ok(r.state === 'verified', 're-signed → verified');
// enforcement passes now
requireTrustedPortfolio({ portfolioDir, env });
passed += 1;

// 7) Missing signed file → tampered (missing), enforcement throws
fs.rmSync(portfolioFile);
r = verifyPortfolioFiles({ portfolioDir, env });
ok(r.ok === false && r.state === 'tampered' && r.missing.includes('portfolio.md'), 'deleted signed file → tampered/missing');
ok(r.reason === 'signed_file_missing', 'reason signed_file_missing');

// 8) Wrong key → tamper (can't forge)
fs.writeFileSync(portfolioFile, '# Portfolio\nStatus: active\n');
signPortfolioFiles({ portfolioDir, env });
r = verifyPortfolioFiles({ portfolioDir, env: { OPENCLAW_PORTFOLIO_SIGNING_KEY: 'different-key' } });
ok(r.state === 'tampered', 'different key → tampered (signature does not validate)');

// 9) disabled/unsigned/verified never throw in enforcement
requireTrustedPortfolio({ portfolioDir, env: {} }); // disabled
passed += 1;

fs.rmSync(root, { recursive: true, force: true });
console.log(JSON.stringify({ ok: true, passed }, null, 2));
