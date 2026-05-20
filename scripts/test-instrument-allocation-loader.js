const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const mod = require('../src/analysis/instrumentProposalEngine');
const src = fs.readFileSync(path.join(__dirname, '../src/analysis/instrumentProposalEngine.js'), 'utf8');
assert.ok(src.includes('allocationByInstrument.get(instrument.tickerOrIsin) || 0'));
assert.ok(src.includes('instrumentByConid'));
console.log(JSON.stringify({ ok: true, checks: ['allocationByInstrument hook present', 'conid matcher present'] }, null, 2));
