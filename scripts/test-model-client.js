'use strict';

/**
 * Tests for lib/modelClient.js.
 *
 * All network calls are stubbed with a fake fetch — no live API calls.
 */

const assert = require('assert');
const { createModelClient } = require('../lib/modelClient');

function makeFetchOk(jsonPayload) {
  return async (_url, _init) => ({
    ok: true,
    status: 200,
    async json() { return jsonPayload; },
    async text() { return JSON.stringify(jsonPayload); },
  });
}

function makeFetchErr(status = 500, msg = 'bad') {
  return async () => ({
    ok: false,
    status,
    async json() { return { error: msg }; },
    async text() { return msg; },
  });
}

let asserted = 0;
function ok(label, cond) {
  assert.ok(cond, label);
  console.log('  ok —', label);
  asserted++;
}

(async () => {
  // 1. no provider → available=false, complete throws NO_PROVIDER
  {
    const c = createModelClient({ env: {}, fetch: makeFetchOk({}) });
    ok('no env keys → available=false', c.available === false);
    ok('no env keys → provider=null',   c.provider === null);
    let threw = null;
    try { await c.complete({ user: 'hi' }); } catch (e) { threw = e; }
    ok('no provider → complete throws NO_PROVIDER', threw && threw.code === 'NO_PROVIDER');
  }

  // 2. Anthropic happy path
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
    const c = createModelClient({ env: { ANTHROPIC_API_KEY: 'k' }, fetch: fakeFetch });
    ok('anthropic key → provider=anthropic', c.provider === 'anthropic');
    ok('anthropic key → available=true',    c.available === true);
    const out = await c.complete({ system: 'be concise', user: 'state the portfolio in one line' });
    ok('anthropic returns text',        out.text === 'Cash above target, drift contained.');
    ok('anthropic provider on result',  out.provider === 'anthropic');
    ok('anthropic url correct',         seenUrl === 'https://api.anthropic.com/v1/messages');
    ok('anthropic headers include key', seenInit.headers['x-api-key'] === 'k');
    const body = JSON.parse(seenInit.body);
    ok('anthropic body has model',      typeof body.model === 'string' && body.model.startsWith('claude-'));
    ok('anthropic body system passed',  body.system === 'be concise');
  }

  // 3. OpenAI fallback when only OPENAI_API_KEY is set
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
    const c = createModelClient({ env: { OPENAI_API_KEY: 'sk-x' }, fetch: fakeFetch });
    ok('openai-only env → provider=openai', c.provider === 'openai');
    const out = await c.complete({ user: 'go' });
    ok('openai returns text',         out.text === 'OK done.');
    ok('openai url correct',          seenUrl === 'https://api.openai.com/v1/chat/completions');
  }

  // 4. anthropic preferred over openai when both keys present
  {
    const c = createModelClient({ env: { ANTHROPIC_API_KEY: 'a', OPENAI_API_KEY: 'b' }, fetch: makeFetchOk({}) });
    ok('both keys → anthropic preferred', c.provider === 'anthropic');
  }

  // 5. HTTP error surfaces with status
  {
    const c = createModelClient({ env: { ANTHROPIC_API_KEY: 'k' }, fetch: makeFetchErr(429, 'rate limited') });
    let threw = null;
    try { await c.complete({ user: 'hi' }); } catch (e) { threw = e; }
    ok('http 429 → throws',         threw !== null);
    ok('http 429 → status preserved', threw.status === 429);
    ok('http 429 → message includes status', /429/.test(threw.message));
  }

  // 6. empty completion content rejected
  {
    const c = createModelClient({ env: { ANTHROPIC_API_KEY: 'k' }, fetch: makeFetchOk({ content: [] }) });
    let threw = null;
    try { await c.complete({ user: 'hi' }); } catch (e) { threw = e; }
    ok('empty content → throws', threw && /empty/i.test(threw.message));
  }

  // 7. missing user prompt rejected
  {
    const c = createModelClient({ env: { ANTHROPIC_API_KEY: 'k' }, fetch: makeFetchOk({}) });
    let threw = null;
    try { await c.complete({ }); } catch (e) { threw = e; }
    ok('missing user prompt → throws', threw && /user prompt required/i.test(threw.message));
  }

  console.log(JSON.stringify({ ok: true, asserted }));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
