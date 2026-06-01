#!/usr/bin/env node
'use strict';

/**
 * scripts/prune-orphan-session-files.js
 *
 * The OpenClaw session store can accumulate orphan files (trajectory dumps,
 * .bak-, .deleted.-, .checkpoint., .reset.-suffixed leftovers) for sessions
 * that are no longer tracked in sessions.json. The native
 * `openclaw sessions cleanup` only prunes index entries, not these files.
 *
 * On 2026-06-01 this directory grew to 703 MB with 325 orphan files going
 * back to April. `openclaw status` took 14 seconds because it walks this
 * directory.
 *
 * This script:
 *   1. Reads sessions.json and collects every session id it references.
 *   2. Walks the sessions directory.
 *   3. Buckets each file as tracked / orphan.
 *   4. By default reports counts and bytes only (dry-run).
 *   5. With --apply, deletes orphan files older than --age-days (default 14).
 *
 * SAFETY:
 *   - Never touches sessions.json, .usage-cost-cache.json, or .lock files.
 *   - Never touches files for any session id present in sessions.json.
 *   - Never touches orphan files newer than --age-days.
 *   - --apply requires explicit flag. Default is dry-run.
 *
 * Usage:
 *   node scripts/prune-orphan-session-files.js
 *   node scripts/prune-orphan-session-files.js --apply
 *   node scripts/prune-orphan-session-files.js --apply --age-days=7
 *   node scripts/prune-orphan-session-files.js --json
 *   node scripts/prune-orphan-session-files.js --store=/path/to/sessions
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const json = args.includes('--json');
const ageDays = Number((args.find((a) => a.startsWith('--age-days=')) || '--age-days=14').split('=')[1]);
const customStore = (args.find((a) => a.startsWith('--store=')) || '').split('=')[1] || null;
const sessionsDir = customStore || path.join(os.homedir(), '.openclaw/agents/main/sessions');

if (!fs.existsSync(sessionsDir)) {
  console.error(`sessions directory not found: ${sessionsDir}`);
  process.exit(1);
}

const indexPath = path.join(sessionsDir, 'sessions.json');
if (!fs.existsSync(indexPath)) {
  console.error(`sessions.json not found at ${indexPath}`);
  process.exit(1);
}

const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

// Collect tracked session ids.
const UUID_RE = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
const trackedIds = new Set();
for (const entry of Object.values(index)) {
  if (entry?.sessionId) trackedIds.add(entry.sessionId);
  if (entry?.sessionFile) {
    const m = String(entry.sessionFile).match(UUID_RE);
    if (m) trackedIds.add(m[1].toLowerCase());
  }
}

// Walk directory.
const files = fs.readdirSync(sessionsDir);
const ageCutoffMs = Date.now() - ageDays * 86400000;

const protectedNames = new Set(['sessions.json', '.usage-cost-cache.json']);
const buckets = {
  tracked: [],
  orphanRecent: [],
  orphanEligible: [],
  protected: [],
};

let totalBytes = 0;

for (const f of files) {
  const full = path.join(sessionsDir, f);
  let stat;
  try {
    stat = fs.statSync(full);
  } catch {
    continue;
  }
  totalBytes += stat.size;

  if (protectedNames.has(f) || f.endsWith('.lock')) {
    buckets.protected.push({ f, size: stat.size });
    continue;
  }

  const m = f.match(UUID_RE);
  const id = m ? m[1].toLowerCase() : null;

  if (id && trackedIds.has(id)) {
    buckets.tracked.push({ f, size: stat.size });
    continue;
  }
  if (!id) {
    // Unknown file with no uuid — be cautious, treat as protected.
    buckets.protected.push({ f, size: stat.size });
    continue;
  }
  if (stat.mtimeMs > ageCutoffMs) {
    buckets.orphanRecent.push({ f, size: stat.size, mtimeMs: stat.mtimeMs });
  } else {
    buckets.orphanEligible.push({ f, size: stat.size, mtimeMs: stat.mtimeMs });
  }
}

const sumBytes = (arr) => arr.reduce((s, x) => s + x.size, 0);

const summary = {
  sessionsDir,
  apply,
  ageDays,
  totals: {
    files: files.length,
    bytes: totalBytes,
    bytesHuman: humanBytes(totalBytes),
  },
  trackedIds: trackedIds.size,
  buckets: {
    tracked: { count: buckets.tracked.length, bytes: sumBytes(buckets.tracked) },
    protected: { count: buckets.protected.length, bytes: sumBytes(buckets.protected) },
    orphanRecent: { count: buckets.orphanRecent.length, bytes: sumBytes(buckets.orphanRecent) },
    orphanEligible: { count: buckets.orphanEligible.length, bytes: sumBytes(buckets.orphanEligible) },
  },
  deleted: { count: 0, bytes: 0, files: [] },
};

if (apply && buckets.orphanEligible.length > 0) {
  for (const o of buckets.orphanEligible) {
    try {
      fs.unlinkSync(path.join(sessionsDir, o.f));
      summary.deleted.count += 1;
      summary.deleted.bytes += o.size;
      summary.deleted.files.push(o.f);
    } catch (e) {
      // Surface the failure but keep going.
      summary.deleted.files.push({ f: o.f, error: e.message });
    }
  }
  summary.deleted.bytesHuman = humanBytes(summary.deleted.bytes);
}

if (json) {
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
} else {
  console.log(`prune-orphan-session-files (${apply ? 'APPLY' : 'DRY-RUN'})`);
  console.log(`  store:           ${summary.sessionsDir}`);
  console.log(`  age-days:        ${summary.ageDays}`);
  console.log(`  total files:     ${summary.totals.files}`);
  console.log(`  total size:      ${summary.totals.bytesHuman}`);
  console.log(`  tracked ids:     ${summary.trackedIds}`);
  console.log(`  tracked files:   ${summary.buckets.tracked.count}  (${humanBytes(summary.buckets.tracked.bytes)})`);
  console.log(`  protected:       ${summary.buckets.protected.count}  (${humanBytes(summary.buckets.protected.bytes)})`);
  console.log(`  orphan (recent): ${summary.buckets.orphanRecent.count}  (${humanBytes(summary.buckets.orphanRecent.bytes)})  — kept`);
  console.log(`  orphan (>${summary.ageDays}d):    ${summary.buckets.orphanEligible.count}  (${humanBytes(summary.buckets.orphanEligible.bytes)})  — ${apply ? 'deleted' : 'would delete'}`);
  if (apply) {
    console.log(`  deleted:         ${summary.deleted.count}  (${summary.deleted.bytesHuman || humanBytes(summary.deleted.bytes)})`);
  } else {
    console.log(`\n  Re-run with --apply to delete the eligible files.`);
  }
}

function humanBytes(n) {
  if (!Number.isFinite(n)) return '0B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0; let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1; }
  return `${v.toFixed(1)}${units[i]}`;
}
