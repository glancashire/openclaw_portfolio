'use strict';

/**
 * lib/mailgunInbound.js — Phase F
 *
 * Verifier + extractor for Mailgun inbound webhook POSTs. Does NOT host
 * an HTTP server; an outer process can call acceptInboundApproval() with
 * the raw payload and act on the result.
 *
 * Env:
 *   MAILGUN_WEBHOOK_SIGNING_KEY  required for signature verification
 *   MAILGUN_INBOUND_ALLOWED_SENDERS  comma-separated allowlist (default:
 *     reads from this var; caller may pass knownSenders explicitly).
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DEFAULT_TIMESTAMP_WINDOW_S = 5 * 60;        // 5 min
const DEFAULT_LEDGER_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 h
const DEFAULT_LEDGER_PATH = path.join(__dirname, '..', 'runtime', 'inbound-approvals-ledger.json');

/**
 * Verify a Mailgun webhook signature.
 * Mailgun signing: hmac-sha256(signingKey, timestamp + token), hex.
 *
 * @returns {boolean}
 */
function verifyMailgunSignature({ timestamp, token, signature, signingKey }) {
  if (!timestamp || !token || !signature || !signingKey) return false;
  const expected = crypto.createHmac('sha256', String(signingKey))
    .update(String(timestamp) + String(token))
    .digest('hex');
  // constant-time compare; require equal length
  const a = Buffer.from(expected,  'utf8');
  const b = Buffer.from(String(signature), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Extract an approvalId + secret from an inbound Mailgun payload.
 * Returns {approvalId, secret, sender, subject, bodyPlain, allowed, reason}.
 *
 * @param {object} args
 * @param {object} args.payload      Mailgun form fields (after parsing).
 * @param {Array<string>} [args.knownSenders]  allowlist (lowercased on
 *                                             compare). If empty, allow all.
 */
function parseInboundApproval({ payload = {}, knownSenders = [] } = {}) {
  const sender    = String(payload.sender || payload.from || '').trim().toLowerCase();
  const subject   = String(payload.subject || payload.Subject || '');
  const bodyPlain = String(payload['body-plain'] || payload.body_plain || payload.bodyPlain || '');

  const allowList = knownSenders.map((s) => String(s || '').trim().toLowerCase()).filter(Boolean);
  let allowed = true;
  let reason  = null;
  if (allowList.length > 0) {
    allowed = allowList.includes(sender);
    if (!allowed) reason = 'sender_not_allowed';
  }

  // Extract approvalId. Order of preference:
  //   1. body line:  approvalId: basket-etf-...
  //   2. subject:    [basket-etf-...]
  let approvalId = null;
  const bodyMatch = bodyPlain.match(/approvalid\s*[:=]\s*([A-Za-z0-9._-]+)/i);
  if (bodyMatch) {
    approvalId = bodyMatch[1];
  } else {
    const subjMatch = subject.match(/\b(basket-[A-Za-z0-9._-]+)\b/);
    if (subjMatch) approvalId = subjMatch[1];
  }

  // Extract secret. Operator includes it on its own line as "safeWord: ..."
  // or "pin: ...". Either may appear; we capture whichever is present.
  let secret = null;
  let matched = null;
  const swMatch = bodyPlain.match(/^\s*safe[\s_-]?word\s*[:=]\s*(\S+)/im);
  if (swMatch) { secret = swMatch[1]; matched = 'safeWord'; }
  if (!secret) {
    const pinMatch = bodyPlain.match(/^\s*pin\s*[:=]\s*(\S+)/im);
    if (pinMatch) { secret = pinMatch[1]; matched = 'pin'; }
  }

  return { approvalId, secret, matched, sender, subject, bodyPlain, allowed, reason };
}

/**
 * Full verify + dedupe + extract.
 *
 * @returns {object} { ok, approvalId, secret, matched, sender, reason }
 *   On failure, ok=false, reason ∈ { bad_signature, stale_timestamp,
 *   replay, sender_not_allowed, no_approval_id, no_secret }.
 */
function acceptInboundApproval({
  payload = {},
  env = process.env,
  knownSenders = null,
  ledgerPath = DEFAULT_LEDGER_PATH,
  timestampWindowS = DEFAULT_TIMESTAMP_WINDOW_S,
  retentionMs = DEFAULT_LEDGER_RETENTION_MS,
  now = Date.now,
} = {}) {
  const signingKey = String(env.MAILGUN_WEBHOOK_SIGNING_KEY || '').trim();
  if (!signingKey) {
    return { ok: false, reason: 'gate_unconfigured' };
  }
  const sigOk = verifyMailgunSignature({
    timestamp: payload.timestamp,
    token:     payload.token,
    signature: payload.signature,
    signingKey,
  });
  if (!sigOk) return { ok: false, reason: 'bad_signature' };

  // Timestamp window (Mailgun timestamp is unix seconds)
  const ts = Number(payload.timestamp);
  if (!Number.isFinite(ts)) return { ok: false, reason: 'stale_timestamp' };
  const skewS = Math.abs(now() / 1000 - ts);
  if (skewS > timestampWindowS) return { ok: false, reason: 'stale_timestamp' };

  // Sender allowlist
  const allowList = Array.isArray(knownSenders) && knownSenders.length
    ? knownSenders
    : String(env.MAILGUN_INBOUND_ALLOWED_SENDERS || '').split(',').map((s) => s.trim()).filter(Boolean);

  const parsed = parseInboundApproval({ payload, knownSenders: allowList });
  if (!parsed.allowed) return { ok: false, reason: parsed.reason || 'sender_not_allowed' };
  if (!parsed.approvalId) return { ok: false, reason: 'no_approval_id' };
  if (!parsed.secret)     return { ok: false, reason: 'no_secret' };

  // Dedupe via Mailgun token
  const ledger = readLedger(ledgerPath);
  pruneLedger(ledger, retentionMs, now());
  const tokenKey = String(payload.token);
  if (ledger.tokens[tokenKey]) {
    writeLedger(ledgerPath, ledger);
    return { ok: false, reason: 'replay' };
  }
  ledger.tokens[tokenKey] = { approvalId: parsed.approvalId, at: now() };
  writeLedger(ledgerPath, ledger);

  return {
    ok:         true,
    approvalId: parsed.approvalId,
    secret:     parsed.secret,
    matched:    parsed.matched,
    sender:     parsed.sender,
  };
}

function readLedger(p) {
  try {
    const raw = fs.readFileSync(p, 'utf8');
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object' && obj.tokens && typeof obj.tokens === 'object') return obj;
  } catch (_) { /* fall through */ }
  return { tokens: {} };
}

function pruneLedger(ledger, retentionMs, nowMs) {
  for (const k of Object.keys(ledger.tokens || {})) {
    const entry = ledger.tokens[k];
    if (!entry || typeof entry.at !== 'number') { delete ledger.tokens[k]; continue; }
    if (nowMs - entry.at > retentionMs) delete ledger.tokens[k];
  }
}

function writeLedger(p, ledger) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(ledger, null, 2));
}

module.exports = {
  verifyMailgunSignature,
  parseInboundApproval,
  acceptInboundApproval,
  _defaults: {
    DEFAULT_TIMESTAMP_WINDOW_S,
    DEFAULT_LEDGER_RETENTION_MS,
    DEFAULT_LEDGER_PATH,
  },
};
