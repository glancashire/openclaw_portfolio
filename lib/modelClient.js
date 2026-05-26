'use strict';

/**
 * lib/modelClient.js
 *
 * Tiny pluggable LLM client. Auto-selects provider from env:
 *   1. ANTHROPIC_API_KEY   -> Anthropic Messages API (claude-haiku-4-5)
 *   2. OPENAI_API_KEY      -> OpenAI Chat Completions (gpt-4o-mini)
 *   3. neither             -> client.available === false; callers fall back.
 *
 * Uses native fetch (Node 18+). No SDK dependency.
 *
 * Exposes a single async function `complete({ system, user, maxTokens, timeoutMs })`
 * returning { text } on success, throwing on failure.
 *
 * The client object also exposes `available` (boolean) and `provider`
 * (string|null) so callers can route around it without try/catch.
 */

const DEFAULTS = Object.freeze({
  maxTokens: 400,
  timeoutMs: 15_000,
  anthropicModel: 'claude-haiku-4-5-20251001',
  openaiModel:    'gpt-4o-mini',
});

function createModelClient(opts = {}) {
  const env = opts.env || process.env;
  const fetchImpl = opts.fetch || globalThis.fetch;
  const cfg = { ...DEFAULTS, ...opts };

  let provider = null;
  if (env.ANTHROPIC_API_KEY) provider = 'anthropic';
  else if (env.OPENAI_API_KEY) provider = 'openai';

  const available = provider !== null && typeof fetchImpl === 'function';

  async function complete({ system = '', user, maxTokens, timeoutMs } = {}) {
    if (!available) {
      const err = new Error('modelClient: no provider available (set ANTHROPIC_API_KEY or OPENAI_API_KEY)');
      err.code = 'NO_PROVIDER';
      throw err;
    }
    if (!user || typeof user !== 'string') {
      throw new Error('modelClient.complete: user prompt required');
    }
    const mt = Number(maxTokens || cfg.maxTokens);
    const tm = Number(timeoutMs || cfg.timeoutMs);
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), tm);
    try {
      if (provider === 'anthropic') return await callAnthropic({ system, user, maxTokens: mt, env, fetchImpl, cfg, signal: ctl.signal });
      if (provider === 'openai')    return await callOpenAI   ({ system, user, maxTokens: mt, env, fetchImpl, cfg, signal: ctl.signal });
      throw new Error(`modelClient: unsupported provider ${provider}`);
    } finally {
      clearTimeout(timer);
    }
  }

  return { available, provider, complete };
}

async function callAnthropic({ system, user, maxTokens, env, fetchImpl, cfg, signal }) {
  const body = {
    model: cfg.anthropicModel,
    max_tokens: maxTokens,
    system: system || undefined,
    messages: [{ role: 'user', content: user }],
  };
  const res = await fetchImpl('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'content-type':       'application/json',
      'x-api-key':          env.ANTHROPIC_API_KEY,
      'anthropic-version':  '2023-06-01',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await safeText(res);
    const err = new Error(`anthropic ${res.status}: ${txt.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  const json = await res.json();
  const text = (json?.content || [])
    .filter((b) => b && b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
  if (!text) throw new Error('anthropic: empty completion');
  return { text, raw: json, provider: 'anthropic', model: cfg.anthropicModel };
}

async function callOpenAI({ system, user, maxTokens, env, fetchImpl, cfg, signal }) {
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: user });
  const body = {
    model: cfg.openaiModel,
    max_tokens: maxTokens,
    messages,
  };
  const res = await fetchImpl('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      'content-type':  'application/json',
      'authorization': `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await safeText(res);
    const err = new Error(`openai ${res.status}: ${txt.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  const json = await res.json();
  const text = (json?.choices?.[0]?.message?.content || '').trim();
  if (!text) throw new Error('openai: empty completion');
  return { text, raw: json, provider: 'openai', model: cfg.openaiModel };
}

async function safeText(res) {
  try { return await res.text(); } catch (_) { return ''; }
}

module.exports = { createModelClient, DEFAULTS };
