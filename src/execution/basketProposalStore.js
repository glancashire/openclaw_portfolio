'use strict';

const fs = require('fs');
const path = require('path');
const { proposeInstrumentTradesLivePriced } = require('../analysis/instrumentProposalEngine');
const { readApprovedInstruments } = require('../analysis/approvedInstruments');
const { prepareOrderForSubmission } = require('./orderPreparation');

const BASKET_PROPOSAL_SCHEMA_VERSION = '1.0';

function proposalsRoot(rootDir = process.cwd()) {
  return path.join(rootDir, 'runtime', 'basket-proposals');
}

function proposalPath({ portfolio, proposalId, rootDir = process.cwd() }) {
  if (!portfolio) throw new Error('portfolio is required');
  if (!proposalId) throw new Error('proposalId is required');
  return path.join(proposalsRoot(rootDir), portfolio, `${proposalId}.json`);
}

function slugTime(value = new Date()) {
  return new Date(value).toISOString().replace(/[:.]/g, '-');
}

function computePriceBand(proposal = {}) {
  const limitPrice = Number(proposal.limitPrice || 0);
  if (!Number.isFinite(limitPrice) || limitPrice <= 0) {
    return { limitPrice: 0, lowerBound: 0, upperBound: 0, currency: proposal.currency || null, source: proposal.priceSource || 'unknown' };
  }
  const lowerBound = Number((limitPrice * 0.995).toFixed(2));
  const upperBound = Number((limitPrice * 1.005).toFixed(2));
  return {
    limitPrice,
    lowerBound,
    upperBound,
    currency: proposal.currency || null,
    source: proposal.priceSource || 'unknown',
  };
}

function instrumentLookupByTicker(instruments = []) {
  const map = new Map();
  for (const instrument of instruments) {
    const keys = [instrument.tickerOrIsin, instrument.ibkrSymbol, instrument.ibkrConid].filter(Boolean);
    for (const key of keys) map.set(String(key).trim().toUpperCase(), instrument);
  }
  return map;
}

function normalizeProposalLeg(proposal = {}, instrument = null, index = 0) {
  const preparedOrder = instrument
    ? prepareOrderForSubmission({
        action: proposal.action,
        quantity: proposal.quantity,
        limitPrice: proposal.limitPrice,
        symbol: instrument.ibkrSymbol || proposal.instrument,
        conid: instrument.ibkrConid || proposal.ibkrConid || null,
        currency: proposal.currency || instrument.currency,
        exchange: 'SMART',
        transmit: true,
      }, instrument)
    : null;

  const blockedReasons = [];
  if (proposal.blocked) blockedReasons.push('proposal_blocked');
  if (!instrument) blockedReasons.push('instrument_unresolved');
  if (!preparedOrder?.conid) blockedReasons.push('missing_conid');
  if (!preparedOrder?.symbol) blockedReasons.push('missing_symbol');
  if (!preparedOrder?.currency) blockedReasons.push('missing_currency');
  if (!preparedOrder?.primaryExchange && !instrument?.ibkrPrimaryExchange) blockedReasons.push('missing_primary_exchange');
  if (!Number.isFinite(Number(proposal.quantity)) || Number(proposal.quantity) <= 0) blockedReasons.push('non_executable_quantity');
  if (!Number.isFinite(Number(proposal.limitPrice)) || Number(proposal.limitPrice) <= 0) blockedReasons.push('non_executable_limit_price');

  return {
    legId: `proposal-leg-${index + 1}`,
    instrument: proposal.instrument || instrument?.tickerOrIsin || null,
    instrumentName: proposal.instrumentName || instrument?.name || null,
    assetClass: proposal.assetClass || null,
    action: String(proposal.action || '').trim().toUpperCase() || 'BUY',
    quantity: Number(proposal.quantity || 0),
    estimatedOrderChf: Number(proposal.estimatedOrderChf || 0),
    residualCashChf: Number(proposal.residualCashChf || 0),
    rationale: proposal.rationale || '',
    riskNote: proposal.riskNote || '',
    priceBand: computePriceBand(proposal),
    execution: preparedOrder ? {
      conid: preparedOrder.conid || null,
      symbol: preparedOrder.symbol || null,
      localSymbol: preparedOrder.localSymbol || null,
      exchange: preparedOrder.exchange || 'SMART',
      primaryExchange: preparedOrder.primaryExchange || instrument?.ibkrPrimaryExchange || null,
      currency: preparedOrder.currency || null,
      tif: preparedOrder.tif || null,
      outsideRth: preparedOrder.outsideRth === true,
    } : null,
    blocked: blockedReasons.length > 0,
    blockedReasons,
    proposalSource: proposal.priceSource || 'unknown',
    allocationTargetPct: Number(proposal.allocationTargetPct || 0),
    allocationBeforePct: Number(proposal.allocationBeforePct || 0),
    allocationAfterPct: Number(proposal.allocationAfterPct || 0),
  };
}

async function generateBasketProposal({ portfolioPath, holdingsPath, portfolio = path.basename(path.dirname(portfolioPath)), proposalId, rootDir = process.cwd(), now = new Date(), proposalInput = null } = {}) {
  if (!portfolioPath) throw new Error('portfolioPath is required');
  if (!holdingsPath) throw new Error('holdingsPath is required');

  const liveProposal = proposalInput || await proposeInstrumentTradesLivePriced({ portfolioPath, holdingsPath, portfolio });
  const instruments = readApprovedInstruments(portfolioPath);
  const lookup = instrumentLookupByTicker(instruments);
  const generatedAt = new Date(now).toISOString();
  const finalProposalId = proposalId || `basket-proposal-${slugTime(now)}`;

  const legs = (liveProposal.proposals || []).map((proposal, index) => {
    const key = String(proposal.instrument || proposal.ibkrConid || '').trim().toUpperCase();
    const instrument = lookup.get(key) || null;
    return normalizeProposalLeg(proposal, instrument, index);
  });

  const artifact = {
    schemaVersion: BASKET_PROPOSAL_SCHEMA_VERSION,
    proposalId: finalProposalId,
    portfolio,
    generatedAt,
    summary: {
      notes: liveProposal.notes || [],
      proposalWarnings: liveProposal.proposalWarnings || [],
      residualCashChf: Number(liveProposal.residualCashChf || 0),
      blockedLegCount: legs.filter((leg) => leg.blocked).length,
      executableLegCount: legs.filter((leg) => !leg.blocked).length,
    },
    legs,
  };

  const outPath = proposalPath({ portfolio, proposalId: finalProposalId, rootDir });
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(artifact, null, 2));
  return { path: outPath, proposal: artifact };
}

module.exports = {
  BASKET_PROPOSAL_SCHEMA_VERSION,
  proposalsRoot,
  proposalPath,
  computePriceBand,
  normalizeProposalLeg,
  generateBasketProposal,
};
