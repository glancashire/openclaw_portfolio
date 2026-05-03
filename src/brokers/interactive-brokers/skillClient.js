const { execFile } = require('child_process');
const path = require('path');
const { loadInteractiveBrokersConfig } = require('./config');

class InteractiveBrokersSkillClient {
  constructor(config = loadInteractiveBrokersConfig()) {
    this.config = config;
    this.pythonPath = path.join(process.cwd(), 'skills', 'ibkr', '.venv', 'bin', 'python');
    this.cliPath = path.join(process.cwd(), 'skills', 'ibkr', 'scripts', 'ibkr_cli.py');
  }

  async authenticate() {
    return this.run(['account-summary', '--json', '--readonly']);
  }

  async fetchAccounts() {
    const result = await this.run(['account-summary', '--json', '--readonly']);
    if (!result.ok) throw new Error(result.error);
    const accounts = [...new Set((result.data || []).map((row) => row.account).filter(Boolean))];
    return accounts.map((account) => ({ id: account, accountId: account, account }));
  }

  async fetchLedger(accountId) {
    const args = ['account-summary', '--json', '--readonly'];
    if (accountId) args.push('--account', accountId);
    const result = await this.run(args);
    if (!result.ok) throw new Error(result.error);
    return summarizeLedger(result.data || []);
  }

  async fetchPositions(accountId) {
    const args = ['positions', '--json', '--readonly'];
    if (accountId) args.push('--account', accountId);
    const result = await this.run(args);
    if (!result.ok) throw new Error(result.error);
    return result.data || [];
  }

  async searchContracts(query) {
    const attempts = [
      ['contract-details', '--symbol', query, '--sec-type', 'STK', '--exchange', 'SMART', '--json', '--readonly'],
      ['contract-details', '--symbol', query, '--sec-type', 'STK', '--exchange', 'SMART', '--currency', 'USD', '--json', '--readonly'],
      ['contract-details', '--symbol', query, '--sec-type', 'STK', '--exchange', 'LSEETF', '--currency', 'USD', '--json', '--readonly'],
      ['contract-details', '--symbol', query, '--sec-type', 'STK', '--exchange', 'LSE', '--currency', 'USD', '--json', '--readonly'],
      ['contract-details', '--symbol', query, '--sec-type', 'STK', '--exchange', 'EBS', '--currency', 'CHF', '--json', '--readonly'],
      ['contract-details', '--symbol', query, '--sec-type', 'STK', '--exchange', 'AEB', '--currency', 'EUR', '--json', '--readonly'],
    ];

    for (const args of attempts) {
      const result = await this.run(args);
      if (!result.ok) throw new Error(result.error);
      if (Array.isArray(result.data) && result.data.length) {
        return result.data.map((row) => ({
          conid: row.conId || null,
          symbol: row.symbol || null,
          name: row.longName || row.symbol || null,
          description: row.category || null,
          exchange: row.primaryExchange || row.exchange || null,
          currency: row.currency || null,
          secType: row.secType || null,
          raw: row,
        }));
      }
    }

    return [];
  }

  async fetchMarketSnapshot(conids) {
    const ids = Array.isArray(conids) ? conids : [conids];
    const out = [];
    for (const conid of ids.filter(Boolean)) {
      const result = await this.run(['contract-details', '--con-id', String(conid), '--symbol', 'DUMMY', '--sec-type', 'STK', '--json', '--readonly']);
      if (!result.ok) throw new Error(result.error);
      const detail = Array.isArray(result.data) ? result.data[0] : null;
      if (!detail?.symbol) {
        out.push({ conid: String(conid), error: 'contract_not_found' });
        continue;
      }
      const quote = await this.run([
        'quote',
        '--symbol', detail.symbol,
        '--sec-type', detail.secType || 'STK',
        '--exchange', detail.primaryExchange || detail.exchange || 'SMART',
        '--currency', detail.currency || 'USD',
        '--market-data-type', '3',
        '--json',
        '--readonly',
      ]);
      if (!quote.ok) throw new Error(quote.error);
      const row = Array.isArray(quote.data) ? quote.data[0] : null;
      out.push({
        conid: String(conid),
        '31': row?.last ?? row?.close ?? null,
        '84': row?.bid ?? null,
        '85': detail.currency || row?.currency || null,
        '86': row?.ask ?? null,
      });
    }
    return out;
  }

