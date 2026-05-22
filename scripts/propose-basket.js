#!/usr/bin/env node
'use strict';

/*
 * Phase 195 — propose-basket CLI: read live holdings + cash, refresh quotes,
 * generate a fresh basket proposal envelope, save to runtime/basket-proposals/,
 * print human-readable preview.
 *
 * Default mode is propose-only (does NOT save as an approved basket).
 */

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const { generateBasketProposal, parseApprovedInstruments, saveProposalEnvelope } = require(path.join(ROOT, 'src/execution/basketProposalGenerator'));
const { saveApprovalEnvelope } = require(path.join(ROOT, 'src/execution/basketApprovalStore'));
const { InteractiveBrokersClient } = require(path.join(ROOT, 'src/brokers/interactive-brokers/client'));

function parseArgs(argv) {
  const args = { portfolio: 'etf' };
  for (const a of argv.slice(2)) {
    if (!a.startsWith('--')) continue;
    const [k, v] = a.replace(/^--/, '').split('=');
    args[k] = v === undefined ? true : v;
  }
  return args;
}

function readHoldings(portfolioDir) {
  // Reads the simplified Holdings table from holdings.md and the cash table.
  // The Holdings table uses conid as the leading column; we map back via the approved-instruments mapping.
  const file = path.join(portfolioDir, 'holdings.md');
  if (!fs.existsSync(file)) return { holdingsByConid: {}, cashChf: 0 };
  const text = fs.readFileSync(file, 'utf8');
  const out = {};
  let cashChf = 0;
  let inHoldings = false;
  let inCash = false;
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (/^## Current Holdings/i.test(trimmed)) { inHoldings = true; inCash = false; continue; }
    if (/^## Cash/i.test(trimmed)) { inCash = true; inHoldings = false; continue; }
    if (/^## /.test(trimmed)) { inHoldings = false; inCash = false; continue; }

    if (inHoldings && trimmed.startsWith('|') && !trimmed.startsWith('|---') && !/^\| Ticker/i.test(trimmed)) {
      const cells = trimmed.split('|').slice(1, -1).map((c) => c.trim());
      if (cells.length < 8) continue;
      const conid = cells[0];
      const quantity = Number(cells[3] || 0);
      const valueChf = Number(cells[7] || 0);
      if (Number.isFinite(quantity) && quantity > 0) {
        out[conid] = { conid, quantity, valueChf };
      }
    }
    if (inCash && trimmed.startsWith('|') && !trimmed.startsWith('|---') && !/^\| Scope/i.test(trimmed)) {
      const cells = trimmed.split('|').slice(1, -1).map((c) => c.trim());
      if (cells.length < 5) continue;
      const scope = cells[0];
      if (/^Broker account/i.test(scope)) {
        const v = Number(cells[4] || 0);
        if (Number.isFinite(v) && v > 0) cashChf = v;
      }
    }
  }
  return { holdingsByConid: out, cashChf };
}

async function main() {
  const args = parseArgs(process.argv);
  const portfolio = args.portfolio || 'etf';
  const portfolioDir = path.join(ROOT, 'portfolio', portfolio);

  const portfolioMd = fs.readFileSync(path.join(portfolioDir, 'portfolio.md'), 'utf8');
  const approvedInstruments = parseApprovedInstruments(portfolioMd);
  console.log(`Approved instruments parsed: ${approvedInstruments.length}`);

  const { holdingsByConid, cashChf } = readHoldings(portfolioDir);
  // Map conid -> ISIN for the generator interface
  const holdingsByIsin = {};
  for (const inst of approvedInstruments) {
    const h = holdingsByConid[String(inst.conid)];
    if (h) holdingsByIsin[inst.isin] = { quantity: h.quantity, valueChf: h.valueChf };
  }
  console.log(`Holdings: ${Object.keys(holdingsByConid).length} positions; settled cash CHF ${cashChf}`);

  const client = new InteractiveBrokersClient({ portfolio });
  const liveQuoteFn = async (conid) => {
    try {
      const snap = await client.native.fetchMarketSnapshot([Number(conid)]);
      const row = (snap || []).find((s) => Number(s.conid) === Number(conid)) || (snap && snap[0]) || null;
      if (!row) return null;
      return { ask: Number(row.ask), bid: Number(row.bid), last: Number(row.last), lastClose: Number(row.close) };
    } catch (error) {
      console.error(`quote ${conid} failed: ${error.message}`);
      return null;
    }
  };

  const result = await generateBasketProposal({
    portfolio,
    approvedInstruments,
    holdingsByIsin,
    cashChf,
    liveQuoteFn,
  });

  if (result.envelope.legs.length === 0) {
    console.log('No legs proposed (cash too small or all gaps below threshold).');
    return;
  }

  console.log('\n=== Basket Proposal ===');
  console.log(`Approval id: ${result.envelope.approvalId}`);
  console.log(`Total CHF: ${result.totalChf}`);
  console.log(`Deployment CHF: ${result.deploymentChf}`);
  console.log(`Residual CHF: ${result.residualChf}`);
  console.log('\nLegs:');
  if (result.envelope.requiresOperatorAttention) {
    console.log('  ⚠️  one or more legs have degraded quote quality — review the tier column before approving.');
  }
  for (const leg of result.envelope.legs) {
    const ref = leg.referenceAsk ? `ask ${leg.referenceAsk}` : (leg.referenceClose ? `close ${leg.referenceClose}` : 'none');
    const tier = leg.quoteQuality ? `tier=${leg.quoteQuality.tier}` : 'tier=unknown';
    console.log(`  ${leg.legId} ${leg.ibkrSymbol || leg.instrument}: BUY ${leg.quantity} @ ${leg.limitPrice} ${leg.currency} (ref ${ref}; ${tier}) ≈ CHF ${leg.estimatedChf}`);
  }

  const proposalPath = saveProposalEnvelope({ rootDir: ROOT, portfolio, envelope: result.envelope });
  console.log(`\nProposal saved: ${proposalPath}`);

  if (args['save-as-approved']) {
    const approvedEnvelope = {
      ...result.envelope,
      status: 'approved',
      legs: result.envelope.legs.map((leg) => ({ ...leg, status: 'approved' })),
    };
    saveApprovalEnvelope(approvedEnvelope, { rootDir: ROOT });
    console.log(`Auto-approved (--save-as-approved). Approved basket envelope written.`);
  } else {
    console.log('\nReply approve and the assistant will save this as an approved basket and run the canonical runner.');
  }
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
