'use strict';

/**
 * Unit tests for lib/mailgunInbound.js.
 */

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { verifyMailgunSignature, parseInboundApproval, acceptInboundApproval, _defaults }
  = require('../lib/mailgunInbound');

let asserted = 0;
function ok(label, cond, extra) {
  if (!cond && extra !== undefined) console.error('extra:', JSON.stringify(extra).slice(0, 300));
  assert.ok(cond, label);
  console.log('  ok —', label);
  asserted++;
}

const SIGNING_KEY = 'key-test-sign-1234';
const SECRET      = 'shortseller';
const APPROVAL_ID = 'basket-etf-20260603T0944';
const SENDER_OK   = 'glancashire@example.com';

function sign({ timestamp, token, key = SIGNING_KEY }) {
  return crypto.createHmac('sha256', key).update(`${timestamp}${token}`).digest('hex');
}

function freshLedger() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mg-inbound-'));
  return path.join(dir, 'ledger.json');
}

function makePayload({ approvalId = APPROVAL_ID, secret = SECRET, secretField = 'safeWord', sender = SENDER_OK, now = Date.now() } = {}) {
  const timestamp = Math.floor(now / 1000).toString();
  const token = crypto.randomBytes(16).toString('hex');
  const body = [
    `approvalId: ${approvalId}`,
    `${secretField}: ${secret}`,
    '',
    'approve.',
  ].join('\n');
  return {
    timestamp,
    token,
    signature: sign({ timestamp, token }),
    sender,
    subject: `Re: [${approvalId}] OpenClaw approval`,
    'body-plain': body,
  };
}

// --- verifyMailgunSignature ---
{
  const p = makePayload({ now: Date.now() });
  ok('signature: valid payload verifies', verifyMailgunSignature({ ...p, signingKey: SIGNING_KEY }));
  ok('signature: missing args returns false', !verifyMailgunSignature({ timestamp: p.timestamp, token: p.token, signature: '', signingKey: SIGNING_KEY }));
  ok('signature: wrong signing key fails', !verifyMailgunSignature({ ...p, signingKey: 'other' }));
  ok('signature: tampered token fails', !verifyMailgunSignature({ ...p, token: p.token + 'x', signingKey: SIGNING_KEY }));
  ok('signature: tampered timestamp fails', !verifyMailgunSignature({ ...p, timestamp: '1', signingKey: SIGNING_KEY }));
  // Length mismatch (no length leak)
  ok('signature: shorter signature returns false', !verifyMailgunSignature({ ...p, signature: 'abc', signingKey: SIGNING_KEY }));
}

// --- parseInboundApproval ---
{
  const p = makePayload();
  const out = parseInboundApproval({ payload: p, knownSenders: [SENDER_OK] });
  ok('parse: approvalId from body', out.approvalId === APPROVAL_ID);
  ok('parse: secret from body',     out.secret === SECRET);
  ok('parse: matched=safeWord',     out.matched === 'safeWord');
  ok('parse: allowed=true',         out.allowed === true);
}

{
  // approvalId only in subject
  const p = makePayload();
  p['body-plain'] = `safeWord: ${SECRET}\n\napprove.`;
  const out = parseInboundApproval({ payload: p });
  ok('parse: approvalId falls back to subject', out.approvalId === APPROVAL_ID);
}

{
  const p = makePayload({ secretField: 'pin', secret: '8755' });
  const out = parseInboundApproval({ payload: p });
  ok('parse: PIN extracted',   out.secret === '8755');
  ok('parse: matched=pin',     out.matched === 'pin');
}

{
  // Off-allowlist sender
  const p = makePayload({ sender: 'attacker@evil.example' });
  const out = parseInboundApproval({ payload: p, knownSenders: [SENDER_OK] });
  ok('parse: off-allowlist sender → allowed=false', out.allowed === false);
  ok('parse: reason=sender_not_allowed',            out.reason === 'sender_not_allowed');
}

{
  // Allowlist case-insensitive
  const p = makePayload({ sender: 'Glancashire@Example.com' });
  const out = parseInboundApproval({ payload: p, knownSenders: ['glancashire@example.com'] });
  ok('parse: allowlist match is case-insensitive', out.allowed === true);
}

{
  // No approvalId, no secret
  const out = parseInboundApproval({ payload: { sender: SENDER_OK, subject: 're: hello', 'body-plain': 'hi' } });
  ok('parse: no approvalId returns null',  out.approvalId === null);
  ok('parse: no secret returns null',      out.secret === null);
}

