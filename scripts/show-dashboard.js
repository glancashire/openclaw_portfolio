#!/usr/bin/env node
// Compact, console-friendly dashboard view for chat use ("show dashboard").
// Usage: node scripts/show-dashboard.js [portfolio]   (default: etf)
const fs = require('fs');
const path = require('path');

const portfolio = process.argv[2] || 'etf';
const dashPath = path.join(__dirname, '..', 'portfolio', portfolio, 'dashboard.md');
const holdPath = path.join(__dirname, '..', 'portfolio', portfolio, 'holdings.md');

if (!fs.existsSync(dashPath)) {
  console.error(`No dashboard for portfolio "${portfolio}" at ${dashPath}`);
  process.exit(1);
}

const text = fs.readFileSync(dashPath, 'utf8');
const holdings = fs.existsSync(holdPath) ? fs.readFileSync(holdPath, 'utf8') : '';

const get = (label, src = text) => {
  const m = src.match(new RegExp(`- ${label}:\\s*(.+)`));
  return m ? m[1].trim() : null;
};
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const fmt = (v) => {
  const n = num(v);
  if (n == null) return v ?? '-';
  return n.toLocaleString('en-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const pct = (v) => {
  const n = num(v);
  if (n == null) return String(v ?? '-');
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
};

function section(name) {
  const re = new RegExp(`## ${name}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`);
  const m = text.match(re);
  return m ? m[1].trim() : '';
}
function tableRows(body) {
  return body.split(/\r?\n/).filter((l) => l.startsWith('|') && !l.includes('---') && !/^\| ?(Sleeve|Instrument|Date|Time|Ticker|Scope) /i.test(l));
}

const total = num(get('Total value CHF'));
const cash = num(get('Cash CHF'));
const invested = num(get('Invested CHF'));
const dailyChf = num(get('Daily move CHF'));
const dailyPct = num(get('Daily move %'));
const totalProfitChf = num(get('Total unrealized profit CHF'));
const totalProfitPct = num(get('Total unrealized profit %'));
const coverageLine = get('Cost-basis coverage');
const holdingCount = get('Number of holdings');
const sync = get('Date/time', holdings) || get('Last successful sync');
const health = get('Portfolio status');
const strategy = get('Strategy status');
const broker = get('Broker health');
const execPosture = get('Execution posture');
const nextAction = get('Next action');
const blockers = get('Active blockers');
const queue = get('Pending operator queue items');
const pendingApprovals = get('Pending approvals');
const inFlight = get('In-flight execution rows');
const cashPctOfTotal = total && cash != null ? (cash / total * 100) : null;

const lines = [];
lines.push(`📊 Dashboard — ${portfolio.toUpperCase()}   (synced ${sync || 'unknown'})`);
lines.push('');
lines.push(`Status: ${health || '?'} · strategy: ${strategy || '?'} · broker: ${broker ? (broker.length > 80 ? broker.slice(0, 77) + '…' : broker) : '?'}`);
lines.push(`Execution: ${execPosture || '?'} · blockers: ${blockers || 0} · queue: ${queue || 0} · pending approvals: ${pendingApprovals || 0} · in-flight: ${inFlight || 0}`);
lines.push('');
lines.push('💰 Value (CHF)');
lines.push(`  Total      ${fmt(total).padStart(14)}`);
lines.push(`  Invested   ${fmt(invested).padStart(14)}   (${total ? (invested / total * 100).toFixed(2) : '0.00'}%)`);
lines.push(`  Cash       ${fmt(cash).padStart(14)}   (${cashPctOfTotal != null ? cashPctOfTotal.toFixed(2) : '0.00'}%)`);
if (dailyChf != null || dailyPct != null) {
  lines.push(`  Daily move ${fmt(dailyChf).padStart(14)}   (${pct(dailyPct)})`);
}
if (totalProfitChf != null) {
  lines.push(`  Profit     ${fmt(totalProfitChf).padStart(14)}   (${pct(totalProfitPct)})${coverageLine ? `   ${coverageLine}` : ''}`);
}
lines.push(`  Holdings: ${holdingCount || 0}`);

// Cash breakdown from holdings.md
if (holdings) {
  const cashTable = holdings.match(/## Cash\s*\n([\s\S]*?)(?=\n## |$)/);
  if (cashTable) {
    const rows = cashTable[1].split(/\r?\n/).filter((l) => l.startsWith('|') && !l.includes('---') && !/Scope \| Currency/.test(l));
    if (rows.length) {
      lines.push('');
      lines.push('💵 Cash detail');
      for (const r of rows) {
        const cells = r.split('|').map((c) => c.trim()).filter(Boolean);
        // Scope | Currency | Amount | FX | Value CHF | Basis
        const [scope, ccy, amount, , valueChf, basis] = cells;
        lines.push(`  ${(scope || '?').padEnd(16)} ${ccy || '?'} ${fmt(amount).padStart(12)}  →  CHF ${fmt(valueChf).padStart(10)}  [${basis || '?'}]`);
      }
    }
  }
  // Holdings detail
  const holdTable = holdings.match(/## Current Holdings\s*\n([\s\S]*?)(?=\n## |$)/);
  if (holdTable) {
    const rows = holdTable[1].split(/\r?\n/).filter((l) => l.startsWith('|') && !l.includes('---') && !/Ticker \/ ISIN/.test(l));
    if (rows.length) {
      lines.push('');
      lines.push('📈 Holdings');
      lines.push(`  ${'Ticker'.padEnd(10)} ${'Class'.padEnd(16)} ${'Qty'.padStart(7)} ${'Px'.padStart(10)} ${'Ccy'.padEnd(4)} ${'FX'.padStart(6)} ${'CHF Value'.padStart(13)}`);
      for (const r of rows) {
        const c = r.split('|').map((x) => x.trim()).filter(Boolean);
        const [, name, cls, qty, px, ccy, fx, chf] = c;
        lines.push(`  ${(name || '').slice(0, 10).padEnd(10)} ${(cls || '').slice(0, 16).padEnd(16)} ${(qty || '').padStart(7)} ${fmt(px).padStart(10)} ${(ccy || '').padEnd(4)} ${(fx || '').padStart(6)} ${fmt(chf).padStart(13)}`);
      }
    }
  }
}

// Profit / Loss (from dashboard.md)
const pl = section('Profit / Loss');
if (pl) {
  const rows = pl.split(/\r?\n/).filter((l) => l.startsWith('|') && !l.includes('---') && !/^\| ?Instrument /i.test(l));
  if (rows.length) {
    lines.push('');
    lines.push('💵 Profit / Loss');
    lines.push(`  ${'Instrument'.padEnd(46)} ${'Value'.padStart(13)} ${'Cost'.padStart(13)} ${'Profit'.padStart(13)} ${'P/L %'.padStart(8)}  Source`);
    for (const r of rows) {
      const c = r.split('|').map((x) => x.trim()).filter(Boolean);
      const [name, value, cost, profit, profitPct, source] = c;
      if (!name || name === '—') continue;
      lines.push(`  ${(name || '').slice(0, 46).padEnd(46)} ${String(value).padStart(13)} ${String(cost).padStart(13)} ${String(profit).padStart(13)} ${String(profitPct).padStart(8)}  ${source || ''}`);
    }
  }
}

// Allocation
const alloc = section('Allocation Health');
if (alloc) {
  lines.push('');
  lines.push('🎯 Allocation vs target');
  for (const r of tableRows(alloc)) {
    const c = r.split('|').map((x) => x.trim()).filter(Boolean);
    // Sleeve | Current % | Target % | Drift % | Within band | Action needed | Reason
    const [sleeve, cur, tgt, drift, band, action] = c;
    const flag = band === 'on_track' ? '✓' : band === 'drifted' ? '~' : '!';
    lines.push(`  ${flag} ${(sleeve || '').padEnd(20)} ${String(cur).padStart(6)}% / ${String(tgt).padStart(3)}%  drift ${String(drift).padStart(6)}%  ${band || ''}${action && action !== 'no' ? `  → ${action}` : ''}`);
  }
}

// Pending operator actions (top 5)
const pa = section('Pending Operator Actions');
if (pa && !/^\s*$/.test(pa)) {
  const items = pa.split(/\r?\n/).filter((l) => /^\d+\./.test(l)).slice(0, 5);
  if (items.length) {
    lines.push('');
    lines.push('⚠️  Top operator actions');
    for (const it of items) {
      const trimmed = it.length > 140 ? it.slice(0, 137) + '…' : it;
      lines.push(`  ${trimmed}`);
    }
  }
}

// Recommendation
const rec = section('Recommended Next Step');
if (rec) {
  lines.push('');
  lines.push(`👉 Next: ${rec.length > 240 ? rec.slice(0, 237) + '…' : rec}`);
}

// Sanity check
if (total != null && invested != null && cash != null) {
  const diff = Math.abs(total - (invested + cash));
  if (diff > 0.5) {
    lines.push('');
    lines.push(`⚠️  Sanity: total (${fmt(total)}) ≠ invested + cash (${fmt(invested + cash)}); diff ${fmt(diff)}`);
  }
}

console.log(lines.join('\n'));
