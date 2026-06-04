/**
 * lib/observability/autofixBrain.js
 *
 * Core decision-making for the Sentry autonomous fix loop.
 * No I/O, no git, no sub-agent spawning — pure functions only.
 */

'use strict';

var EXECUTION_DENYLIST = [
  'src/portfolio/execution/',
  'src/portfolio/basket-',
  'src/basket/',
  'scripts/approve-and-execute',
  'scripts/approve-portfolio-trade',
  'scripts/cancel-portfolio-order',
  'scripts/transmit-',
  'scripts/*live*',
];

var SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'unknown'];
var SEVERITY_SCORE = { critical: 4, high: 3, medium: 2, low: 1, unknown: 0 };

var LEVEL_MAP = {
  critical: 'critical',
  error: 'high',
  warning: 'medium',
  medium: 'medium',
  low: 'low',
  debug: 'low',
  info: 'low',
  log: 'low',
};

function normalizeLevel(level) {
  if (!level) return 'unknown';
  var v = String(level).toLowerCase();
  return LEVEL_MAP[v] || 'unknown';
}

function matchesGlob(path, pattern) {
  if (path === pattern) return true;
  if (pattern.indexOf('*') === -1) return path.indexOf(pattern) === 0;

  var stars = [];
  for (var i = 0; i < pattern.length; i++) {
    if (pattern.charAt(i) === '*') stars.push(i);
  }

  if (stars.length === 1) {
    var idx = stars[0];
    var prefix = pattern.substring(0, idx);
    var suffix = pattern.substring(idx + 1);
    if (suffix === '') return path.indexOf(prefix) === 0;
    if (path.indexOf(prefix) !== 0) return false;
    if (!path.endsWith(suffix)) return false;
    var ms = prefix.length;
    var me = path.length - suffix.length;
    if (me <= ms) return false;
    var middle = path.substring(ms, me);
    return middle.indexOf('/') === -1 && middle.indexOf('\\') === -1;
  }

  if (stars.length === 2) {
    var i1 = stars[0];
    var i2 = stars[1];
    var prefix = pattern.substring(0, i1);
    var middle = pattern.substring(i1 + 1, i2);
    var suffix = pattern.substring(i2 + 1);

    if (suffix === '') {
      if (path.indexOf(prefix) !== 0) return false;
      var afterPrefix = path.substring(prefix.length);
      return afterPrefix.indexOf(middle) !== -1;
    }

    if (path.indexOf(prefix) !== 0) return false;
    if (!path.endsWith(suffix)) return false;
    var ms = prefix.length;
    var me = path.length - suffix.length;
    if (me <= ms) return false;
    var pathMiddle = path.substring(ms, me);
    return pathMiddle.indexOf('/') === -1 &&
      pathMiddle.indexOf('\\') === -1 &&
      pathMiddle.indexOf(middle) !== -1;
  }

  return false;
}

