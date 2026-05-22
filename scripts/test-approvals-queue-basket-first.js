const assert = require('assert');
const { buildApprovalsQueue, renderApprovalsQueueMarkdown } = require('../src/reporting/summaryArtifacts');

const queue = buildApprovalsQueue([
  {
    portfolio: 'etf',
    readiness: {
      approvalState: {
        basketApprovalState: {
          approvedCount: 1,
          executableCount: 1,
        },
      },
    },
    operatorQueue: {
      items: [
        { queueType: 'approval', kind: 'approval', severity: 'medium', status: 'pending_user_approval', summary: '5 proposed trade row(s) still need user approval.', recommendedOperatorAction: 'Review the proposed trades and approve or reject them explicitly.' },
      ],
    },
  },
]);

assert.strictEqual(queue.itemCount, 2);
assert.strictEqual(queue.items[0].status, 'basket_approved');
assert(/approved basket\(s\) are ready for execution/i.test(queue.items[0].summary));
assert.strictEqual(queue.items[1].status, 'pending_user_approval');
const md = renderApprovalsQueueMarkdown(queue);
assert(md.includes('Approval 1: etf'));
assert(md.includes('approved basket(s) are ready for execution'));
console.log(JSON.stringify({ ok: true }, null, 2));
