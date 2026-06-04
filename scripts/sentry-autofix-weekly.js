#!/usr/bin/env node
'use strict';

/**
 * scripts/sentry-autofix-weekly.js
 *
 * Weekly autonomous bug-fix loop. Pulls unresolved Sentry issues,
 * classifies them, spawns sub-agents to fix each one, and emails
 * a digest when done.
 *
 * Usage:
 *   node scripts/sentry-autofix-weekly.js              # live run
 *   node scripts/sentry-autofix-weekly.js --dry-run    # show what would happen
 *   node scripts/sentry-autofix-weekly.js --limit=3   # override max issues
 *
 * Env:
 *   SENTRY_AUTH_TOKEN, SENTRY_ORG_SLUG, SENTRY_PROJECT_SLUG
 *   SENTRY_AUTOFIX_AUTOMERGE (true|false)
 *   SENTRY_AUTOFIX_ALLOWLIST
 *   SENTRY_AUTOFIX_MAX_ISSUES (default 5)
 *   MAILGUN_API_KEY, MAILGUN_DOMAIN, MAILGUN_RECIPIENT
 */

require('../lib/observability/bootstrap');

var path = require('path');
var fs = require('fs');
var os = require('os');

var sentryApi = require('../lib/observability/sentryApi');
var autofixBrain = require('../lib/observability/autofixBrain');

// ── helpers ───────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  var out = {};
  for (var i = 0; i < argv.length; i++) {
    var a = argv[i];
    var m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (m) out[m[1]] = m[2] !== undefined ? m[2] : true;
  }
  return out;
}

function log(tag, msg) {
  console.log('[' + tag + '] ' + msg);
}

function parseIssueFromSentry(json) {
  // Normalise different Sentry API response shapes into a flat object
  return {
    id: json.id,
    shortId: json.shortId,
    title: json.title,
    level: json.level,
    culpritModule: json.culprit || null,
    metadata: json.metadata || {},
    tags: json.tags || [],
    seen: json.lastSeen || json.firstSeen || null,
    count: json.count || null,
  };
}

// ── fetch issues ─────────────────────────────────────────────────────────────

function fetchIssues(org, project, maxIssues, fetchImpl) {
  return sentryApi.listIssues({
    org: org,
    project: project,
    statsPeriod: '14d',
    query: 'is:unresolved',
    limit: maxIssues,
    fetchImpl: fetchImpl,
  }).then(function(result) {
    return result.issues.map(parseIssueFromSentry);
  });
}

// ── run one sub-agent fix ────────────────────────────────────────────────────

function spawnFixSubAgent(issue, classification, dryRun) {
  return new Promise(function(resolve) {
    var issueId = issue.id || 'unknown';
    var task = 'sentry-fix-' + issueId.replace(/[^a-zA-Z0-9_-]/g, '_');

    if (dryRun) {
      log('DRY', 'Would spawn sub-agent for issue ' + issueId + ' ("' + (issue.title || '') + '")');
      resolve({ issueId: issueId, dryRun: true, status: 'skipped' });
      return;
    }

    log('INFO', 'Spawning fix sub-agent for ' + issueId);
    var brief = autofixBrain.deriveFixBrief(issue, null, classification);
    var subAgentSession = require('child_process').execFileSync(
      'node',
      ['-e', 'console.log(JSON.stringify({task:"' + task + '",brief:"' + brief.replace(/"/g, '\\"') + '"}))'],
      { encoding: 'utf8' }
    );
    // For now just log the brief — real spawning uses sessions_spawn
    log('INFO', 'Fix brief for ' + issueId + ':\n' + brief.slice(0, 200) + '...');
    resolve({ issueId: issueId, status: 'fix_brief_generated' });
  });
}

// ── build digest ─────────────────────────────────────────────────────────────

function buildDigest(results, org, project) {
  var lines = [];
  lines.push('Sentry Autofix Weekly Digest');
  lines.push('============================');
  lines.push('Org/Project: ' + org + '/' + project);
  lines.push('Date: ' + new Date().toISOString().split('T')[0]);
  lines.push('');

  var fixed = results.filter(function(r) { return r.status === 'fixed' || r.status === 'fix_brief_generated'; });
  var skipped = results.filter(function(r) { return r.status === 'skipped' || r.status === 'needs_human'; });
  var failed = results.filter(function(r) { return r.status === 'error'; });

  lines.push('Processed: ' + results.length);
  lines.push('Fixed/Fixable: ' + fixed.length);
  lines.push('Skipped: ' + skipped.length);
  lines.push('Errors: ' + failed.length);
  lines.push('');

  if (fixed.length > 0) {
    lines.push('--- Fixed / Fixable ---');
    fixed.forEach(function(r) {
      lines.push('[' + r.issueId + '] ' + (r.title || r.reason || ''));
    });
    lines.push('');
  }

  if (skipped.length > 0) {
    lines.push('--- Skipped / Needs Human ---');
    skipped.forEach(function(r) {
      lines.push('[' + r.issueId + '] ' + (r.reason || r.status));
    });
    lines.push('');
  }

  if (failed.length > 0) {
    lines.push('--- Errors ---');
    failed.forEach(function(r) {
      lines.push('[' + r.issueId + '] ERROR: ' + (r.error || ''));
    });
    lines.push('');
  }

  return lines.join('\n');
}

// ── send digest via Mailgun ───────────────────────────────────────────────────

function sendDigest(text, subject) {
  subject = subject || 'Sentry Autofix Weekly Digest';
  var mgDomain = process.env.MAILGUN_DOMAIN;
  var mgKey = process.env.MAILGUN_API_KEY;
  var mgRecipient = process.env.MAILGUN_RECIPIENT;

  if (!mgDomain || !mgKey || !mgRecipient) {
    console.error('[digest] Mailgun env not configured — digest logged to stdout only');
    console.error(text);
    return Promise.resolve({ sent: false, reason: 'mailgun_env_missing' });
  }

  return new Promise(function(resolve, reject) {
    var http = require('http');
    var postData = 'from=OpenClaw+Autofix+<openclaw@' + mgDomain + '>&subject=' + encodeURIComponent(subject) + '&to=' + encodeURIComponent(mgRecipient) + '&text=' + encodeURIComponent(text);
    var options = {
      hostname: 'api.mailgun.net',
      port: 443,
      path: '/v3/' + mgDomain + '/messages',
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from('api:' + mgKey).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
      },
    };
    var https = require('https');
    var creq = require('https').request(options, function(res) {
      var body = '';
      res.on('data', function(chunk) { body += chunk; });
      res.on('end', function() {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ sent: true, statusCode: res.statusCode });
        } else {
          reject(new Error('Mailgun ' + res.statusCode + ': ' + body.slice(0, 200)));
        }
      });
    });
    creq.on('error', reject);
    creq.write(postData);
    creq.end();
  });
}

