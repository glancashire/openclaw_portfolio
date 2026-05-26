'use strict';

/**
 * lib/portfolioMarkdown.js
 *
 * Parsers for portfolio.md (Allocation Targets / Approved Instruments) and
 * holdings.md (Current Holdings, settled cash). Extracted from
 * scripts/analyze-rebalance.js so the dashboard digest and the rebalance
 * CLI use the same code path.
 */

function parseAllocationTargets(md) {
  const targets = [];
  const aliases = {}; // localSymbol -> canonical ibkr_symbol
  const approvedSection = extractMarkdownSection(md, '## Approved Instruments');
  const rows = extractTableRows(approvedSection);
  for (const r of rows) {
    if (r.length < 4) continue;
    const tickerOrIsin = r[0].trim();
    const targetPct = Number(r[3]);
    if (!Number.isFinite(targetPct)) continue;

    const notes = r[r.length - 1] || '';
    const m = /ibkr_symbol=([A-Z0-9._-]+)/.exec(notes);
    const symbol = m ? m[1] : (tickerOrIsin === 'CASH-CHF' ? 'CASH-CHF' : tickerOrIsin);

    const localM = /ibkr_local_symbol=([A-Z0-9._-]+)/.exec(notes);
    if (localM && localM[1] !== symbol) {
      aliases[localM[1]] = symbol;
    }

    if (targetPct === 0) continue;
    targets.push({ symbol, targetPct, minPct: Number(r[4] || 0), maxPct: Number(r[5] || 100) });
  }
  // Append CASH-CHF row from "Allocation Targets" if not already present.
  if (!targets.find((t) => t.symbol === 'CASH-CHF')) {
    const allocSection = extractMarkdownSection(md, '## Allocation Targets');
    const allocRows = extractTableRows(allocSection);
    for (const r of allocRows) {
      if (/cash/i.test(r[0] || '')) {
        targets.push({ symbol: 'CASH-CHF', targetPct: Number(r[1]), minPct: Number(r[2] || 0), maxPct: Number(r[3] || 100) });
        break;
      }
    }
  }
  Object.defineProperty(targets, '_aliases', { value: aliases, enumerable: false });
  return targets;
}

function parseHoldings(md) {
  const lastSync = (/Date\/time:\s*(.+)/.exec(md) || [])[1] || null;
  const totalValueChf = Number((/Total value CHF:\s*([0-9.]+)/.exec(md) || [])[1] || 0);
  const cashChf = Number((/Broker account cash CHF:\s*([0-9.]+)/.exec(md) || [])[1] || 0);

  const section = extractMarkdownSection(md, '## Current Holdings');
  const rows = extractTableRows(section);
  const holdings = [];
  for (const r of rows) {
    if (r.length < 8) continue;
    const rawSymbol = r[1].trim();
    const qty = Number(r[3]);
    const currency = (r[5] || '').trim().toUpperCase();
    const valueChf = Number(r[7]);
    if (!rawSymbol || !Number.isFinite(valueChf)) continue;
    holdings.push({ symbol: rawSymbol, qty, currency, valueChf });
  }
  return { holdings, cashChf, totalValueChf, lastSync };
}

function applyAliases(holdings, aliases) {
  if (!aliases || Object.keys(aliases).length === 0) return holdings;
  return holdings.map((h) => aliases[h.symbol] ? { ...h, symbol: aliases[h.symbol], localSymbol: h.symbol } : h);
}

function extractMarkdownSection(md, heading) {
  const idx = md.indexOf(heading);
  if (idx < 0) return '';
  const after = md.slice(idx + heading.length);
  const stop = after.search(/\n##\s/);
  return stop < 0 ? after : after.slice(0, stop);
}

function extractTableRows(section) {
  const lines = section.split('\n').filter((l) => l.trim().startsWith('|'));
  const rows = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (/^\|[\s\-:|]+\|$/.test(line)) continue;       // separator row
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length === 0) continue;
    // Skip header row (all cells are alpha)
    if (cells.every((c) => /^[A-Za-z ]/.test(c) || c === '')) continue;
    rows.push(cells);
  }
  return rows;
}

module.exports = {
  parseAllocationTargets,
  parseHoldings,
  applyAliases,
  extractMarkdownSection,
  extractTableRows,
};
