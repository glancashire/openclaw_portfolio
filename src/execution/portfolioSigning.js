'use strict';

/**
 * Portfolio control-file signing + tamper detection (Phase L2.A, 2026-07-28)
 *
 * `portfolio.md` (and optionally `memory/*.md`) are read as *authority* by
 * execution, safety, and approval paths — the approved-instruments table,
 * execution mode, and approval flags all come from portfolio.md. Nothing
 * currently detects out-of-band edits to those files between the moment an
 * operator reviewed them and the moment automation acts on them.
 *
 * This module adds a lightweight HMAC-SHA256 signature layer:
 *   - `signPortfolioFiles(...)`  → compute + persist signatures (operator ran
 *     an explicit "trust current state" step, e.g. after editing portfolio.md)
 *   - `verifyPortfolioFiles(...)` → recompute + compare; returns a structured
 *     status without throwing
 *   - `requireTrustedPortfolio(...)` → verify + throw when enforcing
 *
 * Design constraints:
 *   - Additive + advisory by default. Verification returns `{ ok, state, ... }`;
 *     callers opt into enforcement. Absence of a manifest is `unsigned`, never
 *     a hard failure, so existing flows are unchanged until an operator signs.
 *   - Secret lives in env only (OPENCLAW_PORTFOLIO_SIGNING_KEY). If unset,
 *     signing/verification is disabled and reported as `disabled` — we never
 *     invent a key or persist one to disk.
 *   - The signature manifest never contains file contents or the key.
 *
 * Manifest: runtime/portfolio-signatures/<portfolio>/signatures.json
 *   {
 *     "version": 1,
 *     "signedAt": "ISO",
 *     "algo": "HMAC-SHA256",
 *     "files": { "portfolio.md": { "sig": "<hex>", "bytes": <n> }, ... }
 *   }
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MANIFEST_VERSION = 1;
const ALGO = 'HMAC-SHA256';
const DEFAULT_SIGNED_FILES = ['portfolio.md'];

function resolveKey(env = process.env) {
  const key = env.OPENCLAW_PORTFOLIO_SIGNING_KEY;
  if (key == null || String(key).trim() === '') return null;
  return String(key);
}

function manifestPath(portfolioDir) {
  const portfolioName = path.basename(portfolioDir);
  const repoRoot = path.resolve(portfolioDir, '..', '..');
  return path.join(repoRoot, 'runtime', 'portfolio-signatures', portfolioName, 'signatures.json');
}

function computeSignature(bytes, key) {
  return crypto.createHmac('sha256', key).update(bytes).digest('hex');
}

/**
 * Compute signatures for the given control files. Pure — does not persist.
 * Returns { files: { name: { sig, bytes } }, missing: [names] }.
 */
function computeSignatures({ portfolioDir, files = DEFAULT_SIGNED_FILES, key }) {
  const out = { files: {}, missing: [] };
  for (const rel of files) {
    const abs = path.join(portfolioDir, rel);
    if (!fs.existsSync(abs)) {
      out.missing.push(rel);
      continue;
    }
    const buf = fs.readFileSync(abs);
    out.files[rel] = { sig: computeSignature(buf, key), bytes: buf.length };
  }
  return out;
}

/**
 * Persist signatures for the current control-file state ("trust this state").
 * Returns { ok, state, manifestPath, signed: [names], missing: [names] }.
 */
function signPortfolioFiles({ portfolioDir, files = DEFAULT_SIGNED_FILES, env = process.env } = {}) {
  const key = resolveKey(env);
  if (!key) {
    return { ok: false, state: 'disabled', reason: 'no_signing_key', signed: [], missing: [] };
  }
  const computed = computeSignatures({ portfolioDir, files, key });
  const signedNames = Object.keys(computed.files);
  if (signedNames.length === 0) {
    return { ok: false, state: 'no_files', reason: 'no_signable_files', signed: [], missing: computed.missing };
  }
  const manifest = {
    version: MANIFEST_VERSION,
    signedAt: new Date().toISOString(),
    algo: ALGO,
    files: computed.files,
  };
  const mp = manifestPath(portfolioDir);
  fs.mkdirSync(path.dirname(mp), { recursive: true });
  fs.writeFileSync(mp, `${JSON.stringify(manifest, null, 2)}\n`);
  return { ok: true, state: 'signed', manifestPath: mp, signed: signedNames, missing: computed.missing };
}

