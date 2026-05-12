const fs = require('fs');
const os = require('os');
const path = require('path');
const { classifyPortfolioKind, formatDriftSummary, summarizeOverview, formatOverviewMarkdown, generateOverviewBoard, formatRecommendedActionLabel, buildRecommendedActionRows, formatQueueSummary, buildPortfolioTable, brokerBlockHint } = require('../src/reporting/overviewBoard');
const { buildApprovalsQueue, buildDailySummary, buildReportHistory, buildDeliveryOverview, renderApprovalsQueueMarkdown, renderDailySummaryMarkdown, renderReportHistoryMarkdown, renderDeliveryStatusMarkdown, renderCockpitPage, generateOverviewArtifacts } = require('../src/reporting/summaryArtifacts');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function seedGeneratedArtifactBrokerBlockRepo(repoRoot) {
  const portfolioDir = path.join(repoRoot, 'portfolio', 'demo');
  const reportsDir = path.join(portfolioDir, 'reports');
  fs.mkdirSync(portfolioDir, { recursive: true });
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.mkdirSync(path.join(repoRoot, 'runtime'), { recursive: true });

  fs.writeFileSync(path.join(portfolioDir, 'portfolio.md'), `# Portfolio: demo\n\n## Status\n- Status: active\n- Base currency: CHF\n- Broker: interactive-brokers\n- Broker account reference: demo\n- Execution mode: transmitted_live\n- Delivery mode: local_only\n- Delivery channels: operator-console\n`);
  fs.writeFileSync(path.join(portfolioDir, 'holdings.md'), '# Holdings\n');
  fs.writeFileSync(path.join(portfolioDir, 'dashboard.md'), '# Dashboard\n');
  fs.writeFileSync(path.join(portfolioDir, 'history.md'), `# History\n\n## Daily Valuation History\n| Date | Snapshot | Total value CHF | Invested CHF | Cash CHF | Daily change CHF | Daily change % | Notes |\n|---|---|---:|---:|---:|---:|---:|---|\n| 2026-05-11 | close | 5000 | 1000 | 4000 | 0 | 0 | ok |\n`);
  fs.writeFileSync(path.join(portfolioDir, 'trades.md'), `# Trades\n\n## Trade Log\n| Date/time | Status | Action | Ticker / ISIN | Name | Quantity | Limit price | Estimated CHF | Actual CHF | Reason | Approval | Broker order id | Block code | Block reason | Blocked at | Next action |\n|---|---|---|---|---|---:|---:|---:|---:|---|---|---|---|---|---|---|\n| 2026-05-11 09:40:00 | inactive | buy | IE000XZSV718 | SPYL | 105 | 15.5 | 1560.83 | 0 | live submit | broker_inactive | 9105 | exchange_closed_at_submit | Broker rejected the order because the target exchange was closed at submission time. | 2026-05-11 09:40:02 | Retry during the venue trading session or hand the row back to the market-open runner. |\n`);
  fs.writeFileSync(path.join(repoRoot, 'runtime', 'fill-notifications-state.json'), JSON.stringify({ notifiedFills: [], reconciledUnnotifiedFills: [9105] }, null, 2));
  fs.writeFileSync(path.join(reportsDir, 'demo-weekly-20260511.md'), '# Demo Weekly Report\n');
}