function classifyIssue(issue, latestEvent) {
  issue = issue || {};
  latestEvent = latestEvent || {};

  var severity = normalizeLevel(issue.level);
  if (issue.tags && Array.isArray(issue.tags)) {
    for (var ti = 0; ti < issue.tags.length; ti++) {
      var tag = issue.tags[ti];
      if (tag && tag.key === 'level') {
        var tlevel = normalizeLevel(tag.value);
        if (tlevel !== 'unknown') severity = tlevel;
        break;
      }
    }
  }

  var primaryPath = null;

  if (
    latestEvent &&
    latestEvent.entries &&
    Array.isArray(latestEvent.entries)
  ) {
    for (var ei = 0; ei < latestEvent.entries.length; ei++) {
      var entry = latestEvent.entries[ei];
      if (entry && entry.type === 'exception' && entry.data && Array.isArray(entry.data.values)) {
        var vals = entry.data.values;
        if (vals[0] && vals[0].stacktrace && Array.isArray(vals[0].stacktrace.frames)) {
          var frames = vals[0].stacktrace.frames;
          var lastFrame = frames[frames.length - 1];
          if (lastFrame) {
            primaryPath = lastFrame.filename || lastFrame.abs_path || lastFrame.function || null;
            break;
          }
        }
      }
    }
  }

  if (!primaryPath && issue.culpritModule) primaryPath = issue.culpritModule;
  if (!primaryPath && issue.metadata && issue.metadata.filename) primaryPath = issue.metadata.filename;
  if (!primaryPath && issue.metadata && issue.metadata.function) primaryPath = issue.metadata.function;

  if (primaryPath) {
    primaryPath = primaryPath.replace(/^\/(home|app\.local)/, '').replace(/\/home\/[^\/]+/, '');
  }

  var isExecutionPath = false;
  if (primaryPath) {
    for (var di = 0; di < EXECUTION_DENYLIST.length; di++) {
      if (matchesGlob(primaryPath, EXECUTION_DENYLIST[di])) {
        isExecutionPath = true;
        break;
      }
    }
  }

  var shouldFix = false;
  var reason = '';

  if (isExecutionPath) {
    reason = 'execution-path denylisted: ' + primaryPath;
  } else if (severity === 'unknown' || severity === 'low') {
    reason = 'severity ' + severity + ' below triage threshold';
  } else if (!primaryPath) {
    reason = 'no identifiable path in stack trace';
  } else {
    shouldFix = true;
    reason = 'path in allowlist: ' + primaryPath;
  }

  return {
    severity: severity,
    severityScore: SEVERITY_SCORE[severity] || 0,
    shouldFix: shouldFix,
    reason: reason,
    primaryPath: primaryPath || null,
    isExecutionPath: isExecutionPath,
  };
}

function deriveFixBrief(issue, event, classification) {
  issue = issue || {};
  event = event || {};
  classification = classification || {};

  var issueId = issue.id || issue.shortId || 'unknown';
  var title = issue.title || (issue.metadata && issue.metadata.title) || '(no title)';
  var severity = classification.severity || 'unknown';
  var reason = classification.reason || '';
  var primaryPath = classification.primaryPath || '';

  var stackLines = [];
  if (event && event.entries && Array.isArray(event.entries)) {
    for (var ei = 0; ei < event.entries.length; ei++) {
      var entry = event.entries[ei];
      if (entry && entry.type === 'exception' && entry.data && Array.isArray(entry.data.values)) {
        var vals = entry.data.values;
        if (vals[0]) {
          if (vals[0].type && vals[0].value) {
            stackLines.push(vals[0].type + ': ' + vals[0].value);
          }
          if (vals[0].stacktrace && Array.isArray(vals[0].stacktrace.frames)) {
            var frames = vals[0].stacktrace.frames;
            for (var fi = frames.length - 1; fi >= 0; fi--) {
              var f = frames[fi];
              var loc = (f.filename || f.abs_path || '?') + ':' + (f.lineno || '?') + ':' + (f.colno || '?');
              stackLines.push('  ' + loc + '  ' + (f.function || '?'));
            }
          }
        }
        break;
      }
    }
  }

  var breadcrumbs = [];
  if (event && event.breadcrumbs && Array.isArray(event.breadcrumbs)) {
    var bstart = Math.max(0, event.breadcrumbs.length - 10);
    for (var bi = bstart; bi < event.breadcrumbs.length; bi++) {
      var b = event.breadcrumbs[bi];
      var ts = b.timestamp || '';
      var msg = b.message || b.category || '';
      breadcrumbs.push('  [' + ts + '] ' + msg);
    }
  }

  var tier2 = process.env.SENTRY_AUTOFIX_AUTOMERGE === 'true';
  var allowlist = process.env.SENTRY_AUTOFIX_ALLOWLIST || 'scripts/,lib/observability/,lib/';
  var never = 'src/portfolio/execution/, src/portfolio/basket-/, scripts/approve-*, scripts/cancel-*, scripts/transmit-*, .env, package.json deps, secrets/';

  var body = 'You are fixing Sentry issue [' + issueId + '] "' + title + '" (severity: ' + severity + ').\n\n' +
    'Issue ID: ' + issueId + '\n' +
    'Severity: ' + severity + '\n' +
    'Classification: ' + reason + '\n' +
    'Primary path: ' + (primaryPath || 'unknown') + '\n\n' +
    (stackLines.length > 0
      ? 'Stack trace (most recent first):\n' + stackLines.slice(0, 20).join('\n') + '\n\n'
      : '(no stack trace available)\n\n') +
    (breadcrumbs.length > 0
      ? 'Recent breadcrumbs:\n' + breadcrumbs.join('\n') + '\n\n'
      : '');

  body += 'Your task:\n' +
    '1. Reproduce the error locally by running the affected script or test.\n' +
    '2. Identify the root cause from the stack trace and breadcrumbs.\n' +
    '3. Write a focused patch that fixes the root cause and nothing else.\n' +
    '   - Write scope: ' + allowlist + '\n' +
    '   - NEVER write to: ' + never + '\n' +
    '4. Run the focused test lane for the affected area before committing.\n' +
    '5. For Tier 1 (default): create branch sentry/autofix/' + issueId + ', commit fix, push.\n' +
    '   For Tier 2 (auto-merge enabled): if tests pass AND primaryPath is in allowlist\n' +
    '   AND severity is high/critical, commit directly to main and push.\n' +
    '6. Document your fix in plans/sentry-fixes/' + issueId + '.md:\n' +
    '   - Root cause (one sentence)\n' +
    '   - What was changed and why\n' +
    '   - How to verify the fix\n\n' +
    'Timeout: 20 minutes.\n' +
    'Tier: ' + (tier2 ? '2 -- auto-merge enabled for allowlisted paths' : '1 -- branch + review') + '\n\n' +
    'If the issue cannot be safely fixed (ambiguous root cause, execution path,\n' +
    'requires data migration, or would touch a denylisted path), write\n' +
    'plans/sentry-fixes/' + issueId + '.md with section "NEEDS_HUMAN: true" and explain why.';

  return body;
}

