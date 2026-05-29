#!/usr/bin/env node
// Value-first console dashboard view for chat use ("show dashboard").
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
const portPath = path.join(__dirname, '..', 'portfolio', portfolio, 'portfolio.md');
const portText = fs.existsSync(portPath) ? fs.readFileSync(portPath, 'utf8') : '';

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
const signed = (v) => {
  const n = num(v);
  if (n == null) return String(v ?? '-');
  return `${n >= 0 ? '+' : ''}${fmt(n)}`;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function section(name) {
  const re = new RegExp(`## ${name}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`);
  const m = text.match(re);
  return m ? m[1].trim() : '';
}
function tableRows(body) {
  return body.split(/\r?\n/).filter((l) => l.startsWith('|') && !l.includes('---') && !/^\| ?(Sleeve|Instrument|Date|Time|Ticker|Scope) /i.test(l));
}

// ── Core numbers ──────────────────────────────────────────────────────────────
const total        = num(get('Total value CHF'));
const cash         = num(get('Cash CHF'));
const invested     = num(get('Invested CHF'));
const dailyChf     = num(get('Daily move CHF'));
const dailyPct     = num(get('Daily move %'));
const weeklyChf    = num(get('Since last report CHF'));
const weeklyPct    = num(get('Since last report %'));
const profitChf    = num(get('Total unrealized profit CHF'));
const profitPct    = num(get('Total unrealized profit %'));
const holdingCount = get('Number of holdings');

// ── Capital deposited (from portfolio.md) ─────────────────────────────────────
const depositedCapital = num(get('Total capital deposited CHF', portText));
const trueReturnChf = (total != null && depositedCapital != null) ? total - depositedCapital : null;
const trueReturnPct = (trueReturnChf != null && depositedCapital > 0) ? (trueReturnChf / depositedCapital) * 100 : null;

// ── Operational details (trailer) ────────────────────────────────────────────
const health          = get('Portfolio status');
const broker          = get('Broker health');
const execPosture     = get('Execution posture');
const blockers        = get('Active blockers');
const pendingApprovals = get('Pending approvals');
const inFlight        = get('In-flight execution rows');

// ── Build output ──────────────────────────────────────────────────────────────
const lines = [];

// ── Header: portfolio name + total value + all-time return ───────────────────
const headlineReturnPct = trueReturnPct != null ? trueReturnPct : profitPct;
const headlineReturnChf = trueReturnChf != null ? trueReturnChf : profitChf;
lines.push(`📊 ${portfolio.toUpperCase()} Portfolio — CHF ${fmt(total)}   ${pct(headlineReturnPct)} all-time`);
lines.push('');

// ── Performance ───────────────────────────────────────────────────────────────
lines.push('💰 Performance');
lines.push(`  Today      ${signed(dailyChf).padStart(10)} CHF  (${pct(dailyPct)})`);
lines.push(`  This week  ${signed(weeklyChf).padStart(10)} CHF  (${pct(weeklyPct)})`);
lines.push(`  All-time   ${signed(headlineReturnChf).padStart(10)} CHF  (${pct(headlineReturnPct)})`);
lines.push('');

// ── Holdings by value ─────────────────────────────────────────────────────────
const holdTable = section('Profit / Loss');
if (holdTable) {
  const rows = holdTable
    .split(/\r?\n/)
    .filter((l) => l.startsWith('|') && !l.includes('---') && !/^\| ?Instrument /i.test(l))
    .map((r) => {
      const c = r.split('|').map((x) => x.trim()).filter(Boolean);
      // Instrument | Value CHF | Cost basis CHF | Profit CHF | Profit % | Cost basis source
      return {
        name:      c[0] || '',
        value:     num(c[1]?.replace(/'/g, '')),
        profitChf: num(c[3]?.replace(/'/g, '')),
        profitPct: num(c[4]?.replace(/'/g, '').replace('%', '').replace('+', '')),
      };
    })
    .filter((r) => r.name && r.name !== '—');

  if (rows.length) {
    // Sort by CHF value descending
    rows.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    const totalValue = rows.reduce((s, r) => s + (r.value ?? 0), 0);

    // Top gainer: highest profit CHF
    const gainers = rows.filter((r) => (r.profitChf ?? 0) > 0);
    const losers  = rows.filter((r) => (r.profitChf ?? 0) < 0);
    const topGainer = gainers.length ? gainers.reduce((a, b) => (a.profitChf ?? 0) > (b.profitChf ?? 0) ? a : b) : null;
    const topLoser  = losers.length  ? losers.reduce((a, b) => (a.profitChf ?? 0) < (b.profitChf ?? 0) ? a : b) : null;

    lines.push('📈 Holdings (by value)');
    for (const r of rows) {
      const w    = totalValue ? ((r.value ?? 0) / totalValue * 100).toFixed(1) : '0.0';
      const plChf = r.profitChf != null ? signed(r.profitChf).padStart(10) : '          —';
      const plPct = r.profitPct != null ? pct(r.profitPct).padStart(7) : '       —';
      let note = '';
      if (r === topGainer && topGainer !== topLoser) note = '★ top gainer';
      else if (r === topLoser && topLoser !== topGainer) note = '▼ top loss';
      lines.push(`  ${r.name.slice(0, 8).padEnd(8)} ${fmt(r.value).padStart(10)}  (${String(w).padStart(4)}%)  ${plChf}  (${plPct})  ${note}`);
    }
    lines.push('');
  }
}

// ── Cash: framed as deployment opportunity ───────────────────────────────────
const cashPct = total && cash != null ? (cash / total * 100) : null;
if (cash != null) {
  const pctStr = cashPct != null ? cashPct.toFixed(1) + '%' : '?';
  lines.push(`💵 Cash: CHF ${fmt(cash)} (${pctStr}) — available for deployment`);
  lines.push('');
}

// ── Allocation: compact health check ─────────────────────────────────────────
const alloc = section('Balance Check');
if (alloc) {
  const rows = tableRows(alloc);
  const onTrack = rows.filter((r) => r.includes('on_track')).length;
  const totalSleeves = rows.length;

  if (rows.length) {
    if (onTrack === totalSleeves) {
      // All on track: single-line summary with inline breakdown
      const sleeveSummary = rows.map((r) => {
        const c = r.split('|').map((x) => x.trim()).filter(Boolean);
        const [sleeve, cur, tgt] = c;
        return `${sleeve} ${cur}/${tgt}`;
      }).join(' · ');
      lines.push(`🎯 Balance: all sleeves on track ✓`);
      lines.push(`  (${sleeveSummary})`);
      lines.push('');
    } else {
      // Not all on track: show detailed sleeve breakdown
      const status = onTrack === totalSleeves ? '✓' : '~';
      const label  = onTrack === totalSleeves
        ? 'Balance: all sleeves on track'
        : `Balance: ${onTrack}/${totalSleeves} sleeves on track`;
      lines.push(`🎯 ${label}`);
      for (const r of rows) {
        const c = r.split('|').map((x) => x.trim()).filter(Boolean);
        const [sleeve, cur, tgt, drift, band] = c;
        const flag = band === 'on_track' ? '✓' : band === 'drifted' ? '~' : '!';
        lines.push(`  ${flag} ${sleeve}  current ${cur}  target ${tgt}`);
      }
      lines.push('');
    }
  }
}

// ── Recommendation ────────────────────────────────────────────────────────────
const rec = get('Next action');
if (rec) {
  lines.push(`👉 Next: ${rec.length > 240 ? rec.slice(0, 237) + '…' : rec}`);
}

// ── Operational trailer ───────────────────────────────────────────────────────
const items = [];
if (health)          items.push(`status: ${health}`);
if (broker)          items.push(`broker: ${broker.length > 80 ? broker.slice(0, 77) + '…' : broker}`);
if (execPosture)     items.push(`exec: ${execPosture}`);
if (blockers && blockers !== '0') items.push(`⚠️ blocks: ${blockers}`);
if (pendingApprovals && pendingApprovals !== '0') items.push(`approvals: ${pendingApprovals}`);
if (inFlight && inFlight !== '0') items.push(`in-flight: ${inFlight}`);

if (items.length) {
  lines.push('');
  lines.push(`Op: ${items.join(' · ')}`);
}

// ── Sanity check ──────────────────────────────────────────────────────────────
if (total != null && invested != null && cash != null) {
  const diff = Math.abs(total - (invested + cash));
  if (diff > 0.5) {
    lines.push('');
    lines.push(`⚠️  Sanity: total (${fmt(total)}) ≠ invested + cash (${fmt(invested + cash)}); diff ${fmt(diff)}`);
  }
}

console.log(lines.join('\n'));