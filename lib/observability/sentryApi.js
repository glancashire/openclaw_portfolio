/**
 * lib/observability/sentryApi.js
 *
 * Thin Sentry Web API client. Read-only endpoints used by the autonomous
 * bug-fix cron. No new dependencies — uses global fetch (Node 18+).
 *
 * Public API:
 *   listIssues({ org, project, statsPeriod, query, limit, fetchImpl })
 *     -> Promise<{ issues, nextCursor }>
 *   getIssue({ issueId, fetchImpl })
 *     -> Promise<issue>
 *   getLatestEvent({ issueId, fetchImpl })
 *     -> Promise<event>
 *   parseLinkHeader(headerValue) -> string|null  (next cursor or null)
 *
 * Env:
 *   SENTRY_AUTH_TOKEN  — required for all calls
 *   SENTRY_API_BASE    — optional override (default https://sentry.io/api/0)
 *
 * Injection:
 *   Pass `fetchImpl` to use a mocked transport in tests.
 */

'use strict';

const DEFAULT_BASE = 'https://sentry.io/api/0';
const USER_AGENT = 'openclaw-portfolio/sentry-api';

function _getToken() {
  const token = process.env.SENTRY_AUTH_TOKEN;
  if (!token) {
    const err = new Error('SENTRY_AUTH_TOKEN is not set');
    err.code = 'SENTRY_MISSING_TOKEN';
    throw err;
  }
  return token;
}

function _base() {
  return process.env.SENTRY_API_BASE || DEFAULT_BASE;
}

async function _request(url, opts, fetchImpl) {
  const token = _getToken();
  const headers = Object.assign({
    Authorization: `Bearer ${token}`,
    'User-Agent': USER_AGENT,
    Accept: 'application/json',
  }, (opts && opts.headers) || {});

  const f = fetchImpl || globalThis.fetch;
  if (typeof f !== 'function') {
    const err = new Error('global fetch not available; pass fetchImpl');
    err.code = 'SENTRY_NO_FETCH';
    throw err;
  }

  const res = await f(url, Object.assign({}, opts, { headers }));
  if (!res.ok) {
    let bodyText = '';
    try { bodyText = await res.text(); } catch (_) {}
    const err = new Error(`Sentry API ${res.status} ${res.statusText || ''} for ${url}: ${bodyText.slice(0, 300)}`);
    err.status = res.status;
    err.code = 'SENTRY_API_ERROR';
    err.retryAfter = res.headers && typeof res.headers.get === 'function' ? res.headers.get('Retry-After') : null;
    throw err;
  }
  const linkHeader = res.headers && typeof res.headers.get === 'function' ? res.headers.get('Link') : null;
  const json = await res.json();
  return { json, linkHeader };
}

/**
 * parseLinkHeader — Sentry follows the GitHub-style Link header convention:
 *
 *   <https://...?cursor=ABC>; rel="next"; results="true"; cursor="ABC"
 *
 * Returns the cursor string for rel="next" with results="true", else null.
 */
function parseLinkHeader(headerValue) {
  if (!headerValue || typeof headerValue !== 'string') return null;
  const parts = headerValue.split(',');
  for (const part of parts) {
    const segments = part.split(';').map((s) => s.trim());
    if (segments.length < 2) continue;
    const attrs = {};
    for (const seg of segments.slice(1)) {
      const m = seg.match(/^([a-zA-Z_-]+)\s*=\s*"?([^";]*)"?/);
      if (m) attrs[m[1].toLowerCase()] = m[2];
    }
    if (attrs.rel === 'next' && attrs.results === 'true' && attrs.cursor) {
      return attrs.cursor;
    }
  }
  return null;
}

/**
 * listIssues — paginate through project issues, return up to `limit` total.
 *
 * Cursor pagination is handled internally; we stop as soon as we have
 * `limit` issues or run out of pages.
 */
async function listIssues(opts) {
  opts = opts || {};
  const { org, project, statsPeriod, query, fetchImpl } = opts;
  const limit = typeof opts.limit === 'number' ? opts.limit : 25;
  if (!org) throw new Error('listIssues requires { org }');
  if (!project) throw new Error('listIssues requires { project }');

  const collected = [];
  let cursor = null;
  let safety = 20; // hard cap on pages
  let nextCursor = null;

  while (collected.length < limit && safety-- > 0) {
    const params = new URLSearchParams();
    params.set('statsPeriod', statsPeriod || '7d');
    params.set('query', query || 'is:unresolved');
    params.set('limit', String(Math.min(100, limit - collected.length)));
    if (cursor) params.set('cursor', cursor);

    const url = `${_base()}/projects/${encodeURIComponent(org)}/${encodeURIComponent(project)}/issues/?${params.toString()}`;
    const { json, linkHeader } = await _request(url, { method: 'GET' }, fetchImpl);
    if (!Array.isArray(json)) {
      const err = new Error(`Sentry listIssues: expected array, got ${typeof json}`);
      err.code = 'SENTRY_BAD_SHAPE';
      throw err;
    }
    for (const issue of json) {
      if (collected.length >= limit) break;
      collected.push(issue);
    }
    nextCursor = parseLinkHeader(linkHeader);
    if (!nextCursor || collected.length >= limit) break;
    cursor = nextCursor;
  }

  return { issues: collected, nextCursor: collected.length >= limit ? nextCursor : null };
}

async function getIssue(opts) {
  const { issueId, fetchImpl } = opts || {};
  if (!issueId) throw new Error('getIssue requires { issueId }');
  const url = `${_base()}/issues/${encodeURIComponent(issueId)}/`;
  const { json } = await _request(url, { method: 'GET' }, fetchImpl);
  return json;
}

async function getLatestEvent(opts) {
  const { issueId, fetchImpl } = opts || {};
  if (!issueId) throw new Error('getLatestEvent requires { issueId }');
  const url = `${_base()}/issues/${encodeURIComponent(issueId)}/events/latest/`;
  const { json } = await _request(url, { method: 'GET' }, fetchImpl);
  return json;
}

module.exports = {
  listIssues,
  getIssue,
  getLatestEvent,
  parseLinkHeader,
  _DEFAULT_BASE: DEFAULT_BASE,
};
