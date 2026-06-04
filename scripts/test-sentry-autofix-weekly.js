'use strict';

var assert = require('assert');

var asserted = 0;
function ok(label, cond) {
  assert.ok(cond, label);
  console.log('  ok --', label);
  asserted++;
}

// ── parseArgs ─────────────────────────────────────────────────────────────────

var parseArgs = require('../scripts/sentry-autofix-weekly').parseArgs;
var r = parseArgs(['node', 'x', '--dry-run', '--limit=3', '--org=my-org']);
ok('parseArgs: --dry-run boolean', r['dry-run'] === true);
ok('parseArgs: --limit=3 string', r.limit === '3');
ok('parseArgs: --org value', r.org === 'my-org');

var r2 = parseArgs(['node', 'x', '--json', '--verbose']);
ok('parseArgs: multiple boolean flags', r2.json === true && r2.verbose === true);

// ── buildDigest ───────────────────────────────────────────────────────────────

var buildDigest = require('../scripts/sentry-autofix-weekly').buildDigest;
var d = buildDigest([], 'my-org', 'my-proj');
ok('empty digest: header', d.indexOf('Sentry Autofix Weekly Digest') !== -1);
ok('empty digest: Processed: 0', d.indexOf('Processed: 0') !== -1);
ok('empty digest: Org/Project', d.indexOf('my-org/my-proj') !== -1);
ok('empty digest: no sections', d.indexOf('---') === -1);

var results = [
  { issueId: 'ABC', shortId: 'SAB-1', title: 'TypeError in digest', status: 'fixed' },
  { issueId: 'DEF', shortId: 'SAB-2', title: 'Null ref in monitor', status: 'skipped', reason: 'execution-path denylisted' },
  { issueId: 'GHI', shortId: 'SAB-3', title: 'Crash on startup', status: 'error', error: 'timeout' },
];
var d2 = buildDigest(results, 'my-org', 'my-proj');
ok('mixed: Processed: 3', d2.indexOf('Processed: 3') !== -1);
ok('mixed: Fixed/Fixable: 1', d2.indexOf('Fixed/Fixable: 1') !== -1);
ok('mixed: Skipped: 1', d2.indexOf('Skipped: 1') !== -1);
ok('mixed: Errors: 1', d2.indexOf('Errors: 1') !== -1);
ok('mixed: shows fixed item id', d2.indexOf('[ABC]') !== -1);
ok('mixed: shows skipped with reason', d2.indexOf('execution-path denylisted') !== -1);
ok('mixed: shows error', d2.indexOf('timeout') !== -1);
ok('mixed: includes date', d2.indexOf('Date:') !== -1);

// ── fetchIssues fixture ────────────────────────────────────────────────────────

process.env.SENTRY_AUTH_TOKEN = 'test-token';
process.env.SENTRY_ORG_SLUG = 'my-org';
process.env.SENTRY_PROJECT_SLUG = 'my-proj';
var fetchIssues = require('../scripts/sentry-autofix-weekly').fetchIssues;
var fixture = [
  { id: '100', shortId: 'SAB-1', title: 'Error in reportGenerator', level: 'error', culprit: 'scripts/run-report-cycle.js', tags: [], lastSeen: '2026-06-01T10:00:00Z', count: '5' },
  { id: '200', shortId: 'SAB-2', title: 'Warning in monitor', level: 'warning', culprit: 'scripts/monitor-fills.js', tags: [], lastSeen: '2026-02T09:00:00Z', count: '2' },
];
var fetchImpl = function() {
  return Promise.resolve({
    ok: true, status: 200,
    json: async function() { return fixture; },
    text: function() { return JSON.stringify(fixture); },
    headers: { get: function() { return null; } },
  });
};
fetchIssues('my-org', 'my-proj', 5, fetchImpl).then(function(issues) {
  ok('fetchIssues: count', issues.length === 2);
  ok('fetchIssues: id', issues[0].id === '100');
  ok('fetchIssues: shortId', issues[0].shortId === 'SAB-1');
  ok('fetchIssues: culpritModule', issues[0].culpritModule === 'scripts/run-report-cycle.js');
  ok('fetchIssues: level normalized', issues[1].level === 'warning');
  console.log('\nsentry-autofix-weekly tests: ' + asserted + ' assertions passed');
  delete process.env.SENTRY_AUTH_TOKEN;
  delete process.env.SENTRY_ORG_SLUG;
  delete process.env.SENTRY_PROJECT_SLUG;
}).catch(function(err) {
  console.error('TEST FAILURE:', err);
  process.exit(1);
});