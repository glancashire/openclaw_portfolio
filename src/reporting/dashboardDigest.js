const path = require('path');
const { page, card, badge, metricGrid, dataTable, bulletList, formatCurrency, formatPercent, escapeHtml } = require('./emailHtml');
const { collectPortfolioSummary } = require('./summaryArtifacts');
const { fetchCronHealth } = require('./cronJobsFetcher');
const { readNetLiqHistory, lastNDays } = require('./historyDigest');
const { readSnapshot, summarizeForDashboard } = require('./usageCounters');
const { buildSparklineSvg } = require('./sparkline');
const { effectiveDeliveryPolicy, reportDeliveryStatus } = require('./deliveryPolicy');
const { sendEmailMessage } = require('./emailDelivery');
const fs = require('fs');
const { computeRebalancePlan } = require('../../lib/rebalanceAnalyzer');
const { parseAllocationTargets, parseHoldings, applyAliases } = require('../../lib/portfolioMarkdown');
const { loadDepositsLedger } = require('../../lib/depositsLedger');
const { assessPortfolio, narrateAssessment } = require('../../lib/aiAssessment');
const { createModelClient } = require('../../lib/modelClient');

function resolveDigestRecipients(policy = {}, env = process.env) {
  const configured = Array.isArray(policy.emailRecipients)
    ? policy.emailRecipients.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  if (configured.length) return configured;
  const fallback = String(env.MAILGUN_RECIPIENT || '').trim();
  return fallback ? [fallback] : [];
}

function buildDigestSubject({ portfolioName, frequency = 'daily', generatedAt = new Date().toISOString() }) {
  const date = String(generatedAt).slice(0, 10);
  if (String(frequency).toLowerCase() === 'weekly') {
    return `[${portfolioName}] Weekly portfolio digest — week of ${date}`;
  }
  return `[${portfolioName}] Daily portfolio digest — ${date}`;
}

function toneForCronSeverity(severity = 'ok') {
  if (severity === 'critical' || severity === 'alert') return 'danger';
  if (severity === 'warning' || severity === 'stale') return 'warn';
  return 'success';
}

function summarizeInstrumentHealth(summary = {}) {
  const allocationRows = Array.isArray(summary.allocation) ? summary.allocation : [];
  const allocationByAssetClass = new Map(allocationRows.map((row) => [String(row.assetClass || ''), row]));
  const blockedByTicker = new Map((summary.execution?.blockedRows || []).map((row) => [String(row.tickerOrIsin || ''), row]));
  return (summary.instruments || []).map((instrument) => {
    const allocation = allocationByAssetClass.get(String(instrument.assetClass || '')) || null;
    const blocked = blockedByTicker.get(String(instrument.tickerOrIsin || '')) || null;
    const latestProposal = instrument.latestProposal || null;
    return {
      tickerOrIsin: instrument.tickerOrIsin,
      name: instrument.name,
      assetClass: instrument.assetClass,
      targetPct: Number(instrument.targetPct || 0),
      driftPct: allocation ? Number(allocation.driftPct || 0) : null,
      allocationStatus: allocation?.status || 'unknown',
      proposalStatus: latestProposal?.status || 'none',
      approval: latestProposal?.approval || 'n/a',
      blockReason: blocked?.blockReason || blocked?.blockCode || '',
    };
  });
}