/**
 * Verify current control-file state against the persisted manifest.
 * Never throws. Returns:
 *   { ok, state, reason?, tampered: [names], missing: [names], unsignedFiles: [names] }
 * States:
 *   - 'disabled'   : no signing key configured (verification not requested)
 *   - 'unsigned'   : no manifest present (nothing to compare against)
 *   - 'verified'   : all signed files match
 *   - 'tampered'   : one or more signed files differ / are missing
 */
function verifyPortfolioFiles({ portfolioDir, env = process.env } = {}) {
  const key = resolveKey(env);
  if (!key) {
    return { ok: true, state: 'disabled', reason: 'no_signing_key', tampered: [], missing: [], unsignedFiles: [] };
  }
  const mp = manifestPath(portfolioDir);
  if (!fs.existsSync(mp)) {
    return { ok: true, state: 'unsigned', reason: 'no_manifest', tampered: [], missing: [], unsignedFiles: [] };
  }
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(mp, 'utf8'));
  } catch {
    return { ok: false, state: 'tampered', reason: 'manifest_unreadable', tampered: [], missing: [], unsignedFiles: [] };
  }
  const signedFiles = manifest && manifest.files && typeof manifest.files === 'object' ? manifest.files : {};
  const names = Object.keys(signedFiles);
  if (names.length === 0) {
    return { ok: false, state: 'tampered', reason: 'manifest_empty', tampered: [], missing: [], unsignedFiles: [] };
  }
  const tampered = [];
  const missing = [];
  for (const rel of names) {
    const abs = path.join(portfolioDir, rel);
    if (!fs.existsSync(abs)) {
      missing.push(rel);
      continue;
    }
    const buf = fs.readFileSync(abs);
    const actual = computeSignature(buf, key);
    const expected = String(signedFiles[rel].sig || '');
    // constant-time compare on equal-length hex digests
    const equal = actual.length === expected.length
      && crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
    if (!equal) tampered.push(rel);
  }
  if (tampered.length > 0 || missing.length > 0) {
    return {
      ok: false,
      state: 'tampered',
      reason: tampered.length > 0 ? 'signature_mismatch' : 'signed_file_missing',
      tampered,
      missing,
      unsignedFiles: [],
      signedAt: manifest.signedAt,
    };
  }
  return { ok: true, state: 'verified', tampered: [], missing: [], unsignedFiles: [], signedAt: manifest.signedAt };
}

class PortfolioTamperError extends Error {
  constructor(message, detail = {}) {
    super(message);
    this.name = 'PortfolioTamperError';
    this.code = 'PORTFOLIO_TAMPER_DETECTED';
    Object.assign(this, detail);
  }
}

/**
 * Enforcing wrapper for execution preflight. Only throws on a *positive*
 * tamper detection (state === 'tampered'). `disabled`/`unsigned`/`verified`
 * all pass, so enabling this in a preflight cannot break unsigned setups —
 * it only fires once an operator has signed and the files later diverge.
 */
function requireTrustedPortfolio({ portfolioDir, env = process.env, label = 'portfolio-signing' } = {}) {
  const result = verifyPortfolioFiles({ portfolioDir, env });
  if (result.state === 'tampered') {
    const files = [...result.tampered, ...result.missing].join(', ');
    throw new PortfolioTamperError(
      `${label}: portfolio control files failed signature verification (${result.reason}: ${files}). ` +
      `Re-review and re-sign before live action.`,
      { reason: result.reason, tampered: result.tampered, missing: result.missing },
    );
  }
  return result;
}

module.exports = {
  MANIFEST_VERSION,
  ALGO,
  DEFAULT_SIGNED_FILES,
  manifestPath,
  computeSignatures,
  signPortfolioFiles,
  verifyPortfolioFiles,
  requireTrustedPortfolio,
  PortfolioTamperError,
};
