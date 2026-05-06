const fs = require('fs');
const { readExcludedInstruments } = require('./approvedInstruments');

const ETF_CATALOG = [
  {
    tickerOrIsin: 'IE00B5BMR087',
    symbol: 'CSPX',
    name: 'iShares Core S&P 500 UCITS ETF USD (Acc)',
    assetClass: 'Global equities',
    region: 'Developed World ex-CH',
    currency: 'USD',
    exchange: 'LSE',
    issuer: 'iShares',
    accumulating: true,
    terPct: 0.07,
    domicile: 'Ireland',
    liquidity: 'high',
    replication: 'physical',
    rationale: 'Very liquid core developed-market building block with low TER and strong broker availability.',
    risks: 'USD trading line and US concentration; no emerging markets exposure.',
  },
  {
    tickerOrIsin: 'IE00B4L5Y983',
    symbol: 'IWDA',
    name: 'iShares Core MSCI World UCITS ETF USD (Acc)',
    assetClass: 'Global equities',
    region: 'Developed World ex-CH',
    currency: 'USD',
    exchange: 'LSE',
    issuer: 'iShares',
    accumulating: true,
    terPct: 0.2,
    domicile: 'Ireland',
    liquidity: 'high',
    replication: 'physical',
    rationale: 'Broader developed-world exposure in a single accumulating ETF, simple to maintain.',
    risks: 'Higher TER than S&P 500 funds and still USD-traded.',
  },
  {
    tickerOrIsin: 'LU0950668870',
    symbol: 'EMUAA',
    name: 'UBS ETF (LU) MSCI EMU UCITS ETF (EUR) A-acc',
    assetClass: 'Global equities',
    region: 'Developed World ex-CH',
    currency: 'EUR',
    exchange: 'Xetra',
    issuer: 'UBS',
    accumulating: true,
    terPct: 0.12,
    domicile: 'Luxembourg',
    liquidity: 'medium',
    replication: 'physical',
    rationale: 'Continental Europe sleeve that fits the CHF-first / Swiss-investor framing and diversifies beyond US equities.',
    risks: 'EMU-only exposure and EUR trading currency.',
  },
  {
    tickerOrIsin: 'CH0032912732',
    symbol: 'UBSSLI',
    name: 'UBS SLI ETF (SMI gleichgewichtet)',
    assetClass: 'Swiss equities',
    region: 'Switzerland',
    currency: 'CHF',
    exchange: 'SIX',
    issuer: 'UBS',
    accumulating: false,
    terPct: 0.21,
    domicile: 'Switzerland',
    liquidity: 'medium',
    replication: 'physical',
    rationale: 'Direct CHF home-market sleeve with reduced single-name concentration versus cap-weighted Swiss indexes.',
    risks: 'Single-country concentration and somewhat higher TER than broad global funds.',
  },
  {
    tickerOrIsin: 'CHSPI',
    symbol: 'CSSMI',
    name: 'iShares Core SPI ETF (CH)',
    assetClass: 'Swiss equities',
    region: 'Switzerland',
    currency: 'CHF',
    exchange: 'SIX',
    issuer: 'iShares',
    accumulating: false,
    terPct: 0.1,
    domicile: 'Switzerland',
    liquidity: 'high',
    replication: 'physical',
    rationale: 'Simple CHF-denominated Swiss equity sleeve with broad local-market coverage and strong liquidity.',
    risks: 'Cap-weighted Swiss market remains concentrated in a few large names.',
  },
  {
    tickerOrIsin: 'CHBONDX',
    symbol: 'CHSBCH',
    name: 'iShares SBI AAA-BBB CHF Bond ETF (CH)',
    assetClass: 'Bonds / cash-like',
    region: 'Bonds / cash-like CHF',
    currency: 'CHF',
    exchange: 'SIX',
    issuer: 'iShares',
    accumulating: false,
    terPct: 0.15,
    domicile: 'Switzerland',
    liquidity: 'medium',
    replication: 'physical',
    rationale: 'Straightforward CHF bond sleeve for investors who want to move beyond pure cash while staying domestic-currency anchored.',
    risks: 'More rate sensitivity than keeping the defensive sleeve as cash at very small portfolio sizes.',
  },
  {
    tickerOrIsin: 'CASH-CHF',
    symbol: 'CASH-CHF',
    name: 'CHF cash balance',
    assetClass: 'Bonds / cash-like',
    region: 'Bonds / cash-like CHF',
    currency: 'CHF',
    exchange: 'IBKR cash balance',
    issuer: 'cash',
    accumulating: true,
    terPct: 0,
    domicile: 'Switzerland',
    liquidity: 'high',
    replication: 'n/a',
    rationale: 'Keeps the defensive sleeve maximally simple and avoids forcing tiny bond ETF trades at CHF 5000 scale.',
    risks: 'Cash drag if the portfolio remains underinvested for too long.',
  },
];