function renderValueHeadlineCard(summary = {}, portfolioDir) {
  const plTotals = summary.profitLoss?.totals || {};
  const holdings = summary.holdings || {};
  const totalValueChf = Number(holdings.totalValueChf || 0);
  const cashChf = Number(holdings.cashChf || 0);
  const totalProfitChf = Number(plTotals.totalProfitChf || 0);
  const totalProfitPct = plTotals.totalProfitPct;

  // Deposit ledger — enables true "total return vs net deposited capital" line.
  let deposits = null;
  try {
    deposits = loadDepositsLedger(portfolioDir);
  } catch (_err) {
    deposits = null;
  }
  const netDepositedChf = deposits && !deposits.missing ? Number(deposits.totals.netDepositedChf || 0) : null;
  const cumulativeDepositsChf = deposits && !deposits.missing ? Number(deposits.totals.cumulativeDepositsChf || 0) : null;
  const cumulativeWithdrawalsChf = deposits && !deposits.missing ? Number(deposits.totals.cumulativeWithdrawalsChf || 0) : null;
  const hasWithdrawals = Number.isFinite(cumulativeWithdrawalsChf) && cumulativeWithdrawalsChf > 0;
  const totalReturnChf = netDepositedChf != null ? Number((totalValueChf - netDepositedChf).toFixed(2)) : null;
  const totalReturnPct = netDepositedChf && netDepositedChf > 0 && totalReturnChf != null
    ? Number(((totalReturnChf / netDepositedChf) * 100).toFixed(2))
    : null;

  // Daily and weekly change from net liq history
  const series = lastNDays(readNetLiqHistory(portfolioDir), 30);
  const values = series.map((row) => Number(row.totalChf || 0)).filter(Number.isFinite);
  let dailyChangeChf = null;
  let weeklyChangeChf = null;
  if (values.length >= 2) {
    dailyChangeChf = Number((values[values.length - 1] - values[values.length - 2]).toFixed(2));
    if (values.length >= 8) {
      weeklyChangeChf = Number((values[values.length - 1] - values[values.length - 7]).toFixed(2));
    } else if (values.length > 1) {
      weeklyChangeChf = Number((values[values.length - 1] - values[0]).toFixed(2));
    }
  }

  const totalReturnLine = totalReturnChf != null
    ? `<div style="font-size:15px;line-height:1.5;color:${totalReturnChf >= 0 ? '#166534' : '#991b1b'};margin-bottom:6px;font-weight:600;">
        Total return vs deposits: ${totalReturnChf >= 0 ? '+' : ''}${formatCurrency(totalReturnChf, 'CHF')}${totalReturnPct != null ? ` (${totalReturnPct >= 0 ? '+' : ''}${totalReturnPct.toFixed(2)}%)` : ''}
        <span style="color:#475569;font-weight:500;font-size:13px;margin-left:6px;">on net deposited ${formatCurrency(netDepositedChf, 'CHF')}${hasWithdrawals ? ` (deposits ${formatCurrency(cumulativeDepositsChf, 'CHF')} · withdrawals ${formatCurrency(cumulativeWithdrawalsChf, 'CHF')})` : ''}</span>
       </div>`
    : '';

  const profitLine = totalProfitChf !== 0 || totalProfitPct != null
    ? `<span style="color:${totalProfitChf >= 0 ? '#0f766e' : '#991b1b'};font-weight:600;">
        ${totalProfitChf > 0 ? '+' : ''}${formatCurrency(totalProfitChf, 'CHF')}${totalProfitPct != null ? ` (${totalProfitPct >= 0 ? '+' : ''}${Number(totalProfitPct).toFixed(2)}%)` : ''} unrealized on held positions
       </span>`
    : '';

  const dailyLine = dailyChangeChf != null
    ? `<span style="color:${dailyChangeChf >= 0 ? '#166534' : '#991b1b'};margin-left:16px;">
        ${dailyChangeChf >= 0 ? '+' : ''}${formatCurrency(dailyChangeChf, 'CHF')} today
       </span>`
    : '';

  const weeklyLine = weeklyChangeChf != null
    ? `<span style="color:${weeklyChangeChf >= 0 ? '#166534' : '#991b1b'};margin-left:16px;">
        ${weeklyChangeChf >= 0 ? '+' : ''}${formatCurrency(weeklyChangeChf, 'CHF')} this week
       </span>`
    : '';

  const cashLine = cashChf > 0
    ? `<div style="margin-top:6px;font-size:13px;color:#374151;">
        <strong>${formatCurrency(cashChf, 'CHF')}</strong> cash — available for deployment
       </div>`
    : '';

  return card({
    title: 'Portfolio performance',
    tone: 'info',
    contentHtml: `
      <div style="font-size:18px;font-weight:700;color:#0f172a;line-height:1.4;margin-bottom:6px;">
        ${formatCurrency(totalValueChf, 'CHF')} current value${dailyLine}${weeklyLine}
      </div>
      ${totalReturnLine}
      ${profitLine ? `<div style="font-size:14px;margin-bottom:2px;">${profitLine}</div>` : ''}
      ${cashLine}
    `,
  });
}