// --- acceptInboundApproval ---
{
  const ledger = freshLedger();
  const p = makePayload();
  const res = acceptInboundApproval({
    payload: p,
    env: { MAILGUN_WEBHOOK_SIGNING_KEY: SIGNING_KEY },
    knownSenders: [SENDER_OK],
    ledgerPath: ledger,
  });
  ok('accept: happy path → ok=true',          res.ok === true);
  ok('accept: returns approvalId',            res.approvalId === APPROVAL_ID);
  ok('accept: returns secret',                res.secret === SECRET);
  ok('accept: returns matched=safeWord',      res.matched === 'safeWord');
  ok('accept: ledger now contains token',     JSON.parse(fs.readFileSync(ledger, 'utf8')).tokens[p.token] !== undefined);

  // Replay
  const res2 = acceptInboundApproval({
    payload: p,
    env: { MAILGUN_WEBHOOK_SIGNING_KEY: SIGNING_KEY },
    knownSenders: [SENDER_OK],
    ledgerPath: ledger,
  });
  ok('accept: same token replay → ok=false', res2.ok === false);
  ok('accept: replay reason="replay"',       res2.reason === 'replay');
}

{
  // bad signature
  const ledger = freshLedger();
  const p = makePayload();
  p.signature = 'deadbeef'.repeat(8);
  const res = acceptInboundApproval({
    payload: p,
    env: { MAILGUN_WEBHOOK_SIGNING_KEY: SIGNING_KEY },
    knownSenders: [SENDER_OK],
    ledgerPath: ledger,
  });
  ok('accept: bad signature → ok=false',     res.ok === false);
  ok('accept: reason=bad_signature',         res.reason === 'bad_signature');
  ok('accept: bad signature does NOT touch ledger', !fs.existsSync(ledger));
}

{
  // stale timestamp (10 minutes ago)
  const ledger = freshLedger();
  const p = makePayload({ now: Date.now() - 10 * 60 * 1000 });
  const res = acceptInboundApproval({
    payload: p,
    env: { MAILGUN_WEBHOOK_SIGNING_KEY: SIGNING_KEY },
    knownSenders: [SENDER_OK],
    ledgerPath: ledger,
  });
  ok('accept: stale timestamp → ok=false', res.ok === false);
  ok('accept: reason=stale_timestamp',     res.reason === 'stale_timestamp');
}

{
  // sender not allowed
  const ledger = freshLedger();
  const p = makePayload({ sender: 'attacker@evil.example' });
  const res = acceptInboundApproval({
    payload: p,
    env: { MAILGUN_WEBHOOK_SIGNING_KEY: SIGNING_KEY },
    knownSenders: [SENDER_OK],
    ledgerPath: ledger,
  });
  ok('accept: bad sender → ok=false',          res.ok === false);
  ok('accept: reason=sender_not_allowed',      res.reason === 'sender_not_allowed');
}

{
  // no approval id
  const ledger = freshLedger();
  const p = makePayload();
  p['body-plain'] = `safeWord: ${SECRET}\n\napprove.`;
  p.subject = 'Re: hello';
  const res = acceptInboundApproval({
    payload: p,
    env: { MAILGUN_WEBHOOK_SIGNING_KEY: SIGNING_KEY },
    knownSenders: [SENDER_OK],
    ledgerPath: ledger,
  });
  ok('accept: no approvalId → ok=false',  res.ok === false);
  ok('accept: reason=no_approval_id',     res.reason === 'no_approval_id');
}

{
  // no secret
  const ledger = freshLedger();
  const p = makePayload();
  p['body-plain'] = `approvalId: ${APPROVAL_ID}\n\napprove.`;
  const res = acceptInboundApproval({
    payload: p,
    env: { MAILGUN_WEBHOOK_SIGNING_KEY: SIGNING_KEY },
    knownSenders: [SENDER_OK],
    ledgerPath: ledger,
  });
  ok('accept: no secret → ok=false',  res.ok === false);
  ok('accept: reason=no_secret',      res.reason === 'no_secret');
}

{
  // gate unconfigured
  const ledger = freshLedger();
  const p = makePayload();
  const res = acceptInboundApproval({
    payload: p,
    env: {},
    knownSenders: [SENDER_OK],
    ledgerPath: ledger,
  });
  ok('accept: missing signing key → ok=false', res.ok === false);
  ok('accept: reason=gate_unconfigured',       res.reason === 'gate_unconfigured');
}

{
  // ledger retention: synthetic now() to expire an entry
  const ledger = freshLedger();
  const p1 = makePayload();
  let nowMs = Date.now();
  const env = { MAILGUN_WEBHOOK_SIGNING_KEY: SIGNING_KEY };

  acceptInboundApproval({
    payload: p1, env, knownSenders: [SENDER_OK], ledgerPath: ledger, now: () => nowMs,
  });
  ok('retention: token recorded after first accept',
     JSON.parse(fs.readFileSync(ledger, 'utf8')).tokens[p1.token] !== undefined);

  // Advance time by 25 hours, then post a different payload to trigger prune.
  nowMs += 25 * 60 * 60 * 1000;
  const p2 = makePayload({ now: nowMs });
  acceptInboundApproval({
    payload: p2, env, knownSenders: [SENDER_OK], ledgerPath: ledger, now: () => nowMs,
  });
  const after = JSON.parse(fs.readFileSync(ledger, 'utf8'));
  ok('retention: old token pruned',     after.tokens[p1.token] === undefined);
  ok('retention: new token retained',   after.tokens[p2.token] !== undefined);
}

console.log(JSON.stringify({ ok: true, asserted }));
