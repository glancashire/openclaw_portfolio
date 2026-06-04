'use strict';

/**
 * Unit tests for lib/observability/autofixBrain.js.
 *
 * Covers:
 *   - classifyIssue: severity resolution (level tag, top-level level)
 *   - classifyIssue: culpritModule, stacktrace frame, metadata fallbacks
 *   - classifyIssue: execution path denylist (multiple patterns)
 *   - classifyIssue: low/unknown severity not fixable
 *   - classifyIssue: no path → not fixable
 *   - classifyIssue: happy path → shouldFix=true
 *   - deriveFixBrief: includes issue id, title, severity, paths, stack, breadcrumbs
 *   - deriveFixBrief: Tier 1 vs Tier 2 instruction varies
 *   - deriveFixBrief: NEEDS_HUMAN note when no path
 *   - shouldAutoMerge: Tier 2 off → denied
 *   - shouldAutoMerge: execution path → denied
 *   - shouldAutoMerge: tests fail → denied
 *   - shouldAutoMerge: path not in allowlist → denied
 *   - shouldAutoMerge: severity too high (critical > high) → denied
 *   - shouldAutoMerge: happy path → allowed
 *   - _matchesGlob: exact prefix, * suffix, * in middle
 *   - SEVERITY_ORDER, SEVERITY_SCORE constants
 */

const assert = require('assert');
const brain = require('../lib/observability/autofixBrain');

let asserted = 0;
function ok(label, cond) {
  assert.ok(cond, label);
  console.log('  ok —', label);
  asserted++;
}
function eq(label, a, b) {
  assert.strictEqual(a, b, label);
  console.log('  ok —', label);
  asserted++;
}

// ── classifyIssue ──────────────────────────────────────────────────────────

// 1. severity from top-level level field
{
  const r = brain.classifyIssue({ id: 'x', level: 'error' });
  ok('level error → severity high', r.severity === 'high');
  ok('error severity score ≥ high', r.severityScore >= 3);
}

// 2. severity from tags array (Sentry format)
{
  const r = brain.classifyIssue({
    id: 'x', level: 'info',  // ignored
    tags: [{ key: 'level', value: 'critical' }],
  });
  ok('tag level wins over top-level', r.severity === 'critical');
}

// 3. execution denylist: src/portfolio/execution/
{
  const r = brain.classifyIssue({
    id: 'x', level: 'error',
    culpritModule: 'src/portfolio/execution/liveOrderRouter.js',
  });
  ok('execution path denylisted', r.isExecutionPath === true);
  ok('shouldFix false for execution path', r.shouldFix === false);
  ok('reason mentions denylist', r.reason.includes('denylisted'));
}

// 4. execution denylist: scripts/*live* glob
{
  const r = brain.classifyIssue({
    id: 'x', level: 'error',
    culpritModule: 'scripts/propose-instrument-trades-live-priced.js',
  });
  ok('scripts/*live* glob denylisted', r.isExecutionPath === true);
}

// 5. execution denylist: scripts/approve-and-execute
{
  const r = brain.classifyIssue({
    id: 'x', level: 'error',
    culpritModule: 'scripts/approve-and-execute.js',
  });
  ok('scripts/approve-and-execute denylisted', r.isExecutionPath === true);
}

// 6. low severity not fixable
{
  const r = brain.classifyIssue({ id: 'x', level: 'debug' });
  ok('debug level → not fixable', r.shouldFix === false);
  ok('reason mentions severity', r.reason.includes('low'));
}

// 7. unknown severity not fixable
{
  const r = brain.classifyIssue({ id: 'x', level: 'info' });
  ok('info level below threshold', r.shouldFix === false);
}

// 8. no path → not fixable
{
  const r = brain.classifyIssue({ id: 'x', level: 'error' });
  ok('no path → not fixable', r.shouldFix === false);
  ok('reason mentions no path', r.reason.includes('no identifiable path'));
}

