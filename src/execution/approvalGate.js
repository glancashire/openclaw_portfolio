'use strict';

/**
 * src/execution/approvalGate.js
 *
 * Phase D — code-level approval gate.
 *
 * Refuses to let a runner script transmit unless a valid intent artefact
 * exists for the supplied approvalId, the artefact is fresh, scoped to
 * the calling script, and contains a matching safe-word or PIN.
 *
 * Bypass: setting OPENCLAW_SKIP_APPROVAL_GATE=1 logs a loud warning and
 * proceeds, BUT only when OPENCLAW_PLACE_LIVE_ORDER is NOT '1'. Live
 * transmission cannot skip the gate.
 *
 * Env config (NEVER logged):
 *   OPENCLAW_APPROVAL_SAFEWORD
 *   OPENCLAW_APPROVAL_PIN
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_MAX_AGE_MIN = 30;
const VALID_SCOPES = new Set(['basket-execute', 'trades-execute']);
// L2.C — baskets at/above this CHF notional require a second-party co-sign
// from a distinct channel. Override via OPENCLAW_MULTI_PARTY_THRESHOLD_CHF.
const DEFAULT_MULTI_PARTY_THRESHOLD_CHF = 25000;

function intentPath(rootDir, approvalId) {
  return path.join(rootDir, 'runtime', 'approval-intent', `${approvalId}.json`);
}

class ApprovalGateError extends Error {
  constructor(reason, message) {
    super(message);
    this.code   = 'APPROVAL_GATE_DENIED';
    this.reason = reason;
  }
}

/**
 * @param {object} params
 * @param {string} params.approvalId        the approval being executed
 * @param {string} params.rootDir           workspace root
 * @param {object} [params.env]             defaults to process.env
 * @param {string} params.scriptName        symbolic name of the caller (used in error messages)
 * @param {string} params.scope             'basket-execute' or 'trades-execute'
 * @param {number} [params.maxAgeMinutes]   freshness threshold, default 30
 * @param {number} [params.notionalChf]     basket CHF notional; drives L2.C co-sign gate
 * @param {number} [params.multiPartyThresholdChf] override for the co-sign threshold
 * @param {function} [params.logger]        message logger, default console.warn for bypass
 * @returns {void} — throws ApprovalGateError on denial
 */