function renderSparklineCard(portfolioDir) {
  const series = lastNDays(readNetLiqHistory(portfolioDir), 30);
  const values = series.map((row) => Number(row.totalChf || 0)).filter(Number.isFinite);
  const current = values.length ? values[values.length - 1] : null;
  const previous = values.length > 1 ? values[0] : null;
  const delta = Number.isFinite(current) && Number.isFinite(previous) ? Number((current - previous).toFixed(2)) : null;
  const spark = buildSparklineSvg(values, { width: 720, height: 120, strokeColor: '#2563eb', fillColor: 'rgba(37, 99, 235, 0.12)', strokeWidth: 2 });
  return card({
    title: 'Portfolio trend',
    tone: 'surface',
    contentHtml: `
      <div style="margin-bottom:10px;color:#475569;font-size:13px;line-height:1.5;">Last ${series.length || 0} end-of-day snapshot(s).</div>
      <div style="padding:8px 0 4px;">${spark}</div>
      <div style="margin-top:12px;font-size:14px;color:#111827;">
        <strong>${Number.isFinite(current) ? formatCurrency(current, 'CHF') : '—'}</strong>
        <span style="color:#6b7280;"> current net liq</span>
        ${Number.isFinite(delta) ? `<span style="margin-left:10px;color:${delta >= 0 ? '#166534' : '#991b1b'};">${delta >= 0 ? '+' : ''}${formatCurrency(delta, 'CHF')} vs earliest point</span>` : ''}
      </div>
    `,
  });
}

function renderTopMoversCard(summary = {}) {
  const pl = summary.profitLoss || {};
  const rows = Array.isArray(pl.rows) ? pl.rows.filter((r) => Number(r.valueChf || 0) > 0) : [];
  if (!rows.length) return '';
  // Sort by absolute value contribution (unrealized profit CHF) so biggest moves come first
  const sorted = rows.slice().sort((a, b) => Math.abs(b.unrealizedProfitChf ?? 0) - Math.abs(a.unrealizedProfitChf ?? 0));
  const gainers = sorted.filter((r) => (r.unrealizedProfitChf ?? 0) > 0).slice(0, 3);
  const losers  = sorted.filter((r) => (r.unrealizedProfitChf ?? 0) < 0).slice(0, 3);
  if (!gainers.length && !losers.length) return '';

  const formatRow = (r) => {
    const name = r.name || r.symbol || r.tickerOrIsin || '—';
    const value = formatCurrency(r.valueChf, 'CHF');
    const plChf = r.unrealizedProfitChf == null ? '—' : formatCurrency(r.unrealizedProfitChf, 'CHF');
    const plPct = r.unrealizedProfitPct == null ? '' : ` (${r.unrealizedProfitPct >= 0 ? '+' : ''}${Number(r.unrealizedProfitPct).toFixed(2)}%)`;
    return [escapeHtml(name), escapeHtml(value), escapeHtml(plChf), escapeHtml(plPct)];
  };

  const tableRows = [];
  if (gainers.length) {
    gainers.forEach((r) => tableRows.push([...formatRow(r), '▲ gainer']));
  }
  if (losers.length) {
    losers.forEach((r) => tableRows.push([...formatRow(r), '▼ loser']));
  }

  return card({
    title: 'Top movers',
    tone: 'surface',
    contentHtml: dataTable({
      columns: [
        { label: 'Instrument' },
        { label: 'Value', align: 'right' },
        { label: 'P/L CHF', align: 'right' },
        { label: 'P/L %', align: 'right' },
        { label: '' },
      ],
      rows: tableRows,
    }),
  });
}