  async fetchOpenOrders() {
    const result = await this.run(['open-orders', '--json']);
    if (!result.ok) throw new Error(result.error);
    return Array.isArray(result.data) ? result.data : [];
  }

  async fetchExecutions() {
    const result = await this.run(['executions', '--json']);
    if (!result.ok) throw new Error(result.error);
    return Array.isArray(result.data) ? result.data : [];
  }

  async fetchCompletedOrders() {
    const result = await this.run(['completed-orders', '--json']);
    if (!result.ok) throw new Error(result.error);
    return Array.isArray(result.data) ? result.data : [];
  }

  async placeOrder(order, { transmit = true } = {}) {
    const args = [
      'place-order',
      '--symbol', String(order.symbol),
      '--sec-type', String(order.secType || 'STK'),
      '--exchange', String(order.exchange || 'SMART'),
      '--currency', String(order.currency || 'USD'),
      '--action', String(order.action || 'BUY').toUpperCase(),
      '--quantity', String(order.quantity),
      '--order-type', String(order.orderType || 'LMT').toUpperCase(),
      '--json',
    ];
    if (order.primaryExchange) args.push('--primary-exchange', String(order.primaryExchange));
    if (order.limitPrice != null) args.push('--limit-price', String(order.limitPrice));
    if (order.stopPrice != null) args.push('--stop-price', String(order.stopPrice));
    if (order.tif) args.push('--tif', String(order.tif));
    if (order.outsideRth) args.push('--outside-rth');
    if (transmit === false) args.push('--no-transmit');
    const result = await this.run(args);
    if (!result.ok) throw new Error(result.error);
    const row = result.data?.trade || null;
    return {
      ok: true,
      trade: row,
      errors: Array.isArray(result.data?.errors) ? result.data.errors : [],
      raw: result.data,
    };
  }

  async cancelOrder(orderId) {
    const result = await this.run(['cancel-order', '--order-id', String(orderId), '--json']);
    if (!result.ok) throw new Error(result.error);
    const row = Array.isArray(result.data) ? result.data[0] : null;
    return {
      ok: true,
      orderId: row?.orderId ?? Number(orderId),
      status: row?.status || 'cancel_requested',
      message: 'Interactive Brokers cancel request sent.',
      raw: row,
    };
  }

  run(args) {
    return new Promise((resolve) => {
      const baseArgs = [this.cliPath, ...args, '--host', this.config.host, '--port', String(this.config.port), '--client-id', String(this.config.clientId)];
      if (this.config.accountId && !baseArgs.includes('--account')) {
        baseArgs.push('--account', this.config.accountId);
      }
      execFile(this.pythonPath, baseArgs, { cwd: process.cwd(), timeout: 30000 }, (error, stdout, stderr) => {
        const text = String(stdout || '').trim();
        const errText = String(stderr || '').trim();
        if (error) {
          resolve({ ok: false, error: extractErrorMessage(errText || text || error.message), stdout: text, stderr: errText });
          return;
        }
        try {
          resolve({ ok: true, data: text ? JSON.parse(text) : null, stdout: text, stderr: errText });
        } catch (parseError) {
          resolve({ ok: false, error: `Failed to parse IBKR skill output: ${parseError.message}`, stdout: text, stderr: errText });
        }
      });
    });
  }
}

function summarizeLedger(rows) {
  const ledger = {};
  for (const row of rows) {
    const currency = row.currency || 'BASE';
    ledger[currency] ||= {};
    const key = normalizeTag(row.tag);
    ledger[currency][key] = row.value;
  }
  return ledger;
}

function normalizeTag(tag) {
  const value = String(tag || '').trim();
  if (!value) return 'unknown';
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function extractErrorMessage(text) {
  const line = String(text || '').split(/\r?\n/).find((entry) => entry.includes('ERROR:'));
  return line ? line.replace(/^.*ERROR:\s*/, '').trim() : String(text || 'Interactive Brokers skill command failed').trim();
}

module.exports = { InteractiveBrokersSkillClient, summarizeLedger, normalizeTag, extractErrorMessage };