async function main() {
  assert(typeof classifyPortfolioKind === 'function', 'Expected classifyPortfolioKind export');
  assert(typeof formatDriftSummary === 'function', 'Expected formatDriftSummary export');
  assert(typeof summarizeOverview === 'function', 'Expected summarizeOverview export');
  assert(typeof formatRecommendedActionLabel === 'function', 'Expected formatRecommendedActionLabel export');
  assert(typeof buildRecommendedActionRows === 'function', 'Expected buildRecommendedActionRows export');
  assert(typeof buildPortfolioTable === 'function', 'Expected buildPortfolioTable export');
  assert(typeof brokerBlockHint === 'function', 'Expected brokerBlockHint export');
  assert(typeof formatQueueSummary === 'function', 'Expected formatQueueSummary export');
  assert(typeof formatOverviewMarkdown === 'function', 'Expected formatOverviewMarkdown export');
  assert(typeof generateOverviewBoard === 'function', 'Expected generateOverviewBoard export');

  assert(classifyPortfolioKind({ portfolio: 'etf' }) === 'active', 'Expected active portfolio classification');
  assert(classifyPortfolioKind({ portfolio: 'acceptance-closure' }) === 'demo_like', 'Expected demo-like classification');
  assert(formatDriftSummary([{ status: 'out_of_bounds' }, { status: 'on_track' }]) === '1 out_of_bounds', 'Expected severe drift summary');
  assert(formatDriftSummary([{ status: 'drifted' }]) === '1 drifted', 'Expected minor drift summary');
  assert(formatDriftSummary([]) === 'n/a', 'Expected n/a drift summary');
  assert(formatRecommendedActionLabel({ queueType: 'open_runner_queue' }) === 'open_runner/first_handoff', 'Expected first-handoff action label');
  assert(formatRecommendedActionLabel({ queueType: 'open_runner_retry' }) === 'open_runner/retry', 'Expected retry action label');

  const index = {
    generatedAt: '2026-05-06T00:00:00.000Z',
    totalValueChf: 5000,
    portfolios: [
      {
        portfolio: 'etf',
        status: 'warning',
        totalValueChf: 5000,
        blockers: 0,
        pendingApprovals: 7,
        pendingActions: 2,
        openRunnerQueue: 1,
        openRunnerRetry: 0,
        recommendedNextStep: 'Restore broker connectivity.',
        blockedTradeCount: 1,
        topBrokerBlock: {
          tickerOrIsin: 'IE000XZSV718',
          blockCode: 'exchange_closed_at_submit',
          blockReason: 'Broker rejected the order because the target exchange was closed at submission time.',
          nextAction: 'Retry during the venue trading session or hand the row back to the market-open runner.',
        },
        driftStatuses: [{ assetClass: 'Global equities', status: 'out_of_bounds', driftPct: -60 }],
      },
      {
        portfolio: 'acceptance-closure',
        status: 'warning',
        totalValueChf: 0,
        blockers: 5,
        pendingApprovals: 0,
        pendingActions: 6,
        openRunnerQueue: 0,
        openRunnerRetry: 2,
        recommendedNextStep: 'Resolve blockers.',
        driftStatuses: [{ assetClass: 'Global equities', status: 'out_of_bounds', driftPct: -50 }],
      },
    ],
  };
  const pending = {
    queueSummary: { total: 2, blocking: 1, approvals: 0, execution: 0, openRunnerQueue: 1, openRunnerRetry: 0, recovery: 1, delivery: 0, data: 0, warnings: 0, workflow: 1 },
    items: [
      { portfolio: 'etf', queueType: 'open_runner_queue', severity: 'medium', status: 'pending', summary: 'First market-open handoff is queued.', recommendedOperatorAction: 'Confirm the row still belongs in the next open-runner batch.' },
      { portfolio: 'acceptance-closure', queueType: 'open_runner_retry', severity: 'high', status: 'ready_for_review', summary: 'Blocked row was requeued for the next intended market-open run.', recommendedOperatorAction: 'Verify blocker recovery before the retry window opens.' },
    ],
  };

  assert(brokerBlockHint(index.portfolios[0]) === '[exchange_closed_at_submit IE000XZSV718] Retry during the venue trading session or hand the row back to the market-open runner.', 'Expected broker block hint rendering');

  const queueSummaryText = formatQueueSummary(pending.queueSummary);
  assert(queueSummaryText.includes('- Open-runner first handoffs: 1'), 'Expected helper first-handoff summary line');
  assert(queueSummaryText.includes('- Open-runner retries: 0'), 'Expected helper retry summary line');

  const recommendedActionText = buildRecommendedActionRows(pending);
  assert(recommendedActionText.includes('1. [open_runner/first_handoff] etf: First market-open handoff is queued. — Confirm the row still belongs in the next open-runner batch.'), 'Expected helper first-handoff recommended action text');
  assert(recommendedActionText.includes('2. [open_runner/retry] acceptance-closure: Blocked row was requeued for the next intended market-open run. — Verify blocker recovery before the retry window opens.'), 'Expected helper retry recommended action text');

  const totals = summarizeOverview(index, pending);
  assert(Object.keys(totals).sort().join(',') === ['activeCount','blockedCount','demoLikeCount','healthyCount','pendingActions','pendingApprovals','portfolioCount','totalValueChf','warningCount'].sort().join(','), 'Expected stable overview totals keys');
  assert(totals.portfolioCount === 2, 'Expected portfolio count');
  assert(totals.totalValueChf === 5000, 'Expected total value');
  assert(totals.activeCount === 1, 'Expected one active portfolio');
  assert(totals.demoLikeCount === 1, 'Expected one demo-like portfolio');
  assert(totals.healthyCount === 0, 'Expected zero healthy portfolios');
  assert(totals.warningCount === 2, 'Expected two warning portfolios');
  assert(totals.blockedCount === 0, 'Expected zero blocked portfolios');
  assert(totals.pendingApprovals === 7, 'Expected pending approvals total');
  assert(totals.pendingActions === 2, 'Expected pending action total');

  assert(buildRecommendedActionRows({ items: [] }) === '1. No pending cross-portfolio actions.', 'Expected empty recommended-actions helper text');
  const emptyQueueSummaryText = formatQueueSummary({});
  assert(emptyQueueSummaryText.includes('- Open-runner first handoffs: 0'), 'Expected empty helper first-handoff summary line');
  assert(emptyQueueSummaryText.includes('- Open-runner retries: 0'), 'Expected empty helper retry summary line');

  const emptyTotals = summarizeOverview({ portfolios: [], totalValueChf: 0 }, { items: [] });
  assert(emptyTotals.portfolioCount === 0, 'Expected empty summary portfolio count');
  assert(emptyTotals.totalValueChf === 0, 'Expected empty summary total value');
  assert(emptyTotals.activeCount === 0, 'Expected empty summary active count');
  assert(emptyTotals.demoLikeCount === 0, 'Expected empty summary demo-like count');
  assert(emptyTotals.healthyCount === 0, 'Expected empty summary healthy count');
  assert(emptyTotals.warningCount === 0, 'Expected empty summary warning count');
  assert(emptyTotals.blockedCount === 0, 'Expected empty summary blocked count');
  assert(emptyTotals.pendingApprovals === 0, 'Expected empty summary pending approvals');
  assert(emptyTotals.pendingActions === 0, 'Expected empty summary pending actions');

  const emptyBoardTable = buildPortfolioTable({ portfolios: [] });
  assert(emptyBoardTable === '| none | n/a | 0 | unknown | n/a | 0 | 0 | 0 | 0 | 0 | no portfolios discovered |\n', 'Expected empty board helper row');

  const emptyMarkdown = formatOverviewMarkdown({ index: { generatedAt: '2026-05-06T00:00:00.000Z', totalValueChf: 0, portfolios: [] }, pending: { queueSummary: {}, items: [] } });
  assert(emptyMarkdown.includes('| Portfolio | Kind | Total value CHF | Health | Drift posture | Blockers | Pending approvals | Pending actions | First handoffs | Retries | Recommended next step |'), 'Expected empty-state board header');
  assert(emptyMarkdown.includes('| none | n/a | 0 | unknown | n/a | 0 | 0 | 0 | 0 | 0 | no portfolios discovered |'), 'Expected empty-state board row');
  assert(emptyMarkdown.includes('## Operator Queue Summary\n- Total queue items: 0'), 'Expected empty-state queue summary section');
  assert(emptyMarkdown.includes('- Open-runner first handoffs: 0'), 'Expected empty-state first-handoff queue summary line');
  assert(emptyMarkdown.includes('- Open-runner retries: 0'), 'Expected empty-state retry queue summary line');
  assert(emptyMarkdown.includes('## Cross-Portfolio Recommended Actions\n1. No pending cross-portfolio actions.'), 'Expected empty-state recommended actions section');

  const boardTable = buildPortfolioTable(index);
  assert(boardTable.includes('| etf | active | 5000 | warning | 1 out_of_bounds | 0 | 7 | 2 | 1 | 0 | [exchange_closed_at_submit IE000XZSV718] Retry during the venue trading session or hand the row back to the market-open runner. |'), 'Expected populated ETF board helper row');
  assert(boardTable.includes('| acceptance-closure | demo_like | 0 | warning | 1 out_of_bounds | 5 | 0 | 6 | 0 | 2 | Resolve blockers. |'), 'Expected populated acceptance board helper row');

  const markdown = formatOverviewMarkdown({ index, pending });
  assert(markdown.includes('# Multi-Portfolio Overview'), 'Expected title');
  assert(markdown.includes('| etf | active | 5000 | warning | 1 out_of_bounds | 0 | 7 | 2 | 1 | 0 | [exchange_closed_at_submit IE000XZSV718] Retry during the venue trading session or hand the row back to the market-open runner. |'), 'Expected ETF board row');
  assert(markdown.includes('| acceptance-closure | demo_like | 0 | warning | 1 out_of_bounds | 5 | 0 | 6 | 0 | 2 | Resolve blockers. |'), 'Expected acceptance board row');
  assert(markdown.includes('## Operator Queue Summary'), 'Expected operator queue summary section');
  assert(markdown.includes('- Open-runner first handoffs: 1'), 'Expected first-handoff count in queue summary');
  assert(markdown.includes('- Open-runner retries: 0'), 'Expected retry count in queue summary');
  assert(markdown.includes('First handoffs | Retries | Recommended next step') || markdown.includes('| First handoffs | Retries | Recommended next step |'), 'Expected open-runner columns in board header');
  assert(markdown.includes('- Recovery items: 1') || markdown.includes('- Recovery items: 0'), 'Expected recovery count line in queue summary');
  assert(markdown.includes('1. [open_runner/first_handoff] etf: First market-open handoff is queued. — Confirm the row still belongs in the next open-runner batch.'), 'Expected first-handoff recommended action row');
  assert(markdown.includes('2. [open_runner/retry] acceptance-closure: Blocked row was requeued for the next intended market-open run. — Verify blocker recovery before the retry window opens.'), 'Expected retry recommended action row');

  const approvalsQueue = buildApprovalsQueue([
    {
      portfolio: 'etf',
      operatorQueue: {
        items: [
          { queueType: 'approval', kind: 'approval', severity: 'medium', status: 'pending_user_approval', summary: '7 proposed trade row(s) still need user approval.', recommendedOperatorAction: 'Review the proposed trades and approve or reject them explicitly.' },
        ],
      },
    },
  ]);
  const approvalsMarkdown = renderApprovalsQueueMarkdown(approvalsQueue);
  assert(approvalsQueue.itemCount === 1, 'Expected one approval queue item');
  assert(approvalsQueue.items[0].urgency === 'medium', 'Expected medium urgency approval item');
  assert(approvalsMarkdown.includes('# Approvals Queue'), 'Expected approvals queue title');
  assert(approvalsMarkdown.includes('Effect if approved'), 'Expected approval consequence text');

  const dailySummary = buildDailySummary([
    {
      portfolio: 'etf',
      status: { health: 'warning', brokerHealth: 'degraded', dataFreshness: 'current', deliveryPosture: 'ready' },
      holdings: { cashChf: 5000 },
      allocation: [{ assetClass: 'Global equities', driftPct: -60, status: 'out_of_bounds' }],
      approvals: { pendingApprovalCount: 7 },
      recommendedNextStep: 'Restore broker connectivity.',
      execution: {
        blockedRows: [{
          tickerOrIsin: 'IE000XZSV718',
          blockCode: 'exchange_closed_at_submit',
          blockReason: 'Broker rejected the order because the target exchange was closed at submission time.',
          nextAction: 'Retry during the venue trading session or hand the row back to the market-open runner.',
        }],
      },
      explanations: {
        biggestDrift: 'Global equities are 60% under target and outside the allowed band around the 100% target.',
        executionBlock: 'Execution is blocked because broker readiness is degraded: broker offline.',
        approvalBacklog: '7 approval-gated trade row(s) still need explicit operator review before the workflow can advance cleanly.',
      },
    },
  ], approvalsQueue);
  const dailyMarkdown = renderDailySummaryMarkdown(dailySummary);
  assert(dailySummary.healthHeadline === 'warning', 'Expected warning daily headline');
  assert(dailySummary.cashWaitingToDeployChf === 5000, 'Expected daily cash total');
  assert(dailySummary.pendingApprovals === 1, 'Expected approval queue alignment in daily summary');
  assert(dailySummary.highlightedPortfolio.blockedTradeCount === 1, 'Expected highlighted broker-block count');
  assert(dailySummary.highlightedPortfolio.topBrokerBlock.blockCode === 'exchange_closed_at_submit', 'Expected highlighted broker block code');
  assert(/exchange was closed at submission time/i.test(dailySummary.highlightedPortfolio.whyNow), 'Expected broker-block why-now explanation');
  assert(dailyMarkdown.includes('# Daily Summary Page'), 'Expected daily summary title');
  assert(dailyMarkdown.includes('Cash waiting to deploy CHF: 5000'), 'Expected daily cash line');
  assert(dailyMarkdown.includes('Biggest Drift Today'), 'Expected biggest drift section');
  assert(dailyMarkdown.includes('Why it matters'), 'Expected drift explanation line');
  assert(dailyMarkdown.includes('Broker-blocked rows: 1'), 'Expected highlighted broker-block count line');
  assert(dailyMarkdown.includes('Top broker block: exchange_closed_at_submit (IE000XZSV718)'), 'Expected highlighted top broker block line');
  assert(dailyMarkdown.includes('Why now'), 'Expected highlighted portfolio explanation line');

  const generated = await generateOverviewArtifacts({ repoRoot: path.resolve(__dirname, '..'), writeFiles: true });
  await generateOverviewBoard({ repoRoot: path.resolve(__dirname, '..'), writeFiles: true });
  const approvalsHtml = fs.readFileSync(generated.approvalsQueueHtmlPath, 'utf8');
  const dailyHtml = fs.readFileSync(generated.dailySummaryHtmlPath, 'utf8');
  const overviewMarkdown = fs.readFileSync(path.join(path.resolve(__dirname, '..'), 'runtime', 'overview', 'portfolio-overview.md'), 'utf8');
  const overviewHtml = fs.readFileSync(path.join(path.resolve(__dirname, '..'), 'runtime', 'overview', 'portfolio-overview.html'), 'utf8');
  const portfolioIndexJson = JSON.parse(fs.readFileSync(path.join(path.resolve(__dirname, '..'), 'runtime', 'overview', 'portfolio-index.json'), 'utf8'));
  const pendingActionsJson = JSON.parse(fs.readFileSync(path.join(path.resolve(__dirname, '..'), 'runtime', 'overview', 'pending-actions.json'), 'utf8'));
  assert(fs.existsSync(generated.approvalsQueuePath), 'Expected approvals queue json artifact');
  assert(fs.existsSync(generated.approvalsQueueMarkdownPath), 'Expected approvals queue markdown artifact');
  assert(fs.existsSync(generated.pendingActionsPath), 'Expected pending-actions json artifact');
  assert(approvalsHtml.includes('Approvals Queue'), 'Expected approvals queue html artifact');
  assert(approvalsHtml.includes('Effect if approved'), 'Expected approvals queue consequence rendering');
  assert(fs.existsSync(generated.dailySummaryPath), 'Expected daily summary json artifact');
  assert(overviewMarkdown.includes('# Multi-Portfolio Overview'), 'Expected overview markdown title');
  assert(overviewMarkdown.includes('## Portfolio Board'), 'Expected overview markdown portfolio board section');
  assert(overviewMarkdown.includes('## Operator Queue Summary'), 'Expected overview markdown queue summary section');
  assert(overviewMarkdown.includes('## Cross-Portfolio Recommended Actions'), 'Expected overview markdown recommended actions section');
  assert(overviewMarkdown.includes('First handoffs'), 'Expected first-handoff column in generated overview markdown');
  assert(overviewMarkdown.includes('| etf | active |'), 'Expected populated ETF row in generated overview markdown');
  assert(overviewMarkdown.includes('| acceptance-closure | demo_like | 0 | warning |'), 'Expected populated acceptance row in generated overview markdown');
  assert(overviewMarkdown.includes('1 reconciled fill(s) were detected after the live window and still need notification backfill review.') || overviewMarkdown.includes('trade row(s) are marked failed and need operator review.'), 'Expected generated ETF row to retain truthful current recommendation');
  assert(portfolioIndexJson.schemaVersion === '1.1', 'Expected portfolio index schema version');
  assert(pendingActionsJson.schemaVersion === '1.1', 'Expected pending-actions schema version');
  assert(typeof pendingActionsJson.generatedAt === 'string' && pendingActionsJson.generatedAt.length > 0, 'Expected pending-actions generatedAt timestamp');
  assert(typeof pendingActionsJson.itemCount === 'number' && pendingActionsJson.itemCount === pendingActionsJson.items.length, 'Expected pending-actions itemCount metadata');
  assert(Array.isArray(pendingActionsJson.items), 'Expected pending-actions items array');
  assert(pendingActionsJson.queueSummary && typeof pendingActionsJson.queueSummary === 'object', 'Expected pending-actions queue summary object');
  assert(typeof portfolioIndexJson.generatedAt === 'string' && portfolioIndexJson.generatedAt.length > 0, 'Expected portfolio index generatedAt timestamp');
  assert(typeof portfolioIndexJson.portfolioCount === 'number' && portfolioIndexJson.portfolioCount === portfolioIndexJson.portfolios.length, 'Expected portfolio index count metadata');
  assert(Array.isArray(portfolioIndexJson.portfolios), 'Expected portfolio index portfolios array');
  assert(portfolioIndexJson.portfolios.every((item) => Object.prototype.hasOwnProperty.call(item, 'openRunnerQueue')), 'Expected openRunnerQueue in portfolio index rows');
  assert(portfolioIndexJson.portfolios.every((item) => Object.prototype.hasOwnProperty.call(item, 'openRunnerRetry')), 'Expected openRunnerRetry in portfolio index rows');
  const generatedEtfIndexRow = portfolioIndexJson.portfolios.find((item) => item.portfolio === 'etf');
  const generatedAcceptanceIndexRow = portfolioIndexJson.portfolios.find((item) => item.portfolio === 'acceptance-closure');
  assert(generatedEtfIndexRow && generatedEtfIndexRow.status === 'warning', 'Expected ETF row in generated portfolio index');
  assert(generatedAcceptanceIndexRow && generatedAcceptanceIndexRow.status === 'warning', 'Expected acceptance row in generated portfolio index');
  assert(typeof generatedEtfIndexRow.openRunnerQueue === 'number' && typeof generatedEtfIndexRow.openRunnerRetry === 'number', 'Expected ETF open-runner counters in generated portfolio index');
  assert(typeof generatedEtfIndexRow.blockedTradeCount === 'number', 'Expected ETF blocked-trade count in generated portfolio index');
  assert(Object.prototype.hasOwnProperty.call(generatedEtfIndexRow, 'topBrokerBlock'), 'Expected ETF topBrokerBlock field in generated portfolio index');
  assert(typeof generatedAcceptanceIndexRow.openRunnerQueue === 'number' && typeof generatedAcceptanceIndexRow.openRunnerRetry === 'number', 'Expected acceptance open-runner counters in generated portfolio index');
  assert(Object.prototype.hasOwnProperty.call(portfolioIndexJson.queueSummary || {}, 'openRunnerQueue'), 'Expected openRunnerQueue in queue summary');
  assert(Object.prototype.hasOwnProperty.call(portfolioIndexJson.queueSummary || {}, 'openRunnerRetry'), 'Expected openRunnerRetry in queue summary');
  for (const key of ['total', 'blocking', 'approvals', 'execution', 'openRunnerQueue', 'openRunnerRetry', 'recovery', 'delivery', 'data', 'warnings', 'workflow']) {
    assert(Object.prototype.hasOwnProperty.call(portfolioIndexJson.queueSummary || {}, key), `Expected ${key} in queue summary`);
    assert(typeof portfolioIndexJson.queueSummary[key] === 'number', `Expected numeric ${key} in queue summary`);
    assert(portfolioIndexJson.queueSummary[key] >= 0, `Expected non-negative ${key} in queue summary`);
  }
  for (const key of ['total', 'blocking', 'approvals', 'execution', 'openRunnerQueue', 'openRunnerRetry', 'recovery', 'delivery', 'data', 'warnings', 'workflow']) {
    assert(Object.prototype.hasOwnProperty.call(pendingActionsJson.queueSummary || {}, key), `Expected ${key} in pending-actions queue summary`);
    assert(typeof pendingActionsJson.queueSummary[key] === 'number', `Expected numeric ${key} in pending-actions queue summary`);
    assert(pendingActionsJson.queueSummary[key] >= 0, `Expected non-negative ${key} in pending-actions queue summary`);
  }
  assert(pendingActionsJson.queueSummary && typeof pendingActionsJson.queueSummary.bySeverity === 'object', 'Expected bySeverity in pending-actions queue summary');
  for (const key of ['high', 'medium', 'low']) {
    assert(Object.prototype.hasOwnProperty.call(pendingActionsJson.queueSummary.bySeverity || {}, key), `Expected ${key} in pending-actions queue summary bySeverity`);
    assert(typeof pendingActionsJson.queueSummary.bySeverity[key] === 'number', `Expected numeric ${key} in pending-actions queue summary bySeverity`);
    assert(pendingActionsJson.queueSummary.bySeverity[key] >= 0, `Expected non-negative ${key} in pending-actions queue summary bySeverity`);
  }
  assert(portfolioIndexJson.queueSummary && typeof portfolioIndexJson.queueSummary.bySeverity === 'object', 'Expected bySeverity in queue summary');
  for (const key of ['high', 'medium', 'low']) {
    assert(Object.prototype.hasOwnProperty.call(portfolioIndexJson.queueSummary.bySeverity || {}, key), `Expected ${key} in queue summary bySeverity`);
    assert(typeof portfolioIndexJson.queueSummary.bySeverity[key] === 'number', `Expected numeric ${key} in queue summary bySeverity`);
    assert(portfolioIndexJson.queueSummary.bySeverity[key] >= 0, `Expected non-negative ${key} in queue summary bySeverity`);
  }
  assert(overviewMarkdown.includes('Retries'), 'Expected retry column in generated overview markdown');
  assert(overviewMarkdown.includes('Open-runner first handoffs'), 'Expected first-handoff queue summary in generated overview markdown');
  assert(overviewMarkdown.includes('Open-runner retries'), 'Expected retry queue summary in generated overview markdown');
  assert(overviewHtml.includes('Multi-Portfolio Overview'), 'Expected overview html title');
  assert(overviewHtml.includes('Portfolio Board'), 'Expected overview html portfolio board section');
  assert(overviewHtml.includes('Operator Queue Summary'), 'Expected overview html queue summary section');
  assert(overviewHtml.includes('Cross-Portfolio Recommended Actions'), 'Expected overview html recommended actions section');
  assert(overviewHtml.includes('First handoffs'), 'Expected first-handoff column in generated overview html');
  assert(overviewHtml.includes('Retries'), 'Expected retry column in generated overview html');
  assert(overviewHtml.includes('acceptance-closure'), 'Expected populated acceptance row content in generated overview html');
  assert(overviewHtml.includes('etf'), 'Expected populated ETF row content in generated overview html');
  assert(overviewHtml.includes('Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions.') || overviewHtml.includes('Resolve the active blocker:'), 'Expected generated overview html recommendation content');
  assert(fs.existsSync(generated.dailySummaryMarkdownPath), 'Expected daily summary markdown artifact');
  assert(dailyHtml.includes('Daily Summary Page'), 'Expected daily summary html artifact');
  assert(dailyHtml.includes('Cash waiting to deploy CHF'), 'Expected daily summary cash rendering');
  assert(dailyHtml.includes('Why it matters'), 'Expected daily summary explanation rendering');

  // Phase 39: report history
  const reportHistory = buildReportHistory(path.resolve(__dirname, '..'), []);
  assert(reportHistory.schemaVersion === '1.0', 'Expected report history schema version');
  assert(typeof reportHistory.totalReports === 'number' && reportHistory.totalReports > 0, 'Expected at least one report in history');
  assert(reportHistory.portfolios.some((p) => p.portfolio === 'etf'), 'Expected etf in report history');
  const etfHistory = reportHistory.portfolios.find((p) => p.portfolio === 'etf');
  assert(etfHistory.reports.length > 0, 'Expected etf reports in history');
  assert(etfHistory.reports[0].formats.length > 0, 'Expected report formats');
  assert(etfHistory.reports[0].date.length === 8, 'Expected 8-char date on report entry');
  const historyMarkdown = renderReportHistoryMarkdown(reportHistory);
  assert(historyMarkdown.includes('# Report History'), 'Expected report history title');
  assert(historyMarkdown.includes('| Date | Period | Formats | Report |'), 'Expected report history table header');
  assert(historyMarkdown.includes('etf'), 'Expected etf in report history markdown');

  assert(fs.existsSync(generated.reportHistoryPath), 'Expected report history json artifact');
  assert(fs.existsSync(generated.reportHistoryMarkdownPath), 'Expected report history markdown artifact');
  assert(fs.existsSync(generated.reportHistoryHtmlPath), 'Expected report history html artifact');
  const reportHistoryHtml = fs.readFileSync(generated.reportHistoryHtmlPath, 'utf8');
  assert(reportHistoryHtml.includes('Report History'), 'Expected report history html title');
  assert(reportHistoryHtml.includes('<table>'), 'Expected html table in report history');

  // Phase 41: operator cockpit landing page
  assert(fs.existsSync(generated.cockpitHtmlPath), 'Expected cockpit index.html artifact');
  const cockpitHtml = fs.readFileSync(generated.cockpitHtmlPath, 'utf8');
  assert(cockpitHtml.includes('Operator Cockpit'), 'Expected cockpit title');
  assert(cockpitHtml.includes('status-grid'), 'Expected status grid in cockpit');
  assert(cockpitHtml.includes('daily-summary.html'), 'Expected daily summary nav link');
  assert(cockpitHtml.includes('approvals-queue.html'), 'Expected approvals queue nav link');
  assert(cockpitHtml.includes('report-history.html'), 'Expected report history nav link');
  assert(cockpitHtml.includes('portfolio-overview.html'), 'Expected overview nav link');
  assert(cockpitHtml.includes('summary.html'), 'Expected portfolio summary link');
  assert(cockpitHtml.includes('badge-'), 'Expected health badge in cockpit');
  assert(cockpitHtml.includes('delivery-status.html'), 'Expected delivery status nav link in cockpit');

  // Phase 42: delivery & alerting status
  const deliveryOverview = buildDeliveryOverview(path.resolve(__dirname, '..'));
  assert(deliveryOverview.schemaVersion === '1.0', 'Expected delivery overview schema version');
  assert(typeof deliveryOverview.portfolioCount === 'number' && deliveryOverview.portfolioCount > 0, 'Expected at least one portfolio in delivery overview');
  assert(deliveryOverview.portfolios.some((p) => p.portfolio === 'etf'), 'Expected etf in delivery overview');
  const etfDelivery = deliveryOverview.portfolios.find((p) => p.portfolio === 'etf');
  assert(typeof etfDelivery.deliveryMode === 'string', 'Expected delivery mode');
  assert(Array.isArray(etfDelivery.intendedChannels), 'Expected intended channels array');
  assert(typeof etfDelivery.ready === 'boolean', 'Expected ready boolean');
  const deliveryMd = renderDeliveryStatusMarkdown(deliveryOverview);
  assert(deliveryMd.includes('# Delivery & Alerting Status'), 'Expected delivery status title');
  assert(deliveryMd.includes('etf'), 'Expected etf in delivery markdown');
  assert(deliveryMd.includes('Delivery mode:'), 'Expected delivery mode line');

  assert(fs.existsSync(generated.deliveryStatusPath), 'Expected delivery status json artifact');
  assert(fs.existsSync(generated.deliveryStatusMarkdownPath), 'Expected delivery status markdown artifact');
  assert(fs.existsSync(generated.deliveryStatusHtmlPath), 'Expected delivery status html artifact');
  const deliveryHtml = fs.readFileSync(generated.deliveryStatusHtmlPath, 'utf8');
  assert(deliveryHtml.includes('Delivery'), 'Expected delivery html title');
  assert(deliveryHtml.includes('local_only') || deliveryHtml.includes('Delivery mode'), 'Expected delivery mode in html');

  const generatedFixtureRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'generated-overview-broker-block-'));
  seedGeneratedArtifactBrokerBlockRepo(generatedFixtureRepo);
  const generatedFixture = await generateOverviewArtifacts({ repoRoot: generatedFixtureRepo, writeFiles: true });
  const generatedDeliveryJson = JSON.parse(fs.readFileSync(generatedFixture.deliveryStatusPath, 'utf8'));
  const generatedDeliveryMd = fs.readFileSync(generatedFixture.deliveryStatusMarkdownPath, 'utf8');
  const generatedDeliveryHtml = fs.readFileSync(generatedFixture.deliveryStatusHtmlPath, 'utf8');
  const generatedCockpitHtml = fs.readFileSync(generatedFixture.cockpitHtmlPath, 'utf8');
  const generatedDemoDelivery = generatedDeliveryJson.portfolios.find((p) => p.portfolio === 'demo');
  assert(generatedDemoDelivery, 'Expected demo portfolio in generated delivery json');
  assert(generatedDemoDelivery.deliveryPosture && generatedDemoDelivery.deliveryPosture.brokerBlockContext, 'Expected brokerBlockContext in generated delivery json');
  assert(generatedDemoDelivery.deliveryPosture.brokerBlockContext.blockedTradeCount === 1, 'Expected blocked trade count in generated delivery json');
  assert(generatedDemoDelivery.deliveryPosture.brokerBlockContext.topBrokerBlock, 'Expected top broker block in generated delivery json');
  assert(generatedDemoDelivery.deliveryPosture.brokerBlockContext.topBrokerBlock.blockCode === 'exchange_closed_at_submit', 'Expected broker block code in generated delivery json');
  assert(/exchange was closed at submission time/i.test(generatedDemoDelivery.deliveryPosture.brokerBlockContext.topBrokerBlock.blockReason), 'Expected broker block reason in generated delivery json');
  assert(/market-open runner/i.test(generatedDemoDelivery.deliveryPosture.brokerBlockContext.topBrokerBlock.nextAction), 'Expected broker block next action in generated delivery json');
  assert(generatedDeliveryMd.includes('Broker block context:'), 'Expected broker block context section in generated delivery markdown');
  assert(generatedDeliveryMd.includes('Reason: Broker rejected the order because the target exchange was closed at submission time.'), 'Expected broker block reason in generated delivery markdown');
  assert(generatedDeliveryMd.includes('Next action: Retry during the venue trading session or hand the row back to the market-open runner.'), 'Expected broker block next action in generated delivery markdown');
  assert(generatedDeliveryHtml.includes('Broker block context:'), 'Expected broker block context section in generated delivery html');
  assert(generatedDeliveryHtml.includes('<h3>demo</h3>'), 'Expected demo portfolio section in generated delivery html');
  assert(generatedCockpitHtml.includes('Delivery Broker Blocks'), 'Expected delivery broker block section in generated cockpit html');
  assert(generatedCockpitHtml.includes('<strong>demo</strong>: [exchange_closed_at_submit] IE000XZSV718 — SPYL'), 'Expected broker block summary row in generated cockpit html');
  assert(generatedCockpitHtml.includes('Reason: Broker rejected the order because the target exchange was closed at submission time.'), 'Expected broker block reason in generated cockpit html');
  assert(generatedCockpitHtml.includes('Next action: Retry during the venue trading session or hand the row back to the market-open runner.'), 'Expected broker block next action in generated cockpit html');

  console.log(JSON.stringify({ ok: true }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