function renderAllocationHealthLine(summary = {}) {
  const rows = Array.isArray(summary.allocation) ? summary.allocation : [];
  const offTrack = rows.filter((r) => String(r.status || '').toLowerCase() !== 'on_track');
  if (!rows.length) return '';
  const allOnTrack = offTrack.length === 0;
  if (allOnTrack) {
    return '<div style="margin-top:10px;font-size:13px;color:#166534;font-weight:600;">✓ All sleeves within target bands</div>';
  }
  return `<div style="margin-top:10px;font-size:13px;color:#92400e;font-weight:600;">⚠ ${offTrack.length}/${rows.length} sleeve(s) off-track: ${offTrack.map((r) => `${escapeHtml(r.assetClass || '—')} (${formatPercent(r.driftPct || 0)})`).join(', ')}</div>`;
}

function renderProfitLossCard(summary = {}) {
  const pl = summary.profitLoss || {};
  const rows = Array.isArray(pl.rows) ? pl.rows : [];
  const totals = pl.totals || {};
  if (!rows.length && totals.totalProfitChf == null) return '';
  const visibleRows = rows.filter((r) => Number(r.valueChf || 0) > 0);
  const totalValueChf = visibleRows.reduce((s, r) => s + (Number(r.valueChf) || 0), 0)
    + Number(summary.holdings?.cashChf || 0);
  const tableRows = visibleRows.map((r) => {
    const profit = r.unrealizedProfitChf;
    const profitPct = r.unrealizedProfitPct;
    const profitColor = profit == null ? '#6b7280' : profit >= 0 ? '#0f766e' : '#991b1b';
    const profitCell = profit == null
      ? '<span style="color:#6b7280;">—</span>'
      : `<span style="color:${profitColor};font-weight:600;">${formatCurrency(profit, 'CHF')}${profitPct != null ? ` (${profitPct >= 0 ? '+' : ''}${profitPct.toFixed(2)}%)` : ''}</span>`;
    return [
      escapeHtml(r.name || r.symbol || r.tickerOrIsin || '—'),
      escapeHtml(formatCurrency(r.valueChf, 'CHF')),
      escapeHtml(r.costBasisChf == null ? '—' : formatCurrency(r.costBasisChf, 'CHF')),
      profitCell,
    ];
  });
  const totalProfitChf = Number(totals.totalProfitChf || 0);
  const totalProfitPct = totals.totalProfitPct;
  const headlineColor = totalProfitChf >= 0 ? '#0f766e' : '#991b1b';
  const coverageLine = `Cost-basis coverage: ${totals.coveredCount || 0}/${rows.length} holdings (trades.md preferred; IBKR avg cost fallback). Holdings without cost basis show —.`;
  return card({
    title: 'Profit / Loss',
    tone: 'surface',
    contentHtml: `
      <div style="font-size:15px;line-height:1.5;color:#0f172a;margin-bottom:8px;">
        <strong>Total portfolio value (incl. cash):</strong> ${escapeHtml(formatCurrency(totalValueChf, 'CHF'))}
      </div>
      <div style="font-size:15px;line-height:1.5;color:${headlineColor};margin-bottom:10px;font-weight:600;">
        Unrealized profit: ${escapeHtml(formatCurrency(totalProfitChf, 'CHF'))}${totalProfitPct != null ? ` (${totalProfitPct >= 0 ? '+' : ''}${Number(totalProfitPct).toFixed(2)}%)` : ''}
      </div>
      ${dataTable({
        columns: [
          { label: 'Instrument' },
          { label: 'Value', align: 'right' },
          { label: 'Cost basis', align: 'right' },
          { label: 'Profit', align: 'right' },
        ],
        rows: tableRows,
      })}
      <div style="margin-top:10px;font-size:12px;color:#6b7280;">${escapeHtml(coverageLine)}</div>
    `,
  });
}

