'use strict';

/* Phase 195 — Generate a basket proposal envelope from live holdings + cash + targets. */

const fs = require('fs');
const path = require('path');
const { roundToTick, pickTick } = require('./basketReproposalBuilder');

/**
 * Lightweight reader for the Approved Instruments table in portfolio.md.
 */
function parseApprovedInstruments(portfolioMdContent) {
  const lines = portfolioMdContent.split('\n');
  const out = [];
  let inSection = false;
  let inTable = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ')) {
      inSection = /^## Approved Instruments/i.test(trimmed);
      inTable = false;
      continue;
    }
    if (!inSection) continue;
    if (trimmed.startsWith('|') && trimmed.includes('---')) { inTable = true; continue; }
    if (trimmed.startsWith('|') && inTable) {
      const cells = trimmed.split('|').slice(1, -1).map((c) => c.trim());
      if (cells.length < 8) continue;
      const isin = cells[0];
      if (/^CASH-/i.test(isin)) continue;
      const meta = cells[8] || '';
      const symbolMatch = /ibkr_symbol=([^;\s]+)/.exec(meta);
      const conidMatch = /ibkr_conid=([^;\s]+)/.exec(meta);
      const primaryMatch = /ibkr_primary_exchange=([^;\s]+)/.exec(meta);
      const fxMatch = /fx_to_chf=([\d.]+)/.exec(meta);
      out.push({
        isin,
        name: cells[1],
        assetClass: cells[2],
        targetPct: Number(cells[3]),
        minPct: Number(cells[4]),
        maxPct: Number(cells[5]),
        exchange: cells[6],
        currency: cells[7],
        ibkrSymbol: symbolMatch ? symbolMatch[1] : null,
        conid: conidMatch ? conidMatch[1] : null,
        primaryExchange: primaryMatch ? primaryMatch[1] : null,
        fxToChf: fxMatch ? Number(fxMatch[1]) : 1,
      });
    }
  }
  return out;
}

/**
 * Generate a basket proposal envelope.
 *
 * @param {object} params
 * @param {string} params.portfolio
 * @param {array} params.approvedInstruments - from `parseApprovedInstruments`
 * @param {object} params.holdingsByIsin - { ISIN: { quantity, valueChf } }
 * @param {number} params.cashChf - settled cash in CHF
 * @param {function} params.liveQuoteFn - async (conid) => { ask, lastClose }
 * @param {object} [params.options]
 * @param {number} [params.options.swissSleeveSplit] - default { sli: 12, spi: 8 }
 * @param {number} [params.options.markupOverAskBps] - default 50 (0.5%)
 * @param {number} [params.options.markupOverCloseBps] - default 75 (0.75%)
 * @param {number} [params.options.minLegChf] - default 500 (skip legs below this)
 */