function extractSection(text, heading) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return '';
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}

function parseRows(section) {
  return section
    .split(/\r?\n/)
    .filter((line) => line.startsWith('|'))
    .slice(2)
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));
}

function readStrategyContext(portfolioPath) {
  const text = fs.readFileSync(portfolioPath, 'utf8');
  const allocationRows = parseRows(extractSection(text, 'Allocation Targets'));
  const approvedRows = parseRows(extractSection(text, 'Approved Instruments'));
  const notesSection = extractSection(text, 'Notes / Open Questions');
  const excluded = readExcludedInstruments(portfolioPath);
  return {
    currencyPreference: (text.match(/- Currency preference:\s*(.+)/) || [null, ''])[1].trim(),
    esgPreference: (text.match(/- ESG preference:\s*(.+)/) || [null, ''])[1].trim(),
    issuerNote: (notesSection.match(/ETF issuer preferences:\s*(.+)/i) || [null, ''])[1].trim(),
    allocations: allocationRows.map((row) => ({
      assetClass: row[0],
      targetPct: Number(row[1]),
      minPct: Number(row[2]),
      maxPct: Number(row[3]),
      notes: row[4] || '',
    })),
    approved: approvedRows.map((row) => row[0]).filter(Boolean),
    excludedIds: new Set(excluded.map((row) => row.tickerOrIsin)),
  };
}

function issuerPreferences(note) {
  const lower = String(note || '').toLowerCase();
  return {
    preferUBS: lower.includes('prefer ubs'),
    preferIShares: lower.includes('ishares'),
    excludeInvesco: lower.includes('exclude invesco'),
  };
}

function scoreCandidate(candidate, context, allocation) {
  let score = 0;
  const reasons = [];
  const prefs = issuerPreferences(context.issuerNote);

  if (candidate.assetClass === allocation.assetClass) {
    score += 35;
    reasons.push('matches required asset class');
  }
  if (context.currencyPreference.toLowerCase().includes('chf') && candidate.currency === 'CHF') {
    score += 20;
    reasons.push('fits CHF-first preference');
  } else if (candidate.currency === 'EUR') {
    score += 8;
    reasons.push('keeps currency exposure closer to Europe than a USD-only option');
  }
  if (candidate.liquidity === 'high') {
    score += 15;
    reasons.push('high liquidity');
  } else if (candidate.liquidity === 'medium') {
    score += 8;
    reasons.push('acceptable liquidity');
  }
  if (candidate.terPct <= 0.1) {
    score += 12;
    reasons.push('very low TER');
  } else if (candidate.terPct <= 0.2) {
    score += 6;
    reasons.push('reasonable TER');
  }
  if (candidate.accumulating) {
    score += 6;
    reasons.push('accumulating structure');
  }
  if (candidate.replication === 'physical') {
    score += 5;
    reasons.push('physical replication');
  }
  if (prefs.preferUBS && candidate.issuer === 'UBS') {
    score += 10;
    reasons.push('matches UBS issuer preference');
  }
  if (prefs.preferIShares && candidate.issuer === 'iShares') {
    score += 10;
    reasons.push('matches iShares issuer preference');
  }
  if (prefs.excludeInvesco && candidate.issuer === 'Invesco') {
    score -= 50;
    reasons.push('penalized by issuer exclusion preference');
  }
  if (allocation.assetClass === 'Bonds / cash-like' && candidate.tickerOrIsin === 'CASH-CHF') {
    score += 12;
    reasons.push('keeps the defensive sleeve simple at small scale');
  }
  if (context.approved.includes(candidate.tickerOrIsin)) {
    score += 25;
    reasons.push('already approved in current draft');
  }

  return { score, reasons };
}

function rejectionReasons(candidate, context, allocation) {
  const reasons = [];
  if (context.excludedIds.has(candidate.tickerOrIsin)) reasons.push('explicitly listed in Excluded Instruments');
  if (candidate.assetClass !== allocation.assetClass) reasons.push('asset class mismatch');
  return reasons;
}