function renderInstrumentHealthCard(summary = {}) {
  const rows = summarizeInstrumentHealth(summary).map((row) => [
    escapeHtml(row.tickerOrIsin || '—'),
    escapeHtml(row.assetClass || '—'),
    escapeHtml(Number.isFinite(row.driftPct) ? formatPercent(row.driftPct) : '—'),
    escapeHtml(row.proposalStatus || 'none'),
    escapeHtml(row.approval || 'n/a'),
    escapeHtml(row.blockReason || '—'),
  ]);
  return card({
    title: 'Instrument health',
    tone: 'surface',
    contentHtml: dataTable({
      columns: [
        { label: 'Instrument' },
        { label: 'Sleeve' },
        { label: 'Drift', align: 'right' },
        { label: 'Proposal' },
        { label: 'Approval' },
        { label: 'Block / note' },
      ],
      rows,
    }),
  });
}

function renderCronHealthCard(cronHealth = {}) {
  const status = cronHealth.status || 'ok';
  const rows = (cronHealth.jobs || []).slice(0, 8).map((job) => [
    escapeHtml(job.name || 'unnamed'),
    badge({ label: job.severity || 'ok', tone: toneForCronSeverity(job.severity) }),
    escapeHtml(String(job.consecutiveErrors ?? 0)),
    escapeHtml(job.lastRunAgeHours == null ? 'n/a' : `${job.lastRunAgeHours.toFixed(1)}h`),
    escapeHtml(job.lastError ? String(job.lastError).slice(0, 120) : '—'),
  ]);
  const summaryBadges = status === 'unavailable'
    ? `${badge({ label: 'inspection unavailable', tone: 'warn' })}`
    : `
        ${badge({ label: `${cronHealth.healthy || 0}/${cronHealth.total || 0} healthy`, tone: (cronHealth.failing || 0) > 0 ? 'warn' : 'success' })}
        ${badge({ label: `${cronHealth.failing || 0} failing`, tone: (cronHealth.failing || 0) > 0 ? 'danger' : 'success' })}
      `;
  const detail = status === 'unavailable'
    ? `<div style="font-size:13px;color:#92400e;">${escapeHtml(cronHealth.message || 'Cron inspection unavailable.')}</div>`
    : dataTable({
        columns: [
          { label: 'Job' },
          { label: 'Severity' },
          { label: 'Errors', align: 'right' },
          { label: 'Age', align: 'right' },
          { label: 'Last error' },
        ],
        rows,
      });
  return card({
    title: 'Cron health',
    tone: 'surface',
    contentHtml: `
      <div style="margin-bottom:12px;display:flex;gap:10px;flex-wrap:wrap;">
        ${summaryBadges}
      </div>
      ${detail}
    `,
  });
}

function renderWorkflowCard(summary = {}, deliveryStatus = {}) {
  const items = [];
  if (summary.recommendedNextStep) items.push(`Next step: ${summary.recommendedNextStep}`);
  for (const item of (summary.pendingActions || []).slice(0, 5)) items.push(item);
  for (const item of (deliveryStatus.pendingActions || []).slice(0, 3)) {
    if (!items.includes(item)) items.push(item);
  }
  return card({
    title: 'Next steps',
    tone: 'warn',
    contentHtml: bulletList(items),
  });
}

function tryRender(fn, fallbackComment = '') {
  try { return fn() || ''; } catch (err) {
    return `<!-- digest-section error: ${String(err.message).replace(/[<>]/g, '')} -->${fallbackComment}`;
  }
}

