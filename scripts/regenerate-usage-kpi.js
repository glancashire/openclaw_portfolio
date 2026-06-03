#!/usr/bin/env node
'use strict';

/**
 * Regenerate the usage-kpi artifact triplet (JSON, MD, HTML).
 *
 * Usage:
 *   node scripts/regenerate-usage-kpi.js
 *
 * Prereq: runtime/overview/usage-counters.json must exist
 *   (run scripts/regenerate-usage-counters.js first).
 */

const path = require('path');
const { generateUsageKpiArtifacts } = require('../src/reporting/usageKpiArtifact');

const repoRoot = path.resolve(__dirname, '..');
const result = generateUsageKpiArtifacts(repoRoot);
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