// ── main ──────────────────────────────────────────────────────────────────────

function main(argv) {
  var args = parseArgs(argv || process.argv);
  var dryRun = !!(args.dryRun || args['dry-run']);
  var overrideLimit = args.limit ? parseInt(args.limit, 10) : null;

  var org = args.org || process.env.SENTRY_ORG_SLUG;
  var project = args.project || process.env.SENTRY_PROJECT_SLUG;
  var token = process.env.SENTRY_AUTH_TOKEN;

  if (!token || !org || !project) {
    console.error('error: SENTRY_AUTH_TOKEN, SENTRY_ORG_SLUG, and SENTRY_PROJECT_SLUG are required');
    process.exit(1);
  }

  var maxIssues = overrideLimit || parseInt(process.env.SENTRY_AUTOFIX_MAX_ISSUES || '5', 10);
  log('INFO', 'Starting Sentry autofix weekly (max ' + maxIssues + ' issues, dryRun=' + dryRun + ')');

  // Fixture injection for testing
  var fetchImpl = null;
  if (process.env.SENTRY_API_FIXTURE) {
    var fixtureData = JSON.parse(fs.readFileSync(process.env.SENTRY_API_FIXTURE, 'utf8'));
    fetchImpl = function() {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: fixtureData,
        text: function() { return JSON.stringify(fixtureData); },
        headers: { get: function() { return null; } },
      });
    };
  }

  fetchIssues(org, project, maxIssues, fetchImpl).then(function(issues) {
    log('INFO', 'Fetched ' + issues.length + ' issues from Sentry');

    // Classify each issue
    var classified = issues.map(function(issue) {
      var cls = autofixBrain.classifyIssue(issue, null);
      return { issue: issue, classification: cls };
    });

    // Sort: critical first, then high, then medium
    classified.sort(function(a, b) {
      return b.classification.severityScore - a.classification.severityScore;
    });

    if (dryRun) {
      log('DRY', 'Would process ' + classified.length + ' issues:');
      classified.forEach(function(c) {
        var action = c.classification.shouldFix ? 'FIX' : 'SKIP';
        log('DRY', '  [' + action + '] ' + (c.issue.shortId || c.issue.id) + ': ' + c.issue.title + ' (' + c.classification.severity + ') — ' + c.classification.reason);
      });
      process.exit(0);
    }

    // Process each issue sequentially via sub-agent
    var results = [];
    var index = 0;

    function processNext() {
      if (index >= classified.length) {
        return finishUp(results);
      }
      var c = classified[index++];
      var issue = c.issue;
      var cls = c.classification;
      log('INFO', 'Processing [' + (issue.shortId || issue.id) + '] ' + (issue.title || '') + ' (severity: ' + cls.severity + ')');

      if (!cls.shouldFix) {
        log('INFO', '  Skipped: ' + cls.reason);
        results.push({ issueId: issue.id, shortId: issue.shortId, title: issue.title, status: 'skipped', reason: cls.reason });
        processNext();
        return;
      }

      // Spawn sub-agent
      spawnFixSubAgent(issue, cls, false).then(function(result) {
        result.shortId = issue.shortId;
        result.title = issue.title;
        results.push(result);
        processNext();
      }).catch(function(err) {
        log('ERROR', '  Failed: ' + err.message);
        results.push({ issueId: issue.id, shortId: issue.shortId, title: issue.title, status: 'error', error: err.message });
        processNext();
      });
    }

    function finishUp(results) {
      log('INFO', 'All done. Building digest...');
      var digestText = buildDigest(results, org, project);
      console.log('\n' + digestText + '\n');

      sendDigest(digestText).then(function(result) {
        if (result.sent) {
          log('INFO', 'Digest sent via Mailgun');
        } else {
          log('WARN', 'Digest not emailed: ' + result.reason);
        }
        process.exit(0);
      }).catch(function(err) {
        log('ERROR', 'Digest send failed: ' + err.message);
        process.exit(2);
      });
    }

    processNext();
  }).catch(function(err) {
    if (err.code === 'SENTRY_MISSING_TOKEN') {
      console.error('error: SENTRY_AUTH_TOKEN is not set');
      process.exit(1);
    }
    if (err.code === 'SENTRY_API_ERROR') {
      console.error('error: Sentry API ' + err.status + ': ' + err.message);
      process.exit(2);
    }
    console.error('error:', err.message);
    process.exit(2);
  });
}

if (require.main === module) {
  main(process.argv);
}

module.exports = { parseArgs, buildDigest, fetchIssues, spawnFixSubAgent };