function buildRebalancePlanForDigest(portfolioDir) {
  const portfolioPath = path.join(portfolioDir, 'portfolio.md');
  const holdingsPath  = path.join(portfolioDir, 'holdings.md');
  if (!fs.existsSync(portfolioPath) || !fs.existsSync(holdingsPath)) return null;
  const targets = parseAllocationTargets(fs.readFileSync(portfolioPath, 'utf8'));
  const { holdings: raw, cashChf } = parseHoldings(fs.readFileSync(holdingsPath, 'utf8'));
  const holdings = applyAliases(raw, targets._aliases);
  return computeRebalancePlan({
    holdings, targets, cashChf,
    fxRates: { EUR: 0.96, USD: 0.88, GBP: 1.15 },
  });
}

function renderRebalanceSnapshotCard(plan) {
  if (!plan || !Array.isArray(plan.legs) || plan.legs.length === 0) return '';
  const rows = plan.legs.map((l) => {
    const driftColor = Math.abs(l.driftPct) < 0.5 ? '#6b7280' : l.driftPct > 0 ? '#991b1b' : '#0f766e';
    const driftCell = `<span style="color:${driftColor};font-weight:600;">${l.driftPct > 0 ? '+' : ''}${l.driftPct.toFixed(2)}pp</span>`;
    return [
      escapeHtml(l.symbol),
      escapeHtml(formatCurrency(l.valueChf, 'CHF')),
      escapeHtml(`${l.actualPct.toFixed(2)}%`),
      escapeHtml(`${l.targetPct}%`),
      driftCell,
      escapeHtml(formatCurrency(l.gapChf, 'CHF')),
    ];
  });
  const overshoot = plan.scenarios.sell_overshoot;
  const summaryLine = (overshoot.sellsChf > 0 || overshoot.buysChf > 0)
    ? `Sell-overshoot scenario: sells CHF ${overshoot.sellsChf}, buys CHF ${overshoot.buysChf}; cash needed CHF ${overshoot.cashNeededChf}; leftover drift ${overshoot.leftoverDriftPp}pp.`
    : 'No rebalance action above min-trade-size today.';
  return card({
    title: 'Drift vs target',
    tone: 'surface',
    contentHtml: `
      ${dataTable({
        columns: [
          { label: 'Symbol' },
          { label: 'Value', align: 'right' },
          { label: 'Actual %', align: 'right' },
          { label: 'Target %', align: 'right' },
          { label: 'Drift', align: 'right' },
          { label: 'Gap CHF', align: 'right' },
        ],
        rows,
      })}
      <div style="margin-top:12px;font-size:13px;color:#374151;">${escapeHtml(summaryLine)}</div>
    `,
  });
}

function renderAiAssessmentCard(assessment) {
  if (!assessment || !assessment.lead) return '';
  const chips = (assessment.tags || []).map((tag) => {
    const tone = tag === 'drift_alert' ? 'danger'
      : tag === 'nav_drawdown' ? 'danger'
      : tag === 'awaiting_approval' ? 'warn'
      : tag === 'cash_above_target' ? 'info'
      : tag === 'cash_below_target' ? 'warn'
      : 'success';
    return badge({ label: tag.replace(/_/g, ' '), tone });
  }).join(' ');
  const bullets = (assessment.details || []).map((d) => `<li style="margin:4px 0;">${escapeHtml(d.summary)}</li>`).join('');
  return card({
    title: 'Assessment',
    tone: 'info',
    contentHtml: `
      <div style="margin-bottom:10px;font-size:15px;line-height:1.55;color:#0f172a;font-weight:600;">${escapeHtml(assessment.lead)}</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">${chips}</div>
      <ul style="margin:0;padding-left:18px;color:#475569;font-size:13px;line-height:1.5;">${bullets}</ul>
    `,
  });
}

/**
 * Render an Operations KPI card from the cached usage-counters snapshot.
 * Returns empty string if no counters file exists, so the digest renders
 * cleanly without KPI data.
 */
