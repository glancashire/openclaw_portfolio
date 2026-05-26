'use strict';

/**
 * Tests for lib/modelClient.js. Network and CLI calls are stubbed.
 *
 * For the openclaw provider we stub via a tmp PATH containing a fake
 * executable; for HTTP providers we inject a fake fetch.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { createModelClient } = require('../lib/modelClient');

function makeFetchOk(jsonPayload) {
  return async (_url, _init) => ({
    ok: true, status: 200,
    async json() { return jsonPayload; },
    async text() { return JSON.stringify(jsonPayload); },
  });
}
function makeFetchErr(status = 500, msg = 'bad') {
  return async () => ({
    ok: false, status,
    async json() { return { error: msg }; },
    async text() { return msg; },
  });
}

let asserted = 0;
function ok(label, cond, extra) {
  if (!cond && extra !== undefined) console.error('extra:', JSON.stringify(extra).slice(0, 300));
  assert.ok(cond, label);
  console.log('  ok —', label);
  asserted++;
}

function stubOpenclawBin({ stdout = '{"ok":true,"outputs":[{"text":"stub-response"}],"model":"stub-model"}', exitCode = 0, sleepMs = 0 } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-stub-'));
  const script = `#!/bin/sh
${sleepMs ? `sleep ${sleepMs / 1000}` : ''}
cat <<'EOF_OUT'
${stdout}
EOF_OUT
exit ${exitCode}
`;
  const p = path.join(dir, 'openclaw');
  fs.writeFileSync(p, script);
  fs.chmodSync(p, 0o755);
  return { dir, bin: p };
}

(async () => {
  // 1. no provider → available=false, complete throws NO_PROVIDER
  {
    const c = createModelClient({ env: { PATH: '/nonexistent' }, fetch: makeFetchOk({}) });
    ok('no providers → available=false', c.available === false);
    ok('no providers → provider=null',   c.provider === null);
    let threw = null;
    try { await c.complete({ user: 'hi' }); } catch (e) { threw = e; }
    ok('no provider → complete throws NO_PROVIDER', threw && threw.code === 'NO_PROVIDER');
  }

  // 2. openclaw provider — happy path
  {
    const { bin } = stubOpenclawBin();
    const c = createModelClient({ env: { OPENCLAW_BIN: bin, PATH: '/nonexistent' }, fetch: makeFetchOk({}) });
    ok('OPENCLAW_BIN set → provider=openclaw', c.provider === 'openclaw');
    ok('OPENCLAW_BIN set → available=true',    c.available === true);
    const out = await c.complete({ system: 'be brief', user: 'hi', timeoutMs: 10000 });
    ok('openclaw text returned',  out.text === 'stub-response');
    ok('openclaw provider tag',   out.provider === 'openclaw');
    ok('openclaw model tag',      out.model === 'stub-model');
  }

  // 3. openclaw preferred over anthropic/openai when both present
  {
    const { bin } = stubOpenclawBin();
    const c = createModelClient({
      env: { OPENCLAW_BIN: bin, ANTHROPIC_API_KEY: 'a', OPENAI_API_KEY: 'b', PATH: '/nonexistent' },
      fetch: makeFetchOk({}),
    });
    ok('openclaw beats env keys', c.provider === 'openclaw');
  }

  // 4. openclaw via PATH (no OPENCLAW_BIN)
  {
    const { dir } = stubOpenclawBin();
    const c = createModelClient({
      env: { PATH: `${dir}:/usr/bin` },
      fetch: makeFetchOk({}),
    });
    ok('openclaw discovered via PATH', c.provider === 'openclaw');
  }

  // 5. openclaw CLI non-zero exit → error
  {
    const { bin } = stubOpenclawBin({ exitCode: 2, stdout: 'boom' });
    const c = createModelClient({ env: { OPENCLAW_BIN: bin, PATH: '/nonexistent' }, fetch: makeFetchOk({}) });
    let threw = null;
    try { await c.complete({ user: 'hi', timeoutMs: 5000 }); } catch (e) { threw = e; }
    ok('openclaw exitCode != 0 throws', threw !== null);
    ok('openclaw exit error has code CLI_ERROR', threw && threw.code === 'CLI_ERROR');
    ok('openclaw exit error preserves exit code', threw && threw.exitCode === 2);
  }

  // 6. openclaw malformed JSON
  {
    const { bin } = stubOpenclawBin({ stdout: 'not json at all' });
    const c = createModelClient({ env: { OPENCLAW_BIN: bin, PATH: '/nonexistent' }, fetch: makeFetchOk({}) });
    let threw = null;
    try { await c.complete({ user: 'hi', timeoutMs: 5000 }); } catch (e) { threw = e; }
    ok('openclaw malformed JSON throws', threw && /malformed JSON/.test(threw.message));
  }

  // 7. openclaw empty outputs
  {
    const { bin } = stubOpenclawBin({ stdout: '{"ok":true,"outputs":[]}' });
    const c = createModelClient({ env: { OPENCLAW_BIN: bin, PATH: '/nonexistent' }, fetch: makeFetchOk({}) });
    let threw = null;
    try { await c.complete({ user: 'hi', timeoutMs: 5000 }); } catch (e) { threw = e; }
    ok('openclaw empty outputs throws', threw && /empty completion/.test(threw.message));
  }

  // 8. openclaw timeout — stub sleeps 1500ms; we set 200ms timeout
  {
    const { bin } = stubOpenclawBin({ sleepMs: 1500 });
    const c = createModelClient({ env: { OPENCLAW_BIN: bin, PATH: '/nonexistent' }, fetch: makeFetchOk({}) });
    let threw = null;
    try { await c.complete({ user: 'hi', timeoutMs: 200 }); } catch (e) { threw = e; }
    ok('openclaw timeout throws', threw && threw.code === 'TIMEOUT');
  }

  // 9. Anthropic happy path (forceProvider used since openclaw not on PATH)
  {
    let seenUrl = null, seenInit = null;
    const fakeFetch = async (url, init) => {
      seenUrl = url; seenInit = init;
      return {
        ok: true, status: 200,
        async json() { return { content: [{ type: 'text', text: 'Cash above target, drift contained.' }] }; },
        async text() { return ''; },
      };
    };
    const c = createModelClient({ env: { ANTHROPIC_API_KEY: 'k', PATH: '/nonexistent' }, fetch: fakeFetch });
    ok('anthropic key (no openclaw) → provider=anthropic', c.provider === 'anthropic');
    const out = await c.complete({ system: 'be concise', user: 'state the portfolio in one line' });
    ok('anthropic returns text',        out.text === 'Cash above target, drift contained.');
    ok('anthropic url correct',         seenUrl === 'https://api.anthropic.com/v1/messages');
    ok('anthropic headers include key', seenInit.headers['x-api-key'] === 'k');
  }

  // 10. OpenAI fallback
  {
    let seenUrl = null;
    const fakeFetch = async (url) => {
      seenUrl = url;
      return {
        ok: true, status: 200,
        async json() { return { choices: [{ message: { content: 'OK done.' } }] }; },
        async text() { return ''; },
      };
    };
    const c = createModelClient({ env: { OPENAI_API_KEY: 'sk-x', PATH: '/nonexistent' }, fetch: fakeFetch });
    ok('openai-only env → provider=openai', c.provider === 'openai');
    const out = await c.complete({ user: 'go' });
    ok('openai returns text',         out.text === 'OK done.');
    ok('openai url correct',          seenUrl === 'https://api.openai.com/v1/chat/completions');
  }

  // 11. forceProvider override
  {
    const { bin } = stubOpenclawBin();
    const c = createModelClient({
      env: { OPENCLAW_BIN: bin, OPENAI_API_KEY: 'sk-x', PATH: '/nonexistent' },
      fetch: makeFetchOk({ choices: [{ message: { content: 'forced openai' } }] }),
      forceProvider: 'openai',
    });
    ok('forceProvider=openai overrides auto-pick', c.provider === 'openai');
    const out = await c.complete({ user: 'hi' });
    ok('forceProvider=openai returns its text',    out.text === 'forced openai');
  }

  // 12. HTTP error surfaces with status
  {
    const c = createModelClient({ env: { ANTHROPIC_API_KEY: 'k', PATH: '/nonexistent' }, fetch: makeFetchErr(429, 'rate limited') });
    let threw = null;
    try { await c.complete({ user: 'hi' }); } catch (e) { threw = e; }
    ok('http 429 → throws',                  threw !== null);
    ok('http 429 → status preserved',         threw.status === 429);
    ok('http 429 → message includes status',  /429/.test(threw.message));
  }

  // 13. missing user prompt rejected
  {
    const { bin } = stubOpenclawBin();
    const c = createModelClient({ env: { OPENCLAW_BIN: bin, PATH: '/nonexistent' }, fetch: makeFetchOk({}) });
    let threw = null;
    try { await c.complete({}); } catch (e) { threw = e; }
    ok('missing user prompt → throws', threw && /user prompt required/.test(threw.message));
  }

  // 14. empty content rejected (anthropic)
  {
    const c = createModelClient({ env: { ANTHROPIC_API_KEY: 'k', PATH: '/nonexistent' }, fetch: makeFetchOk({ content: [] }) });
    let threw = null;
    try { await c.complete({ user: 'hi' }); } catch (e) { threw = e; }
    ok('anthropic empty content → throws', threw && /empty/i.test(threw.message));
  }

  console.log(JSON.stringify({ ok: true, asserted }));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
