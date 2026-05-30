#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { InteractiveBrokersClient } = require('../src/brokers/interactive-brokers/client');

async function main() {
  const portfolio = process.argv[2] || 'etf';
  const outDir = path.join(process.cwd(), 'runtime', 'ibkr-accounting', portfolio);
  fs.mkdirSync(outDir, { recursive: true });

  const client = new InteractiveBrokersClient({ portfolio });
  const auth = await client.authenticate();
  if (!auth?.ok) {
    console.error(JSON.stringify({ ok: false, step: 'authenticate', auth }, null, 2));
    process.exit(2);
  }

  const accounts = await client.fetchAccounts();
  const accountId = Array.isArray(accounts)
    ? (accounts[0]?.id || accounts[0]?.accountId || accounts[0]?.account || accounts[0])
    : (accounts?.id || accounts?.accountId || accounts?.account || null);
  if (!accountId) {
    console.error(JSON.stringify({ ok: false, step: 'fetchAccounts', accounts }, null, 2));
    process.exit(3);
  }

  const positions = await client.fetchPositions(accountId);
  const ledger = await client.fetchLedger(accountId);
  let executions = null;
  if (client.skill && typeof client.skill.fetchExecutions === 'function') {
    try {
      executions = await client.skill.fetchExecutions();
    } catch (error) {
      executions = { ok: false, error: error.message };
    }
  }

  const snapshot = {
    generatedAt: new Date().toISOString(),
    portfolio,
    accountId,
    auth,
    accounts,
    positions,
    ledger,
    executions,
  };

  const latestPath = path.join(outDir, 'latest.json');
  const stampedPath = path.join(outDir, `${new Date().toISOString().replace(/[:]/g, '-').replace(/\.\d+Z$/, 'Z')}.json`);
  fs.writeFileSync(latestPath, JSON.stringify(snapshot, null, 2));
  fs.writeFileSync(stampedPath, JSON.stringify(snapshot, null, 2));

  const avgCostIndex = {};
  const rows = Array.isArray(positions) ? positions : Array.isArray(positions?.positions) ? positions.positions : [];
  for (const row of rows) {
    const avgCost = Number(row.avgCost ?? row.averageCost ?? row.avgPrice ?? NaN);
    const conid = row.conid ?? row.contractId ?? null;
    const symbol = row.contractDesc ?? row.symbol ?? row.localSymbol ?? row.ticker ?? null;
    if (Number.isFinite(avgCost) && avgCost > 0) {
      if (conid) avgCostIndex[String(conid).toUpperCase()] = avgCost;
      if (symbol) avgCostIndex[String(symbol).toUpperCase()] = avgCost;
    }
  }
  fs.writeFileSync(path.join(outDir, 'avg-cost-by-key.json'), JSON.stringify(avgCostIndex, null, 2));

  console.log(JSON.stringify({ ok: true, outDir, accountId, positionCount: rows.length, executionCount: Array.isArray(executions) ? executions.length : null }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