function renderOperationsKpiCard() {
  const snapshot = readSnapshot();
  if (!snapshot) return '';
  const items = summarizeForDashboard(snapshot);
  if (!items.length) return '';
  return card({
    title: 'Operations KPI',
    contentHtml: metricGrid(items),
  });
}

async function buildDashboardDigest({ portfolioDir, frequency = 'daily', generatedAt = new Date().toISOString(), cronHealth = null, modelClient = null }) {
  const portfolioName = path.basename(portfolioDir);
  const summary = await collectPortfolioSummary({ portfolioDir });
  const deliveryStatus = reportDeliveryStatus({ portfolioDir });
  const resolvedCronHealth = cronHealth || fetchCronHealth();
  const rebalanceContext = await (async () => {
    try {
      const plan = buildRebalancePlanForDigest(portfolioDir);
      if (!plan) return null;
      const navHistory = lastNDays(readNetLiqHistory(portfolioDir), 14);
      const baseAssessment = assessPortfolio({ plan, navHistory, summary });
      const client = modelClient || createModelClient();
      const narrated = await narrateAssessment({
        assessment: baseAssessment,
        context: { portfolio: path.basename(portfolioDir), plan, summary, navHistory },
        modelClient: client,
      });
      return { plan, assessment: narrated };
    } catch (_err) {
      return null;
    }
  })();
  // Allocation health line — compact, inline after value headline
  const allocationHealthHtml = renderAllocationHealthLine(summary);
  const bodyHtml = [
    renderValueHeadlineCard(summary, portfolioDir),
    renderTopMoversCard(summary),
    renderSparklineCard(portfolioDir),
    renderProfitLossCard(summary),
    allocationHealthHtml,
    tryRender(() => {
      // Drift vs target detail shown but below the fold
      if (!rebalanceContext) return '';
      return renderRebalanceSnapshotCard(rebalanceContext.plan) + renderAiAssessmentCard(rebalanceContext.assessment);
    }),
    renderInstrumentHealthCard(summary),
    renderCronHealthCard(resolvedCronHealth),
    renderOperationsKpiCard(),
    renderWorkflowCard(summary, deliveryStatus),
  ].join('');

  const html = page({
    eyebrow: 'OpenClaw Portfolio Digest',
    title: `${portfolioName} ${String(frequency).toLowerCase() === 'weekly' ? 'weekly' : 'daily'} portfolio digest`,
    subtitle: 'Profit/loss, value, health, cron posture, and what needs attention next.',
    accent: '#0f172a',
    bodyHtml,
    footer: 'OpenClaw Portfolio Manager • Digest email',
  });

  const profitTotals = summary.profitLoss?.totals || {};
  const profitRows = Array.isArray(summary.profitLoss?.rows) ? summary.profitLoss.rows.filter((r) => Number(r.valueChf || 0) > 0) : [];
  const totalValueInclCashChf = profitRows.reduce((s, r) => s + (Number(r.valueChf) || 0), 0)
    + Number(summary.holdings?.cashChf || 0);

  let depositsTotalsForText = null;
  try {
    const dl = loadDepositsLedger(portfolioDir);
    if (dl && !dl.missing) depositsTotalsForText = dl.totals;
  } catch (_err) { /* ignore */ }
  const totalReturnChfText = depositsTotalsForText
    ? Number((totalValueInclCashChf - Number(depositsTotalsForText.netDepositedChf || 0)).toFixed(2))
    : null;
  const totalReturnPctText = depositsTotalsForText && Number(depositsTotalsForText.netDepositedChf) > 0 && totalReturnChfText != null
    ? Number(((totalReturnChfText / Number(depositsTotalsForText.netDepositedChf)) * 100).toFixed(2))
    : null;

  const textSections = [
    `${portfolioName} ${frequency} portfolio digest`,
    '',
    `Portfolio value (incl cash): ${formatCurrency(totalValueInclCashChf, 'CHF')}`,
    `Cash: ${formatCurrency(summary.holdings?.cashChf, 'CHF')}`,
    ...(depositsTotalsForText
      ? [
          `Net deposited: ${formatCurrency(depositsTotalsForText.netDepositedChf, 'CHF')}`,
          `Total return vs deposits: ${totalReturnChfText >= 0 ? '+' : ''}${formatCurrency(totalReturnChfText, 'CHF')}${totalReturnPctText != null ? ` (${totalReturnPctText >= 0 ? '+' : ''}${totalReturnPctText.toFixed(2)}%)` : ''}`,
        ]
      : []),
    `Unrealized profit on held positions: ${formatCurrency(profitTotals.totalProfitChf, 'CHF')}${profitTotals.totalProfitPct != null ? ` (${profitTotals.totalProfitPct >= 0 ? '+' : ''}${Number(profitTotals.totalProfitPct).toFixed(2)}%)` : ''}`,
    `Pending approvals: ${summary.approvals?.pendingApprovalCount || 0}`,
    `Operator queue: ${summary.operatorQueue?.summary?.total || 0}`,
    resolvedCronHealth.status === 'unavailable'
      ? `Cron health: unavailable (${resolvedCronHealth.message || 'cron inspection unavailable'})`
      : `Cron health: ${resolvedCronHealth.healthy || 0}/${resolvedCronHealth.total || 0} healthy, ${resolvedCronHealth.failing || 0} failing`,
    '',
    'Holdings (value / profit)',
    ...profitRows.map((r) => {
      const name = r.name || r.symbol || r.tickerOrIsin || '?';
      const value = formatCurrency(r.valueChf, 'CHF');
      const profit = r.unrealizedProfitChf == null ? '—' : formatCurrency(r.unrealizedProfitChf, 'CHF');
      const profitPct = r.unrealizedProfitPct == null ? '' : ` (${r.unrealizedProfitPct >= 0 ? '+' : ''}${Number(r.unrealizedProfitPct).toFixed(2)}%)`;
      return `- ${name}: ${value}  P/L ${profit}${profitPct}`;
    }),
    '',
    'Open issues / next actions',
    ...((summary.pendingActions || []).slice(0, 8).map((item) => `- ${item}`)),
  ];

  return {
    portfolioName,
    frequency,
    generatedAt,
    subject: buildDigestSubject({ portfolioName, frequency, generatedAt }),
    summary,
    cronHealth: resolvedCronHealth,
    deliveryStatus,
    html,
    text: textSections.join('\n'),
  };
}

