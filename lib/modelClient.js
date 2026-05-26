'use strict';

/**
 * lib/modelClient.js
 *
 * Pluggable LLM client. Auto-selects provider:
 *   1. openclaw   — if `openclaw` CLI on PATH (or OPENCLAW_BIN set);
 *                   uses `openclaw capability model run --json`.
 *                   Routes through whatever the host's myclaw/etc auth
 *                   has configured. NO raw API key needed.
 *   2. anthropic  — if ANTHROPIC_API_KEY set; HTTP /v1/messages.
 *   3. openai     — if OPENAI_API_KEY set; HTTP /v1/chat/completions.
 *   4. none       — client.available === false; callers fall back.
 *
 * Override: pass `{ forceProvider: 'openai' }` to override auto-pick.
 *
 * Uses native fetch (Node 18+) for HTTP providers and child_process
 * for the CLI provider. No SDK dependency.
 *
 * Async function `complete({ system, user, maxTokens, timeoutMs })`
 * returns `{ text, provider, model, raw }` on success, throws on failure.
 *
 * Object also exposes `available` (boolean) and `provider` (string|null).
 */

const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const DEFAULTS = Object.freeze({
  maxTokens:       400,
  timeoutMs:       30_000,
  anthropicModel:  'claude-haiku-4-5-20251001',
  openaiModel:     'gpt-4o-mini',
  openclawModel:   null, // null = let CLI pick default
});

function findOpenclawBin(env) {
  if (env.OPENCLAW_BIN && fs.existsSync(env.OPENCLAW_BIN)) return env.OPENCLAW_BIN;
  // PATH lookup
  const pathDirs = String(env.PATH || '').split(path.delimiter).filter(Boolean);
  for (const dir of pathDirs) {
    const candidate = path.join(dir, 'openclaw');
    try {
      const st = fs.statSync(candidate);
      if (st.isFile() && (st.mode & 0o111)) return candidate;
    } catch (_) { /* not here */ }
  }
  return null;
}

function createModelClient(opts = {}) {
  const env = opts.env || process.env;
  const fetchImpl = opts.fetch || globalThis.fetch;
  const cfg = { ...DEFAULTS, ...opts };
  const forceProvider = opts.forceProvider || null;

  let provider = null;
  let openclawBin = null;
  if (forceProvider) {
    provider = forceProvider;
    if (provider === 'openclaw') openclawBin = findOpenclawBin(env);
  } else {
    openclawBin = findOpenclawBin(env);
    if (openclawBin)               provider = 'openclaw';
    else if (env.ANTHROPIC_API_KEY) provider = 'anthropic';
    else if (env.OPENAI_API_KEY)   provider = 'openai';
  }

  const available = provider === 'openclaw'
    ? Boolean(openclawBin)
    : (provider === 'anthropic' || provider === 'openai') && typeof fetchImpl === 'function';

  async function complete({ system = '', user, maxTokens, timeoutMs } = {}) {
    if (!available) {
      const err = new Error('modelClient: no provider available (set OPENCLAW_BIN, ANTHROPIC_API_KEY, or OPENAI_API_KEY)');
      err.code = 'NO_PROVIDER';
      throw err;
    }
    if (!user || typeof user !== 'string') {
      throw new Error('modelClient.complete: user prompt required');
    }
    const mt = Number(maxTokens || cfg.maxTokens);
    const tm = Number(timeoutMs || cfg.timeoutMs);

    if (provider === 'openclaw') {
      return await callOpenclaw({ system, user, maxTokens: mt, timeoutMs: tm, openclawBin, cfg });
    }

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

function callOpenclaw({ system, user, maxTokens: _mt, timeoutMs, openclawBin, cfg }) {
  const combined = system
    ? `[SYSTEM]\n${system}\n\n[USER]\n${user}`
    : user;
  const args = ['capability', 'model', 'run', '--json', '--prompt', combined];
  if (cfg.openclawModel) { args.push('--model', cfg.openclawModel); }

  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    const finish = (fn, val) => { if (!settled) { settled = true; fn(val); } };

    const child = spawn(openclawBin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const timer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch (_) { /* */ }
      finish(reject, Object.assign(new Error(`openclaw model run timed out after ${timeoutMs}ms`), { code: 'TIMEOUT' }));
    }, timeoutMs);

    child.stdout.on('data', (b) => { stdout += b.toString('utf8'); });
    child.stderr.on('data', (b) => { stderr += b.toString('utf8'); });
    child.on('error', (err) => { clearTimeout(timer); finish(reject, err); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (settled) return;
      if (code !== 0) {
        return finish(reject, Object.assign(
          new Error(`openclaw exited ${code}: ${stderr.trim().slice(0, 200) || stdout.trim().slice(0, 200)}`),
          { code: 'CLI_ERROR', exitCode: code },
        ));
      }
      let parsed;
      try { parsed = JSON.parse(stdout); } catch (_) {
        return finish(reject, new Error(`openclaw: malformed JSON (${stdout.slice(0, 100)}…)`));
      }
      if (!parsed || parsed.ok === false) {
        return finish(reject, new Error(`openclaw: model run failed (${JSON.stringify(parsed).slice(0, 200)})`));
      }
      const text = (parsed.outputs || []).map((o) => o && o.text).filter(Boolean).join('').trim();
      if (!text) return finish(reject, new Error('openclaw: empty completion'));
      finish(resolve, { text, raw: parsed, provider: 'openclaw', model: parsed.model || cfg.openclawModel || null });
    });
  });
}

async function callAnthropic({ system, user, maxTokens, env, fetchImpl, cfg, signal }) {
  const body = {
    model: cfg.anthropicModel,
    max_tokens: maxTokens,
    system: system || undefined,
    messages: [{ role: 'user', content: user }],
  };
  const res = await fetchImpl('https://api.anthropic.com/v1/messages', {
    method: 'POST', signal,
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
  const text = (json?.content || []).filter((b) => b && b.type === 'text').map((b) => b.text).join('').trim();
  if (!text) throw new Error('anthropic: empty completion');
  return { text, raw: json, provider: 'anthropic', model: cfg.anthropicModel };
}

async function callOpenAI({ system, user, maxTokens, env, fetchImpl, cfg, signal }) {
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: user });
  const body = { model: cfg.openaiModel, max_tokens: maxTokens, messages };
  const res = await fetchImpl('https://api.openai.com/v1/chat/completions', {
    method: 'POST', signal,
    headers: { 'content-type': 'application/json', 'authorization': `Bearer ${env.OPENAI_API_KEY}` },
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

async function safeText(res) { try { return await res.text(); } catch (_) { return ''; } }

module.exports = { createModelClient, DEFAULTS, _findOpenclawBin: findOpenclawBin };