function shouldAutoMerge(classification, testResult, opts) {
  opts = opts || {};
  var autoMergeEnabled = opts.autoMerge !== undefined
    ? opts.autoMerge
    : process.env.SENTRY_AUTOFIX_AUTOMERGE === 'true';

  if (!autoMergeEnabled) {
    return { allowed: false, reason: 'Tier 2 not enabled (SENTRY_AUTOFIX_AUTOMERGE != true)' };
  }
  if (!classification.shouldFix) {
    return { allowed: false, reason: 'issue not fixable: ' + classification.reason };
  }
  if (classification.isExecutionPath) {
    return { allowed: false, reason: 'execution path denylisted: ' + classification.primaryPath };
  }
  if (!testResult || !testResult.passed) {
    return { allowed: false, reason: 'tests did not pass' };
  }

  var primaryPath = classification.primaryPath || '';
  var allowlist = (opts.allowlist || process.env.SENTRY_AUTOFIX_ALLOWLIST || 'scripts/,lib/observability/,lib/')
    .split(',').map(function(s) { return s.trim(); }).filter(Boolean);

  if (!primaryPath) {
    return { allowed: false, reason: 'no primary path to check against allowlist' };
  }

  var inAllowlist = false;
  for (var ai = 0; ai < allowlist.length; ai++) {
    if (primaryPath.indexOf(allowlist[ai]) === 0) { inAllowlist = true; break; }
  }
  if (!inAllowlist) {
    return { allowed: false, reason: 'path ' + primaryPath + ' not in allowlist' };
  }

  var maxSev = opts.maxSeverity || 'high';
  var score = SEVERITY_SCORE[classification.severity] || 0;
  var maxScore = SEVERITY_SCORE[maxSev] || 0;
  if (score > maxScore) {
    return { allowed: false, reason: 'severity ' + classification.severity + ' exceeds max ' + maxSev };
  }

  return { allowed: true, reason: 'path ' + primaryPath + ' in allowlist, ' + classification.severity + ' within threshold' };
}

module.exports = {
  classifyIssue: classifyIssue,
  deriveFixBrief: deriveFixBrief,
  shouldAutoMerge: shouldAutoMerge,
  EXECUTION_DENYLIST: EXECUTION_DENYLIST,
  SEVERITY_ORDER: SEVERITY_ORDER,
  SEVERITY_SCORE: SEVERITY_SCORE,
};