async function sendDashboardDigest({ portfolioDir, frequency = 'daily', generatedAt = new Date().toISOString(), dryRun = false, sendEmailImpl = sendEmailMessage, cronHealth = null, env = process.env }) {
  const digest = await buildDashboardDigest({ portfolioDir, frequency, generatedAt, cronHealth });
  const policy = effectiveDeliveryPolicy(portfolioDir);
  const recipients = resolveDigestRecipients(policy, env);
  if (!recipients.length) {
    return {
      attempted: false,
      sent: false,
      reason: 'no_recipients_configured',
      subject: digest.subject,
      recipients: [],
      digest,
    };
  }
  if (dryRun) {
    return {
      attempted: false,
      sent: false,
      dryRun: true,
      subject: digest.subject,
      recipients,
      digest,
    };
  }
  const result = await sendEmailImpl({
    policy: { ...policy, emailRecipients: recipients },
    subject: digest.subject,
    text: digest.text,
    html: digest.html,
  });
  return {
    attempted: true,
    sent: true,
    subject: digest.subject,
    recipients,
    provider: policy.emailProvider || 'mailgun',
    result,
    digest,
  };
}

module.exports = {
  resolveDigestRecipients,
  buildDigestSubject,
  summarizeInstrumentHealth,
  buildDashboardDigest,
  sendDashboardDigest,
};