function requireApprovalIntent({
  approvalId,
  rootDir,
  env = process.env,
  scriptName,
  scope,
  maxAgeMinutes = DEFAULT_MAX_AGE_MIN,
  notionalChf = null,
  multiPartyThresholdChf = null,
  logger = console.warn,
} = {}) {
  if (!approvalId)        throw new Error('requireApprovalIntent: approvalId required');
  if (!rootDir)           throw new Error('requireApprovalIntent: rootDir required');
  if (!scriptName)        throw new Error('requireApprovalIntent: scriptName required');
  if (!VALID_SCOPES.has(scope)) {
    throw new Error(`requireApprovalIntent: scope must be one of ${[...VALID_SCOPES].join(', ')}`);
  }

  // --- Bypass handling ---
  if (String(env.OPENCLAW_SKIP_APPROVAL_GATE || '') === '1') {
    if (String(env.OPENCLAW_PLACE_LIVE_ORDER || '') === '1') {
      throw new ApprovalGateError(
        'bypass_refused_live',
        `${scriptName}: OPENCLAW_SKIP_APPROVAL_GATE=1 cannot be combined with OPENCLAW_PLACE_LIVE_ORDER=1. Live transmission requires a valid intent artefact.`,
      );
    }
    logger(`⚠️  ${scriptName}: OPENCLAW_SKIP_APPROVAL_GATE=1 — approval gate bypassed (live transmission disabled).`);
    return { bypassed: true };
  }

  // --- Configured-ness check ---
  const cfgSafeWord = String(env.OPENCLAW_APPROVAL_SAFEWORD || '').trim();
  const cfgPin      = String(env.OPENCLAW_APPROVAL_PIN || '').trim();
  if (!cfgSafeWord && !cfgPin) {
    throw new ApprovalGateError(
      'gate_unconfigured',
      `${scriptName}: approval gate is not configured (OPENCLAW_APPROVAL_SAFEWORD and OPENCLAW_APPROVAL_PIN both unset). Refusing.`,
    );
  }

  // --- Intent artefact ---
  const p = intentPath(rootDir, approvalId);
  if (!fs.existsSync(p)) {
    throw new ApprovalGateError(
      'no_intent',
      `${scriptName}: no approval intent artefact for ${approvalId}. Operator must register intent (with safe-word/PIN) before transmission.`,
    );
  }
  let artefact;
  try {
    artefact = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (err) {
    throw new ApprovalGateError(
      'no_intent',
      `${scriptName}: approval intent for ${approvalId} is unreadable (${err.message}).`,
    );
  }

  if (String(artefact.approvalId || '') !== String(approvalId)) {
    throw new ApprovalGateError('id_mismatch', `${scriptName}: intent.approvalId does not match expected ${approvalId}.`);
  }
  if (String(artefact.scope || '') !== scope) {
    throw new ApprovalGateError('scope_mismatch', `${scriptName}: intent.scope is "${artefact.scope}", expected "${scope}".`);
  }
  const issuedAt = Date.parse(String(artefact.issuedAt || ''));
  if (!Number.isFinite(issuedAt)) {
    throw new ApprovalGateError('stale', `${scriptName}: intent.issuedAt is missing or unparseable.`);
  }
  const ageMin = (Date.now() - issuedAt) / 60000;
  if (ageMin > maxAgeMinutes) {
    throw new ApprovalGateError('stale', `${scriptName}: intent for ${approvalId} is ${ageMin.toFixed(1)} min old (> ${maxAgeMinutes}); refusing.`);
  }
  if (ageMin < -1) {
    // Future-dated intent — treat as malformed.
    throw new ApprovalGateError('stale', `${scriptName}: intent for ${approvalId} is future-dated; refusing.`);
  }

  const intentSafeWord = String(artefact.safeWord || '').trim();
  const intentPin      = String(artefact.pin || '').trim();
  if (!intentSafeWord && !intentPin) {
    throw new ApprovalGateError('safeword_missing', `${scriptName}: intent for ${approvalId} contains neither safeWord nor pin.`);
  }
  const safeWordOk = intentSafeWord && cfgSafeWord && intentSafeWord === cfgSafeWord;
  const pinOk      = intentPin && cfgPin && intentPin === cfgPin;
  if (!safeWordOk && !pinOk) {
    throw new ApprovalGateError('safeword_mismatch', `${scriptName}: intent safe-word/PIN does not match configured value.`);
  }

  // --- L2.C multi-party co-sign (large baskets) ---
  const threshold = (multiPartyThresholdChf != null && Number.isFinite(Number(multiPartyThresholdChf)))
    ? Number(multiPartyThresholdChf)
    : (env.OPENCLAW_MULTI_PARTY_THRESHOLD_CHF != null && env.OPENCLAW_MULTI_PARTY_THRESHOLD_CHF !== '' && Number.isFinite(Number(env.OPENCLAW_MULTI_PARTY_THRESHOLD_CHF)))
      ? Number(env.OPENCLAW_MULTI_PARTY_THRESHOLD_CHF)
      : DEFAULT_MULTI_PARTY_THRESHOLD_CHF;
  const notional = (notionalChf != null) ? Number(notionalChf) : NaN;
  let multiParty = null;
  if (Number.isFinite(notional) && notional >= threshold) {
    const cfg2SafeWord = String(env.OPENCLAW_APPROVAL_SECOND_SAFEWORD || '').trim();
    const cfg2Pin      = String(env.OPENCLAW_APPROVAL_SECOND_PIN || '').trim();
    if (!cfg2SafeWord && !cfg2Pin) {
      throw new ApprovalGateError(
        'cosign_unconfigured',
        `${scriptName}: basket notional CHF ${notional.toFixed(0)} ≥ ${threshold} requires a second approver, but OPENCLAW_APPROVAL_SECOND_SAFEWORD/PIN are unset.`,
      );
    }
    const second = artefact.secondParty && typeof artefact.secondParty === 'object' ? artefact.secondParty : null;
    if (!second) {
      throw new ApprovalGateError(
        'cosign_missing',
        `${scriptName}: basket notional CHF ${notional.toFixed(0)} ≥ ${threshold} requires a second-party co-sign; intent has none.`,
      );
    }
    const s2SafeWord = String(second.safeWord || '').trim();
    const s2Pin      = String(second.pin || '').trim();
    if (!s2SafeWord && !s2Pin) {
      throw new ApprovalGateError('cosign_missing', `${scriptName}: secondParty contains neither safeWord nor pin.`);
    }
    const s2SafeWordOk = s2SafeWord && cfg2SafeWord && s2SafeWord === cfg2SafeWord;
    const s2PinOk      = s2Pin && cfg2Pin && s2Pin === cfg2Pin;
    if (!s2SafeWordOk && !s2PinOk) {
      throw new ApprovalGateError('cosign_mismatch', `${scriptName}: second-party safe-word/PIN does not match configured second approver.`);
    }
    // Co-signer must originate from a channel distinct from the primary approval
    // to enforce genuine two-party control (not the same operator twice).
    const primaryChannel = String(artefact.channel || '').trim().toLowerCase();
    const secondChannel  = String(second.channel || '').trim().toLowerCase();
    if (!secondChannel) {
      throw new ApprovalGateError('cosign_channel_missing', `${scriptName}: second-party co-sign must declare its channel.`);
    }
    if (primaryChannel && secondChannel === primaryChannel) {
      throw new ApprovalGateError('cosign_same_channel', `${scriptName}: second-party co-sign must come from a channel distinct from the primary approval (both "${secondChannel}").`);
    }
    const s2IssuedAt = Date.parse(String(second.issuedAt || artefact.issuedAt || ''));
    if (Number.isFinite(s2IssuedAt)) {
      const s2AgeMin = (Date.now() - s2IssuedAt) / 60000;
      if (s2AgeMin > maxAgeMinutes) {
        throw new ApprovalGateError('cosign_stale', `${scriptName}: second-party co-sign is ${s2AgeMin.toFixed(1)} min old (> ${maxAgeMinutes}); refusing.`);
      }
    }
    multiParty = { required: true, secondChannel, thresholdChf: threshold, notionalChf: notional };
  } else if (Number.isFinite(notional)) {
    multiParty = { required: false, thresholdChf: threshold, notionalChf: notional };
  }

  return { bypassed: false, ageMinutes: ageMin, multiParty };
}

/**
 * Helper for the (future) approve-and-execute wrapper. Writes an intent
 * artefact to disk. NEVER logs the safe-word or PIN.
 */
function writeApprovalIntent({
  approvalId,
  rootDir,
  scope,
  safeWord,
  pin,
  channel,
  secondParty,
  issuedAt = new Date().toISOString(),
} = {}) {
  if (!approvalId) throw new Error('writeApprovalIntent: approvalId required');
  if (!rootDir)    throw new Error('writeApprovalIntent: rootDir required');
  if (!VALID_SCOPES.has(scope)) {
    throw new Error(`writeApprovalIntent: scope must be one of ${[...VALID_SCOPES].join(', ')}`);
  }
  if (!safeWord && !pin) {
    throw new Error('writeApprovalIntent: safeWord or pin required');
  }
  const p = intentPath(rootDir, approvalId);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const payload = { approvalId, scope, issuedAt };
  if (safeWord) payload.safeWord = String(safeWord);
  if (pin)      payload.pin      = String(pin);
  if (channel)  payload.channel  = String(channel);
  if (secondParty && typeof secondParty === 'object') {
    const sp = {};
    if (secondParty.safeWord) sp.safeWord = String(secondParty.safeWord);
    if (secondParty.pin)      sp.pin      = String(secondParty.pin);
    if (secondParty.channel)  sp.channel  = String(secondParty.channel);
    sp.issuedAt = String(secondParty.issuedAt || issuedAt);
    payload.secondParty = sp;
  }
  fs.writeFileSync(p, JSON.stringify(payload, null, 2));
  // Lock down perms so other users on the box can't read the safe-word.
  try { fs.chmodSync(p, 0o600); } catch (_) { /* best-effort */ }
  return p;
}

/**
 * Delete the approval-intent file after a transmit attempt completes
 * (success or failure). Prevents intent reuse within the freshness
 * window — a fresh approval is required for each transmit attempt.
 *
 * @param {object} params
 * @param {string} params.approvalId
 * @param {string} params.rootDir
 * @returns {{ deleted: boolean, path: string, reason?: string }}
 */
function consumeApprovalIntent({ approvalId, rootDir } = {}) {
  if (!approvalId) throw new Error('consumeApprovalIntent: approvalId required');
  if (!rootDir)    throw new Error('consumeApprovalIntent: rootDir required');
  const p = intentPath(rootDir, approvalId);
  if (!fs.existsSync(p)) {
    return { deleted: false, path: p, reason: 'not_found' };
  }
  try {
    fs.unlinkSync(p);
    return { deleted: true, path: p };
  } catch (err) {
    return { deleted: false, path: p, reason: `unlink_failed:${err.code || err.message}` };
  }
}

module.exports = {
  requireApprovalIntent,
  writeApprovalIntent,
  consumeApprovalIntent,
  ApprovalGateError,
  _intentPath: intentPath,
};