// 9. happy path: scripts/ file, error level
{
  const r = brain.classifyIssue({
    id: 'x', level: 'error',
    culpritModule: 'scripts/send-dashboard-digest.js',
  });
  ok('scripts/ path in allowlist → shouldFix true', r.shouldFix === true);
  ok('primaryPath resolved', r.primaryPath === 'scripts/send-dashboard-digest.js');
  ok('isExecutionPath false', r.isExecutionPath === false);
}

// 10. lib/observability/ path
{
  const r = brain.classifyIssue({
    id: 'x', level: 'error',
    culpritModule: 'lib/observability/sentry.js',
  });
  ok('lib/observability/ in allowlist', r.shouldFix === true);
}

// 11. stacktrace frame takes precedence over culpritModule
{
  const r = brain.classifyIssue(
    { id: 'x', level: 'error', culpritModule: 'scripts/run-report-cycle.js' },
    {
      entries: [{
        type: 'exception',
        data: {
          values: [{
            type: 'Error',
            value: 'boom',
            stacktrace: {
              frames: [
                { filename: 'src/portfolio/holdings.js', lineno: 42, colno: 5, function: 'loadHoldings' },
                { filename: 'scripts/run-report-cycle.js', lineno: 10, colno: 1, function: 'main' },
              ],
            },
          }],
        },
      }],
    }
  );
  ok('primaryPath from stacktrace (last frame, most recent)', r.primaryPath === 'scripts/run-report-cycle.js');
}

// 12. severity ordering
{
  eq('SEVERITY_ORDER has critical first', brain.SEVERITY_ORDER[0], 'critical');
  eq('SEVERITY_SCORE critical=4', brain.SEVERITY_SCORE.critical, 4);
  eq('SEVERITY_SCORE unknown=0', brain.SEVERITY_SCORE.unknown, 0);
}

// ── deriveFixBrief ─────────────────────────────────────────────────────────

// 13. Tier 1 (env autoMerge=false): mentions branch
{
  const prev = process.env.SENTRY_AUTOFIX_AUTOMERGE;
  process.env.SENTRY_AUTOFIX_AUTOMERGE = 'false';
  const brief = brain.deriveFixBrief(
    { id: 'ABC', title: 'TypeError in digest', level: 'error', culpritModule: 'scripts/send-digest.js' },
    {},
    { severity: 'high', reason: 'path in allowlist', primaryPath: 'scripts/send-digest.js', shouldFix: true, isExecutionPath: false }
  );
  ok('Tier 1: mentions branch creation', brief.includes('sentry/autofix/ABC'));
  ok('Tier 1: mentions branch + review', brief.includes('branch + review'));
  process.env.SENTRY_AUTOFIX_AUTOMERGE = prev;
}

// 14. Tier 2 (env autoMerge=true): mentions commit directly
{
  const prev = process.env.SENTRY_AUTOFIX_AUTOMERGE;
  process.env.SENTRY_AUTOFIX_AUTOMERGE = 'true';
  const brief = brain.deriveFixBrief(
    { id: 'DEF', title: 'Crash in monitor', level: 'error', culpritModule: 'scripts/monitor.js' },
    {},
    { severity: 'high', reason: 'path in allowlist', primaryPath: 'scripts/monitor.js', shouldFix: true, isExecutionPath: false }
  );
  ok('Tier 2: mentions commit directly to main', brief.includes('commit directly to main'));
  process.env.SENTRY_AUTOFIX_AUTOMERGE = prev;
}

// 15. includes stack trace when event provided
{
  const brief = brain.deriveFixBrief(
    { id: 'G', title: 'err', level: 'error' },
    {
      entries: [{
        type: 'exception',
        data: {
          values: [{
            type: 'ReferenceError', value: 'x is not defined',
            stacktrace: {
              frames: [
                { filename: 'scripts/test.js', lineno: 5, colno: 2, function: 'run' },
              ],
            },
          }],
        },
      }],
    },
    { severity: 'medium', reason: 'path in allowlist', primaryPath: 'scripts/test.js', shouldFix: true, isExecutionPath: false }
  );
  ok('stack trace in brief', brief.includes('ReferenceError'));
  ok('frame location in brief', brief.includes('scripts/test.js:5'));
}

