'use strict';

/* Test consumeApprovalIntent: ensure approval-intent file is deleted
 * cleanly after a transmit attempt, and behaves correctly when the
 * file is missing or already removed. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const { writeApprovalIntent, consumeApprovalIntent, _intentPath } = require('../src/execution/approvalGate');

function makeTmpRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'approval-intent-test-'));
  fs.mkdirSync(path.join(dir, 'runtime', 'approval-intent'), { recursive: true });
  return dir;
}

test('consumeApprovalIntent deletes the file when it exists', () => {
  const root = makeTmpRoot();
  const approvalId = 'test-approval-' + Date.now();
  const written = writeApprovalIntent({
    rootDir: root,
    approvalId,
    scope: 'basket-execute',
    safeWord: 'sw',
    pin: '1234',
  });
  assert.equal(fs.existsSync(written), true);

  const result = consumeApprovalIntent({ approvalId, rootDir: root });
  assert.equal(result.deleted, true);
  assert.equal(result.path, written);
  assert.equal(fs.existsSync(written), false);
});

test('consumeApprovalIntent returns deleted=false when file missing', () => {
  const root = makeTmpRoot();
  const approvalId = 'no-such-approval';
  const expectedPath = _intentPath(root, approvalId);
  assert.equal(fs.existsSync(expectedPath), false);

  const result = consumeApprovalIntent({ approvalId, rootDir: root });
  assert.equal(result.deleted, false);
  assert.equal(result.reason, 'not_found');
  assert.equal(result.path, expectedPath);
});

test('consumeApprovalIntent throws on missing approvalId', () => {
  assert.throws(() => consumeApprovalIntent({ rootDir: '/tmp' }), /approvalId required/);
});

test('consumeApprovalIntent throws on missing rootDir', () => {
  assert.throws(() => consumeApprovalIntent({ approvalId: 'x' }), /rootDir required/);
});

test('consumeApprovalIntent is idempotent across calls (second call sees not_found)', () => {
  const root = makeTmpRoot();
  const approvalId = 'idempotent-' + Date.now();
  writeApprovalIntent({
    rootDir: root,
    approvalId,
    scope: 'basket-execute',
    safeWord: 'sw',
    pin: '1234',
  });
  const first = consumeApprovalIntent({ approvalId, rootDir: root });
  const second = consumeApprovalIntent({ approvalId, rootDir: root });
  assert.equal(first.deleted, true);
  assert.equal(second.deleted, false);
  assert.equal(second.reason, 'not_found');
});
