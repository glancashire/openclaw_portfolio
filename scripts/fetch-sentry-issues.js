#!/usr/bin/env node
'use strict';

require('../lib/observability/bootstrap');

/**
 * fetch-sentry-issues.js
 *
 * CLI that lists unresolved Sentry issues for the configured project.
 * Used both ad-hoc by Graham and by the weekly autofix cron.
 *
 * Usage:
 *   node scripts/fetch-sentry-issues.js [--status=unresolved] [--since=7d]
 *     [--limit=25] [--query="..."] [--json] [--org=...] [--project=...]
 *
 * Env:
 *   SENTRY_AUTH_TOKEN   required
 *   SENTRY_ORG_SLUG     required (or --org)
 *   SENTRY_PROJECT_SLUG required (or --project)
 *
 * Exits 0 on success, 1 on missing env, 2 on API error.
 */

const { listIssues } = require('../lib/observability/sentryApi');

function parseArgs(argv) {
  const out = {};
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (!m) continue;
    out[m[1]] = m[2] === undefined ? true : m[2];
  }
  return out;
}

function formatHuman(issues) {
  if (!issues.length) return '(no issues)\n';
  const lines = [];
  for (const it of issues) {
    const title = it.title || it.metadata?.title || '(no title)';
    const id = it.shortId || it.id;
    const count = it.count || it.events || '?';
    const last = it.lastSeen || '';
    lines.push(`- [${id}] ${title}  (events=${count}, lastSeen=${last})`);
  }
  return lines.join('\n') + '\n';
}

async function main() {
  const args = parseArgs(process.argv);
  const org = args.org || process.env.SENTRY_ORG_SLUG;
  const project = args.project || process.env.SENTRY_PROJECT_SLUG;
  const token = process.env.SENTRY_AUTH_TOKEN;

  if (!token) {
    console.error('error: SENTRY_AUTH_TOKEN is not set (see .env.example)');
    process.exit(1);
  }
  if (!org || !project) {
    console.error('error: SENTRY_ORG_SLUG and SENTRY_PROJECT_SLUG must be set (or pass --org/--project)');
    process.exit(1);
  }

  const statsPeriod = args.since || '7d';
  const limit = args.limit ? parseInt(args.limit, 10) : 25;
  const status = args.status || 'unresolved';
  const query = args.query || `is:${status}`;

  try {
    // Test-only fixture injection: SENTRY_API_FIXTURE=path to a JSON file.
    let fetchImpl;
    if (process.env.SENTRY_API_FIXTURE) {
      const fs = require('fs');
      const fixture = JSON.parse(fs.readFileSync(process.env.SENTRY_API_FIXTURE, 'utf8'));
      fetchImpl = async () => ({
        ok: true,
        status: 200,
        json: async () => fixture,
        text: async () => JSON.stringify(fixture),
        headers: { get: () => null },
      });
    }

    const { issues, nextCursor } = await listIssues({
      org, project, statsPeriod, query, limit, fetchImpl,
    });

    if (args.json) {
      process.stdout.write(JSON.stringify({ ok: true, count: issues.length, nextCursor, issues }, null, 2) + '\n');
    } else {
      process.stdout.write(`Sentry issues for ${org}/${project} (${query}, ${statsPeriod}): ${issues.length}\n`);
      process.stdout.write(formatHuman(issues));
      if (nextCursor) process.stdout.write(`(more available; pass --limit=${limit * 2} to fetch more)\n`);
    }
    process.exit(0);
  } catch (err) {
    if (err.code === 'SENTRY_API_ERROR') {
      console.error(`error: Sentry API ${err.status}: ${err.message}`);
      process.exit(2);
    }
    console.error('error:', err.message);
    process.exit(2);
  }
}

if (require.main === module) {
  main();
}

module.exports = { parseArgs, formatHuman };