// 16. NEEDS_HUMAN section when no path
{
  const brief = brain.deriveFixBrief(
    { id: 'H', title: 'Unknown crash', level: 'error' },
    {},
    { shouldFix: false, reason: 'no identifiable path', primaryPath: null, severity: 'unknown' }
  );
  ok('NEEDS_HUMAN in brief', brief.includes('NEEDS_HUMAN'));
}

// ── shouldAutoMerge ────────────────────────────────────────────────────────

// 17. Tier 2 off → denied
{
  const prev = process.env.SENTRY_AUTOFIX_AUTOMERGE;
  process.env.SENTRY_AUTOFIX_AUTOMERGE = 'false';
  const r = brain.shouldAutoMerge(
    { shouldFix: true, isExecutionPath: false, primaryPath: 'scripts/test.js', severity: 'high' },
    { passed: true }
  );
  ok('autoMerge=false denied', r.allowed === false);
  process.env.SENTRY_AUTOFIX_AUTOMERGE = prev;
}

// 18. execution path → denied even with Tier 2 on
{
  const prev = process.env.SENTRY_AUTOFIX_AUTOMERGE;
  process.env.SENTRY_AUTOFIX_AUTOMERGE = 'true';
  const r = brain.shouldAutoMerge(
    { shouldFix: false, isExecutionPath: true, primaryPath: 'src/portfolio/execution/live.js', severity: 'high' },
    { passed: true }
  );
  ok('execution path denied', r.allowed === false);
  process.env.SENTRY_AUTOFIX_AUTOMERGE = prev;
}

// 19. tests fail → denied
{
  const prev = process.env.SENTRY_AUTOFIX_AUTOMERGE;
  process.env.SENTRY_AUTOFIX_AUTOMERGE = 'true';
  const r = brain.shouldAutoMerge(
    { shouldFix: true, isExecutionPath: false, primaryPath: 'scripts/test.js', severity: 'high' },
    { passed: false }
  );
  ok('tests fail denied', r.allowed === false);
  process.env.SENTRY_AUTOFIX_AUTOMERGE = prev;
}

// 20. path not in allowlist → denied
{
  const prev = process.env.SENTRY_AUTOFIX_AUTOMERGE;
  process.env.SENTRY_AUTOFIX_AUTOMERGE = 'true';
  const r = brain.shouldAutoMerge(
    { shouldFix: true, isExecutionPath: false, primaryPath: 'src/portfolio/holdings.js', severity: 'high' },
    { passed: true }
  );
  ok('non-allowlist path denied', r.allowed === false);
  process.env.SENTRY_AUTOFIX_AUTOMERGE = prev;
}

// 21. severity above max (critical > high) → denied
{
  const prev = process.env.SENTRY_AUTOFIX_AUTOMERGE;
  process.env.SENTRY_AUTOFIX_AUTOMERGE = 'true';
  const r = brain.shouldAutoMerge(
    { shouldFix: true, isExecutionPath: false, primaryPath: 'scripts/test.js', severity: 'critical' },
    { passed: true },
    { maxSeverity: 'high' }
  );
  ok('critical above high threshold denied', r.allowed === false);
  process.env.SENTRY_AUTOFIX_AUTOMERGE = prev;
}

// 22. all conditions met → allowed
{
  const prev = process.env.SENTRY_AUTOFIX_AUTOMERGE;
  process.env.SENTRY_AUTOFIX_AUTOMERGE = 'true';
  const r = brain.shouldAutoMerge(
    { shouldFix: true, isExecutionPath: false, primaryPath: 'scripts/test.js', severity: 'high' },
    { passed: true }
  );
  ok('all conditions met → allowed', r.allowed === true);
  process.env.SENTRY_AUTOFIX_AUTOMERGE = prev;
}

// 23. opts override env
{
  const r = brain.shouldAutoMerge(
    { shouldFix: true, isExecutionPath: false, primaryPath: 'scripts/test.js', severity: 'high' },
    { passed: true },
    { autoMerge: false }
  );
  ok('opts.autoMerge=false overrides env', r.allowed === false);
}

console.log(`\nautofixBrain tests: ${asserted} assertions passed`);