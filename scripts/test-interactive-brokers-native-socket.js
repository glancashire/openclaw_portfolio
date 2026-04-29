const net = require('net');
const { loadInteractiveBrokersConfig } = require('../src/brokers/interactive-brokers/config');

async function main() {
  const cfg = loadInteractiveBrokersConfig();
  if (cfg.mode !== 'native') {
    console.error(JSON.stringify({ ok: false, reason: 'wrong_mode', mode: cfg.mode, message: 'Set IBKR_MODE=native or secrets mode=native first.' }, null, 2));
    process.exit(1);
  }

  const startedAt = Date.now();
  const result = await probeSocket(cfg.host, cfg.port, 5000);
  console.log(JSON.stringify({
    ok: result.ok,
    mode: cfg.mode,
    runtime: cfg.runtime,
    host: cfg.host,
    port: cfg.port,
    clientId: cfg.clientId,
    readonly: cfg.readonly,
    accountId: cfg.accountId || null,
    elapsedMs: Date.now() - startedAt,
    ...result,
  }, null, 2));
  process.exit(result.ok ? 0 : 1);
}

function probeSocket(host, port, timeoutMs) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      try { socket.destroy(); } catch {}
      resolve(payload);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish({ ok: true, status: 'connected' }));
    socket.once('timeout', () => finish({ ok: false, status: 'timeout' }));
    socket.once('error', (error) => finish({ ok: false, status: 'error', error: error.message }));
    socket.connect(port, host);
  });
}

main().catch((err) => {
  console.error(err.stack || String(err));
  process.exit(1);
});
