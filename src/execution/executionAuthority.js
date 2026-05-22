'use strict';

const fs = require('fs');
const path = require('path');
const { parsePortfolioStatus, parseExecutionMode, parseBrokerAccountReference, parseHoldingsHealth } = require('./portfolioExecution');
const { getInteractiveBrokersReadiness } = require('../brokers/interactive-brokers/readiness');
const { brokerErrorStatus } = require('./runtimeState');
const { getLiveArmState, summarizeApprovalState } = require('./liveReadinessPreflight');

function parseFlag(text, label) {
  const match = String(text || '').match(new RegExp(`- ${label}:\\s*(.+)`));
  const value = match ? match[1].trim() : null;
  if (value == null) return null;
  if (/^(true|yes)$/i.test(value)) return true;
  if (/^(false|no)$/i.test(value)) return false;
  return value;
}

async function evaluateExecutionAuthority({ portfolioDir } = {}) {
  const portfolioPath = path.join(portfolioDir, 'portfolio.md');
  const holdingsPath = path.join(portfolioDir, 'holdings.md');
  const portfolioText = fs.readFileSync(portfolioPath, 'utf8');
  const holdingsText = fs.readFileSync(holdingsPath, 'utf8');
  const portfolio = path.basename(portfolioDir);
  const brokerReadiness = await getInteractiveBrokersReadiness({ portfolio });
  const runtimePause = brokerErrorStatus(portfolio);
  const armState = getLiveArmState(portfolioDir);
  const approvalState = summarizeApprovalState(path.join(portfolioDir, 'trades.md'), new Date(), 24, { portfolioDir, repoRoot: path.dirname(path.dirname(path.resolve(portfolioDir))) });

  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    portfolio,
    portfolioStatus: parsePortfolioStatus(portfolioText),
    executionMode: parseExecutionMode(portfolioText),
    brokerAccountReference: parseBrokerAccountReference(portfolioText),
    approvalRules: {
      requireFirstTradeConfirmation: parseFlag(portfolioText, 'Require confirmation before first live trade'),
      requireFirstPurchaseApproval: parseFlag(portfolioText, 'Require user approval for first purchase'),
      requireSalesApproval: parseFlag(portfolioText, 'Require user approval for sales'),
    },
    holdingsHealth: parseHoldingsHealth(holdingsText),
    brokerReadiness,
    runtimePause,
    liveArm: armState,
    approvalState,
    effectiveAuthority: {
      liveExecutionPossibleNow: Boolean(
        parsePortfolioStatus(portfolioText) === 'active'
        && parseExecutionMode(portfolioText) === 'transmitted_live'
        && brokerReadiness.authenticated
        && !brokerReadiness.fallbackRequired
        && !runtimePause.stopAutomation
        && armState.armedForMarketOpen
        && (approvalState.hasExecutableApprovedRows || approvalState.hasExecutableApprovedBasket)
      ),
      requiresExplicitOperatorAction: Boolean(
        parseExecutionMode(portfolioText) !== 'transmitted_live'
        || !armState.armedForMarketOpen
        || !brokerReadiness.authenticated
        || brokerReadiness.fallbackRequired
        || runtimePause.stopAutomation
        || !(approvalState.hasExecutableApprovedRows || approvalState.hasExecutableApprovedBasket)
      ),
    },
  };
}

module.exports = {
  evaluateExecutionAuthority,
};
