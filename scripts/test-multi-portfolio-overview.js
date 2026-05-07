const fs = require('fs');
const path = require('path');
const { classifyPortfolioKind, formatDriftSummary, summarizeOverview, formatOverviewMarkdown } = require('../src/reporting/overviewBoard');
const { buildApprovalsQueue, renderApprovalsQueueMarkdown, generateOverviewArtifacts } = require('../src/reporting/summaryArtifacts');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  assert(classifyPortfolioKind({ portfolio: 'etf' }) === 'active', 'Expected active portfolio classification');
  assert(classifyPortfolioKind({ portfolio: 'acceptance-closure' }) === 'demo_like', 'Expected demo-like classification');
  assert(formatDriftSummary([{ status: 'out_of_bounds' }, { status: 'on_track' }]) === '1 out_of_bounds', 'Expected severe drift summary');
  assert(formatDriftSummary([{ status: 'drifted' }]) === '1 drifted', 'Expected minor drift summary');
  assert(formatDriftSummary([]) === 'n/a', 'Expected n/a drift summary');

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
        recommendedNextStep: 'Resolve blockers.',
        driftStatuses: [{ assetClass: 'Global equities', status: 'out_of_bounds', driftPct: -50 }],
      },
    ],
  };
  const pending = {
    queueSummary: { total: 2, blocking: 1, approvals: 0, execution: 0, recovery: 1, delivery: 0, data: 0, warnings: 0, workflow: 1 },
    items: [
      { portfolio: 'etf', queueType: 'recovery', severity: 'high', status: 'degraded', summary: 'Broker degraded.', recommendedOperatorAction: 'Fix broker.' },
      { portfolio: 'acceptance-closure', queueType: 'workflow', severity: 'medium', status: 'pending', summary: 'Demo needs cleanup.', recommendedOperatorAction: 'Review demo.' },
    ],
  };

  const totals = summarizeOverview(index, pending);
  assert(totals.portfolioCount === 2, 'Expected portfolio count');
  assert(totals.totalValueChf === 5000, 'Expected total value');
  assert(totals.activeCount === 1, 'Expected one active portfolio');
  assert(totals.demoLikeCount === 1, 'Expected one demo-like portfolio');
  assert(totals.pendingApprovals === 7, 'Expected pending approvals total');
  assert(totals.pendingActions === 2, 'Expected pending action total');

  const markdown = formatOverviewMarkdown({ index, pending });
  assert(markdown.includes('# Multi-Portfolio Overview'), 'Expected title');
  assert(markdown.includes('| etf | active | 5000 | warning | 1 out_of_bounds | 0 | 7 | 2 | Restore broker connectivity. |'), 'Expected ETF board row');
  assert(markdown.includes('| acceptance-closure | demo_like | 0 | warning | 1 out_of_bounds | 5 | 0 | 6 | Resolve blockers. |'), 'Expected acceptance board row');
  assert(markdown.includes('## Operator Queue Summary'), 'Expected operator queue summary section');
  assert(markdown.includes('- Recovery items: 1'), 'Expected recovery count in queue summary');
  assert(markdown.includes('1. [recovery/high/degraded] etf: Broker degraded. — Fix broker.'), 'Expected recommended action row');

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

  const generated = await generateOverviewArtifacts({ repoRoot: path.resolve(__dirname, '..'), writeFiles: true });
  const approvalsHtml = fs.readFileSync(generated.approvalsQueueHtmlPath, 'utf8');
  assert(fs.existsSync(generated.approvalsQueuePath), 'Expected approvals queue json artifact');
  assert(fs.existsSync(generated.approvalsQueueMarkdownPath), 'Expected approvals queue markdown artifact');
  assert(approvalsHtml.includes('Approvals Queue'), 'Expected approvals queue html artifact');
  assert(approvalsHtml.includes('Effect if approved'), 'Expected approvals queue consequence rendering');

  console.log(JSON.stringify({ ok: true }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
