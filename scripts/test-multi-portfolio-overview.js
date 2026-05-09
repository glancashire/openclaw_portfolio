const fs = require('fs');
const path = require('path');
const { classifyPortfolioKind, formatDriftSummary, summarizeOverview, formatOverviewMarkdown, generateOverviewBoard, formatRecommendedActionLabel, buildRecommendedActionRows, formatQueueSummary, buildPortfolioTable } = require('../src/reporting/overviewBoard');
const { buildApprovalsQueue, buildDailySummary, buildReportHistory, buildDeliveryOverview, renderApprovalsQueueMarkdown, renderDailySummaryMarkdown, renderReportHistoryMarkdown, renderDeliveryStatusMarkdown, renderCockpitPage, generateOverviewArtifacts } = require('../src/reporting/summaryArtifacts');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  assert(typeof classifyPortfolioKind === 'function', 'Expected classifyPortfolioKind export');
  assert(typeof formatDriftSummary === 'function', 'Expected formatDriftSummary export');
  assert(typeof summarizeOverview === 'function', 'Expected summarizeOverview export');
  assert(typeof formatRecommendedActionLabel === 'function', 'Expected formatRecommendedActionLabel export');
  assert(typeof buildRecommendedActionRows === 'function', 'Expected buildRecommendedActionRows export');
  assert(typeof buildPortfolioTable === 'function', 'Expected buildPortfolioTable export');
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
  assert(boardTable.includes('| etf | active | 5000 | warning | 1 out_of_bounds | 0 | 7 | 2 | 1 | 0 | Restore broker connectivity. |'), 'Expected populated ETF board helper row');
  assert(boardTable.includes('| acceptance-closure | demo_like | 0 | warning | 1 out_of_bounds | 5 | 0 | 6 | 0 | 2 | Resolve blockers. |'), 'Expected populated acceptance board helper row');

  const markdown = formatOverviewMarkdown({ index, pending });
  assert(markdown.includes('# Multi-Portfolio Overview'), 'Expected title');
  assert(markdown.includes('| etf | active | 5000 | warning | 1 out_of_bounds | 0 | 7 | 2 | 1 | 0 | Restore broker connectivity. |'), 'Expected ETF board row');
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
  assert(dailyMarkdown.includes('# Daily Summary Page'), 'Expected daily summary title');
  assert(dailyMarkdown.includes('Cash waiting to deploy CHF: 5000'), 'Expected daily cash line');
  assert(dailyMarkdown.includes('Biggest Drift Today'), 'Expected biggest drift section');
  assert(dailyMarkdown.includes('Why it matters'), 'Expected drift explanation line');
  assert(dailyMarkdown.includes('Why now'), 'Expected highlighted portfolio explanation line');

  const generated = await generateOverviewArtifacts({ repoRoot: path.resolve(__dirname, '..'), writeFiles: true });
  await generateOverviewBoard({ repoRoot: path.resolve(__dirname, '..'), writeFiles: true });
  const approvalsHtml = fs.readFileSync(generated.approvalsQueueHtmlPath, 'utf8');
  const dailyHtml = fs.readFileSync(generated.dailySummaryHtmlPath, 'utf8');
  const overviewMarkdown = fs.readFileSync(path.join(path.resolve(__dirname, '..'), 'runtime', 'overview', 'portfolio-overview.md'), 'utf8');
  const overviewHtml = fs.readFileSync(path.join(path.resolve(__dirname, '..'), 'runtime', 'overview', 'portfolio-overview.html'), 'utf8');
  const portfolioIndexJson = JSON.parse(fs.readFileSync(path.join(path.resolve(__dirname, '..'), 'runtime', 'overview', 'portfolio-index.json'), 'utf8'));
  assert(fs.existsSync(generated.approvalsQueuePath), 'Expected approvals queue json artifact');
  assert(fs.existsSync(generated.approvalsQueueMarkdownPath), 'Expected approvals queue markdown artifact');
  assert(approvalsHtml.includes('Approvals Queue'), 'Expected approvals queue html artifact');
  assert(approvalsHtml.includes('Effect if approved'), 'Expected approvals queue consequence rendering');
  assert(fs.existsSync(generated.dailySummaryPath), 'Expected daily summary json artifact');
  assert(overviewMarkdown.includes('First handoffs'), 'Expected first-handoff column in generated overview markdown');
  assert(overviewMarkdown.includes('| etf | active | 5000 | warning |'), 'Expected populated ETF row in generated overview markdown');
  assert(overviewMarkdown.includes('| acceptance-closure | demo_like | 0 | warning |'), 'Expected populated acceptance row in generated overview markdown');
  assert(overviewMarkdown.includes('| etf | active | 5000 | warning |') && overviewMarkdown.includes('| 0 | 0 | Interactive Brokers is not ready; broker-backed pricing falls back to draft assumptions. |'), 'Expected generated ETF row to retain queue columns and recommendation');
  assert(Array.isArray(portfolioIndexJson.portfolios), 'Expected portfolio index portfolios array');
  assert(portfolioIndexJson.portfolios.every((item) => Object.prototype.hasOwnProperty.call(item, 'openRunnerQueue')), 'Expected openRunnerQueue in portfolio index rows');
  assert(portfolioIndexJson.portfolios.every((item) => Object.prototype.hasOwnProperty.call(item, 'openRunnerRetry')), 'Expected openRunnerRetry in portfolio index rows');
  assert(Object.prototype.hasOwnProperty.call(portfolioIndexJson.queueSummary || {}, 'openRunnerQueue'), 'Expected openRunnerQueue in queue summary');
  assert(Object.prototype.hasOwnProperty.call(portfolioIndexJson.queueSummary || {}, 'openRunnerRetry'), 'Expected openRunnerRetry in queue summary');
  assert(typeof portfolioIndexJson.queueSummary.openRunnerQueue === 'number', 'Expected numeric openRunnerQueue in queue summary');
  assert(typeof portfolioIndexJson.queueSummary.openRunnerRetry === 'number', 'Expected numeric openRunnerRetry in queue summary');
  assert(portfolioIndexJson.queueSummary.openRunnerQueue >= 0, 'Expected non-negative openRunnerQueue in queue summary');
  assert(portfolioIndexJson.queueSummary.openRunnerRetry >= 0, 'Expected non-negative openRunnerRetry in queue summary');
  assert(overviewMarkdown.includes('Retries'), 'Expected retry column in generated overview markdown');
  assert(overviewMarkdown.includes('Open-runner first handoffs'), 'Expected first-handoff queue summary in generated overview markdown');
  assert(overviewMarkdown.includes('Open-runner retries'), 'Expected retry queue summary in generated overview markdown');
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

  console.log(JSON.stringify({ ok: true }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
