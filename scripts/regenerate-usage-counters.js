#!/usr/bin/env node
'use strict';

/**
 * Regenerate usage counters from current evidence on disk.
 *
 * Usage:
 *   node scripts/regenerate-usage-counters.js
 *
 * Writes: runtime/overview/usage-counters.json
 */

const path = require('path');
const { buildSnapshot, writeSnapshot } = require('../src/reporting/usageCounters');

const repoRoot = path.resolve(__dirname, '..');
const snapshot = buildSnapshot(repoRoot);
writeSnapshot(snapshot);
console.log(JSON.stringify({ ok: true, generatedAt: snapshot.generatedAt, counters: Object.keys(snapshot.counters) }, null, 2));
