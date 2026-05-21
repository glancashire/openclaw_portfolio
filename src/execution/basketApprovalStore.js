'use strict';

const fs = require('fs');
const path = require('path');

const APPROVAL_SCHEMA_VERSION = '1.0';

function approvalsRoot(rootDir = process.cwd()) {
  return path.join(rootDir, 'runtime', 'approved-order-baskets');
}

function portfolioApprovalDir(portfolio, rootDir = process.cwd()) {
  if (!portfolio) throw new Error('portfolio is required');
  return path.join(approvalsRoot(rootDir), portfolio);
}

function approvalPath({ portfolio, approvalId, rootDir = process.cwd() }) {
  if (!approvalId) throw new Error('approvalId is required');
  return path.join(portfolioApprovalDir(portfolio, rootDir), `${approvalId}.json`);
}

function normalizeLeg(raw = {}, index = 0) {
  const instrument = String(raw.instrument || raw.tickerOrIsin || '').trim();
  const symbol = String(raw.ibkrSymbol || raw.symbol || '').trim().toUpperCase();
  const conid = raw.conid == null ? null : String(raw.conid).trim();
  const action = String(raw.action || '').trim().toUpperCase();
  const quantity = Number(raw.quantity ?? raw.maxQuantity ?? 0);
  const limitPrice = Number(raw.limitPrice ?? raw.maxBuyPrice ?? raw.minSellPrice ?? 0);
  const currency = String(raw.currency || '').trim().toUpperCase();
  const exchange = String(raw.exchange || 'SMART').trim().toUpperCase();
  const primaryExchange = String(raw.primaryExchange || '').trim().toUpperCase() || null;
  const maxAttempts = Number(raw.maxAttempts ?? raw.allowedAttempts ?? 1);
  const retryPolicy = String(raw.retryPolicy || 'none').trim();

  return {
    legId: String(raw.legId || `leg-${index + 1}`),
    instrument,
    ibkrSymbol: symbol || null,
    conid,
    action,
    quantity,
    limitPrice,
    currency: currency || null,
    exchange,
    primaryExchange,
    maxAttempts,
    retryPolicy,
    allowSubstitution: raw.allowSubstitution === true,
    status: String(raw.status || 'approved').trim(),
    reason: String(raw.reason || '').trim() || null,
  };
}

function validateApprovalEnvelope(input = {}, now = new Date()) {
  const approvalId = String(input.approvalId || '').trim();
  const portfolio = String(input.portfolio || '').trim();
  const expiresAt = String(input.expiresAt || '').trim();
  const createdAt = String(input.createdAt || new Date().toISOString()).trim();
  const legs = Array.isArray(input.legs) ? input.legs.map((leg, index) => normalizeLeg(leg, index)) : [];

  const errors = [];
  if (!approvalId) errors.push('approvalId is required');
  if (!portfolio) errors.push('portfolio is required');
  if (!expiresAt) errors.push('expiresAt is required');
  if (Number.isNaN(Date.parse(expiresAt))) errors.push('expiresAt must be a valid ISO timestamp');
  if (Number.isNaN(Date.parse(createdAt))) errors.push('createdAt must be a valid ISO timestamp');
  if (legs.length === 0) errors.push('at least one approved leg is required');

  const seenLegIds = new Set();
  for (const leg of legs) {
    if (!leg.legId) errors.push('each leg requires legId');
    if (seenLegIds.has(leg.legId)) errors.push(`duplicate legId: ${leg.legId}`);
    seenLegIds.add(leg.legId);
    if (!leg.instrument) errors.push(`leg ${leg.legId} requires instrument`);
    if (!leg.action || !['BUY', 'SELL'].includes(leg.action)) errors.push(`leg ${leg.legId} requires BUY or SELL action`);
    if (!Number.isFinite(leg.quantity) || leg.quantity <= 0) errors.push(`leg ${leg.legId} requires positive quantity`);
    if (!Number.isFinite(leg.limitPrice) || leg.limitPrice <= 0) errors.push(`leg ${leg.legId} requires positive limitPrice`);
    if (!leg.currency) errors.push(`leg ${leg.legId} requires currency`);
    if (!Number.isFinite(leg.maxAttempts) || leg.maxAttempts < 1) errors.push(`leg ${leg.legId} requires maxAttempts >= 1`);
  }

  const expired = !Number.isNaN(Date.parse(expiresAt)) && new Date(expiresAt).getTime() <= now.getTime();
  if (expired) errors.push('approval envelope is expired');

  return {
    ok: errors.length === 0,
    errors,
    envelope: {
      schemaVersion: APPROVAL_SCHEMA_VERSION,
      approvalId,
      portfolio,
      createdAt,
      expiresAt,
      executionPolicy: {
        continueOnIndependentFailure: input.executionPolicy?.continueOnIndependentFailure !== false,
        requireCompactReapprovalOnPriceDrift: input.executionPolicy?.requireCompactReapprovalOnPriceDrift !== false,
        substitutionAllowed: input.executionPolicy?.substitutionAllowed === true,
      },
      legs,
      summary: String(input.summary || '').trim() || null,
      source: String(input.source || 'operator_approved').trim(),
    },
  };
}

function saveApprovalEnvelope(input = {}, options = {}) {
  const validation = validateApprovalEnvelope(input, options.now || new Date());
  if (!validation.ok) {
    const error = new Error(`Invalid approval envelope: ${validation.errors.join('; ')}`);
    error.validationErrors = validation.errors;
    throw error;
  }
  const outPath = approvalPath({
    portfolio: validation.envelope.portfolio,
    approvalId: validation.envelope.approvalId,
    rootDir: options.rootDir,
  });
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(validation.envelope, null, 2));
  return { path: outPath, envelope: validation.envelope };
}

function loadApprovalEnvelope({ portfolio, approvalId, rootDir = process.cwd(), now = new Date() }) {
  const filePath = approvalPath({ portfolio, approvalId, rootDir });
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const validation = validateApprovalEnvelope(raw, now);
  if (!validation.ok) {
    const error = new Error(`Stored approval envelope is invalid: ${validation.errors.join('; ')}`);
    error.validationErrors = validation.errors;
    throw error;
  }
  return { path: filePath, envelope: validation.envelope };
}

function listApprovalEnvelopes({ portfolio, rootDir = process.cwd(), now = new Date(), includeExpired = false } = {}) {
  const dir = portfolioApprovalDir(portfolio, rootDir);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => {
      const filePath = path.join(dir, name);
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const validation = validateApprovalEnvelope(raw, now);
      return {
        approvalId: raw.approvalId || name.replace(/\.json$/, ''),
        path: filePath,
        ok: validation.ok,
        expired: validation.errors.includes('approval envelope is expired'),
        errors: validation.errors,
        envelope: validation.ok ? validation.envelope : raw,
      };
    })
    .filter((item) => includeExpired || !item.expired);
}

module.exports = {
  APPROVAL_SCHEMA_VERSION,
  approvalsRoot,
  portfolioApprovalDir,
  approvalPath,
  normalizeLeg,
  validateApprovalEnvelope,
  saveApprovalEnvelope,
  loadApprovalEnvelope,
  listApprovalEnvelopes,
};