async function generateBasketProposal({
  portfolio,
  approvedInstruments,
  holdingsByIsin,
  cashChf,
  liveQuoteFn,
  options = {},
}) {
  const markupAskBps = Number.isFinite(Number(options.markupOverAskBps)) ? Number(options.markupOverAskBps) : 50;
  const markupCloseBps = Number.isFinite(Number(options.markupOverCloseBps)) ? Number(options.markupOverCloseBps) : 75;
  const minLegChf = Number.isFinite(Number(options.minLegChf)) ? Number(options.minLegChf) : 500;
  const swissSleeveSplit = options.swissSleeveSplit || { sli: 12, spi: 8 };

  // Total portfolio value = cash + sum(holdings)
  const totalHoldingsChf = Object.values(holdingsByIsin || {}).reduce((sum, h) => sum + Number(h.valueChf || 0), 0);
  const totalChf = Number(cashChf || 0) + totalHoldingsChf;

  // For each approved instrument: compute target CHF, current CHF, gap.
  // Special-case Swiss sleeve: split into SLI 12% / SPI-mid 8% by ibkrSymbol.
  const targets = [];
  for (const inst of approvedInstruments) {
    let targetPct = Number(inst.targetPct || 0);
    if (inst.assetClass && /Swiss equities/i.test(inst.assetClass)) {
      // honour the explicit split if the row already has the right target
      if (inst.ibkrSymbol === 'UBSSLI') targetPct = swissSleeveSplit.sli;
      else if (inst.ibkrSymbol === 'SPMCHA') targetPct = swissSleeveSplit.spi;
    }
    const targetChf = totalChf * targetPct / 100;
    const currentChf = Number(holdingsByIsin?.[inst.isin]?.valueChf || 0);
    const currentQty = Number(holdingsByIsin?.[inst.isin]?.quantity || 0);
    const gapChf = targetChf - currentChf;
    targets.push({ ...inst, targetPct, targetChf, currentChf, currentQty, gapChf });
  }

  // Only buy where gap > 0 and exceeds minLegChf. Sort descending by gap so larger gaps go first.
  const buyCandidates = targets.filter((t) => t.gapChf > minLegChf).sort((a, b) => b.gapChf - a.gapChf);

  let remainingCash = Number(cashChf || 0);
  const legs = [];
  let legCounter = 1;
  for (const target of buyCandidates) {
    if (remainingCash < minLegChf) break;
    const conid = Number(target.conid || 0);
    if (!conid) continue;
    let quote = null;
    try { quote = liveQuoteFn ? await liveQuoteFn(conid) : null; } catch (_) { quote = null; }
    const ask = Number(quote?.ask);
    const lastClose = Number(quote?.lastClose ?? quote?.close ?? quote?.last);
    const referencePrice = Number.isFinite(ask) && ask > 0 ? ask : (Number.isFinite(lastClose) && lastClose > 0 ? lastClose : null);
    if (!Number.isFinite(referencePrice)) continue;
    const bps = Number.isFinite(ask) && ask > 0 ? markupAskBps : markupCloseBps;
    const tick = pickTick({ instrument: target.isin, currency: target.currency });
    const limitNative = roundToTick(referencePrice * (1 + bps / 10000), tick);

    // Convert gap (CHF) into native currency to size the qty.
    const fxToChf = target.fxToChf || 1;
    const gapNative = target.gapChf / fxToChf;
    const qty = Math.floor(gapNative / limitNative);
    if (qty <= 0) continue;
    const estChf = qty * limitNative * fxToChf;
    if (estChf > remainingCash) {
      // shrink qty to fit
      const fittedQty = Math.floor(remainingCash / (limitNative * fxToChf));
      if (fittedQty <= 0) continue;
      const fittedChf = fittedQty * limitNative * fxToChf;
      legs.push(buildLeg(legCounter++, target, fittedQty, limitNative, fittedChf, ask, lastClose));
      remainingCash -= fittedChf;
    } else {
      legs.push(buildLeg(legCounter++, target, qty, limitNative, estChf, ask, lastClose));
      remainingCash -= estChf;
    }
  }

  const approvalId = `basket-${portfolio}-${nowStamp(new Date())}`;
  const envelope = {
    schemaVersion: '1.0',
    approvalId,
    portfolio,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    executionPolicy: {
      continueOnIndependentFailure: true,
      requireCompactReapprovalOnPriceDrift: true,
      substitutionAllowed: false,
    },
    legs,
    summary: `Auto-proposal from live holdings; total CHF ${totalChf.toFixed(2)}, cash CHF ${Number(cashChf).toFixed(2)}, deploying CHF ${(Number(cashChf) - remainingCash).toFixed(2)}.`,
    source: 'auto_generated_proposal',
  };

  return {
    envelope,
    deploymentChf: Number((Number(cashChf) - remainingCash).toFixed(2)),
    residualChf: Number(remainingCash.toFixed(2)),
    totalChf: Number(totalChf.toFixed(2)),
    targets,
  };
}

function buildLeg(idx, target, qty, limitPrice, estChf, ask, lastClose) {
  return {
    legId: `leg-${idx}`,
    instrument: target.isin,
    ibkrSymbol: target.ibkrSymbol,
    conid: target.conid,
    action: 'BUY',
    quantity: qty,
    limitPrice,
    currency: target.currency,
    exchange: 'SMART',
    primaryExchange: target.primaryExchange,
    maxAttempts: 1,
    retryPolicy: 'none',
    allowSubstitution: false,
    status: 'pending_user_approval',
    estimatedChf: Number(estChf.toFixed(2)),
    referenceAsk: Number.isFinite(ask) ? ask : null,
    referenceClose: Number.isFinite(lastClose) ? lastClose : null,
  };
}

function nowStamp(date) {
  return date.toISOString().replace(/[-:]|\.\d+/g, '').slice(0, 13);
}

/**
 * Save proposal envelope to runtime/basket-proposals/<portfolio>/<approvalId>.json.
 */
function saveProposalEnvelope({ rootDir, portfolio, envelope }) {
  const dir = path.join(rootDir, 'runtime', 'basket-proposals', portfolio);
  fs.mkdirSync(dir, { recursive: true });
  const outPath = path.join(dir, `${envelope.approvalId}.json`);
  fs.writeFileSync(outPath, JSON.stringify(envelope, null, 2));
  return outPath;
}

module.exports = { generateBasketProposal, parseApprovedInstruments, saveProposalEnvelope };