function shortlistForAllocation(allocation, context) {
  const considered = ETF_CATALOG
    .filter((candidate) => candidate.assetClass === allocation.assetClass)
    .map((candidate) => ({
      candidate,
      rejectedReasons: rejectionReasons(candidate, context, allocation),
    }));

  const accepted = considered
    .filter((item) => item.rejectedReasons.length === 0)
    .map((item) => ({ ...item, ...scoreCandidate(item.candidate, context, allocation) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const rejected = considered
    .filter((item) => item.rejectedReasons.length > 0)
    .map((item) => ({
      tickerOrIsin: item.candidate.tickerOrIsin,
      name: item.candidate.name,
      assetClass: item.candidate.assetClass,
      rejectedReasons: item.rejectedReasons,
    }));

  return { accepted, rejected };
}

function suggestEtfShortlist(portfolioPath) {
  const context = readStrategyContext(portfolioPath);
  const suggestions = [];
  const rejections = [];

  for (const allocation of context.allocations) {
    const { accepted, rejected } = shortlistForAllocation(allocation, context);
    const preferredCount = Math.max(1, Math.min(2, accepted.length, allocation.assetClass === 'Global equities' ? 2 : 1));
    const splitTarget = Number((allocation.targetPct / preferredCount).toFixed(2));

    for (const [index, ranked] of accepted.entries()) {
      suggestions.push({
        rank: index + 1,
        tickerOrIsin: ranked.candidate.tickerOrIsin,
        symbol: ranked.candidate.symbol,
        name: ranked.candidate.name,
        assetClass: ranked.candidate.assetClass,
        suggestedTargetPct: index < preferredCount ? splitTarget : 0,
        exchange: ranked.candidate.exchange,
        currency: ranked.candidate.currency,
        issuer: ranked.candidate.issuer,
        score: ranked.score,
        approved: context.approved.includes(ranked.candidate.tickerOrIsin),
        excluded: false,
        notes: buildInstrumentNotes(ranked.candidate),
        reason: `${ranked.candidate.rationale} (${ranked.reasons.join('; ')})`,
        keyRisks: ranked.candidate.risks,
      });
    }

    rejections.push(...rejected);
  }

  return {
    currencyPreference: context.currencyPreference,
    issuerPreferences: context.issuerNote || 'none',
    excludedCount: rejections.length,
    suggestions,
    rejections,
  };
}

function buildInstrumentNotes(candidate) {
  const notes = [];
  if (candidate.rationale) notes.push(candidate.rationale);
  if (candidate.symbol) notes.push(`ibkr_symbol=${candidate.symbol}`);
  if (candidate.currency === 'CHF') notes.push('fx_to_chf=1');
  return notes.join('; ');
}

function buildApprovedInstrumentRows(result, { topPerAssetClass = 1 } = {}) {
  const selected = new Map();
  for (const item of result.suggestions) {
    if (!selected.has(item.assetClass)) selected.set(item.assetClass, []);
    const rows = selected.get(item.assetClass);
    if (rows.length < topPerAssetClass && item.suggestedTargetPct > 0 && !item.excluded) rows.push(item);
  }

  const ordered = [];
  for (const items of selected.values()) ordered.push(...items);
  return ordered.map((item) => [
    item.tickerOrIsin,
    item.name,
    item.assetClass,
    formatPercent(item.suggestedTargetPct),
    '',
    '',
    item.exchange,
    item.currency,
    item.notes || '',
  ]);
}

function replaceApprovedInstrumentsSection(portfolioText, rows) {
  const lines = portfolioText.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === '## Approved Instruments');
  if (start === -1) throw new Error('Approved Instruments section not found');
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) {
      end = i;
      break;
    }
  }
  const replacement = [
    '## Approved Instruments',
    '| Ticker / ISIN | Name | Asset class | Target % | Min % | Max % | Exchange | Currency | Notes |',
    '|---|---|---|---:|---:|---:|---|---|---|',
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ];
  return [...lines.slice(0, start), ...replacement, ...lines.slice(end)].join('\n');
}

function formatPercent(value) {
  if (!Number.isFinite(Number(value))) return '';
  return String(Number(value));
}

function formatShortlistMarkdown(result) {
  const lines = [
    '# Suggested Instruments',
    '',
    `- Currency preference: ${result.currencyPreference || 'n/a'}`,
    `- Issuer preferences: ${result.issuerPreferences || 'none'}`,
    `- Excluded candidates filtered: ${result.excludedCount || 0}`,
    '',
    '| Rank | Ticker / ISIN | Name | Asset class | Issuer | Reason | Key risks | Suggested target % |',
    '|---:|---|---|---|---|---|---|---:|',
  ];

  for (const item of result.suggestions) {
    lines.push(`| ${item.rank} | ${item.tickerOrIsin} | ${item.name} | ${item.assetClass} | ${item.issuer} | ${item.reason} | ${item.keyRisks} | ${item.suggestedTargetPct} |`);
  }

  if (result.rejections?.length) {
    lines.push('', '## Rejected candidates', '', '| Ticker / ISIN | Name | Asset class | Rejection reasons |', '|---|---|---|---|');
    for (const item of result.rejections) {
      lines.push(`| ${item.tickerOrIsin} | ${item.name} | ${item.assetClass} | ${item.rejectedReasons.join('; ')} |`);
    }
  }

  return `${lines.join('\n')}\n`;
}

module.exports = {
  ETF_CATALOG,
  suggestEtfShortlist,
  formatShortlistMarkdown,
  buildApprovedInstrumentRows,
  replaceApprovedInstrumentsSection,
  shortlistForAllocation,
};
