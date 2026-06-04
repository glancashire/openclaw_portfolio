'use strict';

/**
 * Unit tests for lib/observability/sentryApi.js.
 *
 * Covers:
 *   - URL composition (org, project, statsPeriod, query, cursor)
 *   - Auth header sent with Bearer token
 *   - Single-page response
 *   - Multi-page pagination (3 pages, limit caps at 10)
 *   - parseLinkHeader happy path, malformed, missing
 *   - Error mapping: 401, 403, 404, 429, 500
 *   - Missing token throws SENTRY_MISSING_TOKEN
 *   - getIssue + getLatestEvent URL formation
 *   - listIssues bad shape (non-array) raises SENTRY_BAD_SHAPE
 *
 * No network. All fetch calls are mocked via fetchImpl injection.
 */

const assert = require('assert');

let asserted = 0;
function ok(label, cond) {
  assert.ok(cond, label);
  console.log('  ok —', label);
  asserted++;
}

function eq(label, actual, expected) {
  assert.strictEqual(actual, expected, label);
  console.log('  ok —', label);
  asserted++;
}

// Must set token before requiring the module (it reads on each call)
process.env.SENTRY_AUTH_TOKEN = 'test-token-1234';

const {
  listIssues, getIssue, getLatestEvent, parseLinkHeader,
} = require('../lib/observability/sentryApi');

function mockFetch(responses) {
  let callIdx = 0;
  const calls = [];
  const impl = async (url, opts) => {
    calls.push({ url, opts });
    const r = responses[callIdx++] || responses[responses.length - 1];
    return {
      ok: r.ok !== undefined ? r.ok : true,
      status: r.status || 200,
      statusText: r.statusText || 'OK',
      json: async () => r.json,
      text: async () => (r.text !== undefined ? r.text : JSON.stringify(r.json)),
      headers: {
        get: (name) => {
          if (name.toLowerCase() === 'link') return r.linkHeader || null;
          if (name.toLowerCase() === 'retry-after') return r.retryAfter || null;
          return null;
        },
      },
    };
  };
  return { impl, calls };
}

async function run() {
  // --- 1. URL composition + auth header ---
  {
    const issues = [{ id: '1', title: 'bug1' }];
    const { impl, calls } = mockFetch([{ json: issues }]);
    await listIssues({ org: 'my-org', project: 'my-proj', statsPeriod: '14d', query: 'is:unresolved', limit: 25, fetchImpl: impl });
    const url = calls[0].url;
    ok('URL contains org', url.includes('/projects/my-org/my-proj/issues/'));
    ok('URL contains statsPeriod', url.includes('statsPeriod=14d'));
    ok('URL contains query', url.includes('query=is%3Aunresolved'));
    ok('URL contains limit', url.includes('limit=25'));
    ok('auth header is Bearer token', calls[0].opts.headers.Authorization === 'Bearer test-token-1234');
    ok('User-Agent set', calls[0].opts.headers['User-Agent'].includes('openclaw'));
  }

  // --- 2. Single page result ---
  {
    const issues = [{ id: '1' }, { id: '2' }, { id: '3' }];
    const { impl } = mockFetch([{ json: issues }]);
    const result = await listIssues({ org: 'o', project: 'p', limit: 10, fetchImpl: impl });
    eq('single page: count', result.issues.length, 3);
    eq('single page: nextCursor null', result.nextCursor, null);
  }

  // --- 3. Multi-page with limit cap ---
  {
    const page1 = Array.from({ length: 5 }, (_, i) => ({ id: `p1-${i}` }));
    const page2 = Array.from({ length: 5 }, (_, i) => ({ id: `p2-${i}` }));
    const page3 = Array.from({ length: 5 }, (_, i) => ({ id: `p3-${i}` }));
    const { impl, calls } = mockFetch([
      { json: page1, linkHeader: '<https://sentry.io/...?cursor=c2>; rel="next"; results="true"; cursor="c2"' },
      { json: page2, linkHeader: '<https://sentry.io/...?cursor=c3>; rel="next"; results="true"; cursor="c3"' },
      { json: page3 },
    ]);
    const result = await listIssues({ org: 'o', project: 'p', limit: 10, fetchImpl: impl });
    eq('multi-page: returns exactly limit', result.issues.length, 10);
    eq('multi-page: fetches 2 pages', calls.length, 2);
    ok('multi-page: second call has cursor', calls[1].url.includes('cursor=c2'));
  }

  // --- 4. parseLinkHeader ---
  {
    eq('parseLinkHeader: happy', parseLinkHeader('<https://x?cursor=ABC>; rel="next"; results="true"; cursor="ABC"'), 'ABC');
    eq('parseLinkHeader: results=false', parseLinkHeader('<https://x?cursor=ABC>; rel="next"; results="false"; cursor="ABC"'), null);
    eq('parseLinkHeader: rel=previous', parseLinkHeader('<https://x?cursor=ABC>; rel="previous"; results="true"; cursor="ABC"'), null);
    eq('parseLinkHeader: empty', parseLinkHeader(''), null);
    eq('parseLinkHeader: null', parseLinkHeader(null), null);
    eq('parseLinkHeader: garbage', parseLinkHeader('not a header'), null);
    // Multi-part (previous + next)
    const multiLink = '<https://x?cursor=P1>; rel="previous"; results="false"; cursor="P1", <https://x?cursor=N2>; rel="next"; results="true"; cursor="N2"';
    eq('parseLinkHeader: multi-part picks next', parseLinkHeader(multiLink), 'N2');
  }

  // --- 5. Error mapping ---
  for (const code of [401, 403, 404, 429, 500]) {
    const { impl } = mockFetch([{ ok: false, status: code, statusText: 'Err', json: null, text: 'denied' }]);
    let threw = null;
    try { await listIssues({ org: 'o', project: 'p', fetchImpl: impl }); }
    catch (e) { threw = e; }
    ok(`${code} raises error`, threw !== null);
    eq(`${code} error.status`, threw.status, code);
    eq(`${code} error.code`, threw.code, 'SENTRY_API_ERROR');
  }

  // --- 6. 429 includes retryAfter ---
  {
    const { impl } = mockFetch([{ ok: false, status: 429, retryAfter: '30', json: null, text: 'rate limited' }]);
    let threw = null;
    try { await listIssues({ org: 'o', project: 'p', fetchImpl: impl }); }
    catch (e) { threw = e; }
    eq('429 retryAfter parsed', threw.retryAfter, '30');
  }

  // --- 7. Missing token ---
  {
    const origToken = process.env.SENTRY_AUTH_TOKEN;
    delete process.env.SENTRY_AUTH_TOKEN;
    let threw = null;
    try { await listIssues({ org: 'o', project: 'p', fetchImpl: async () => {} }); }
    catch (e) { threw = e; }
    ok('missing token throws', threw !== null);
    eq('missing token code', threw.code, 'SENTRY_MISSING_TOKEN');
    process.env.SENTRY_AUTH_TOKEN = origToken;
  }

  // --- 8. getIssue URL ---
  {
    const { impl, calls } = mockFetch([{ json: { id: '99', title: 'foo' } }]);
    const result = await getIssue({ issueId: '99', fetchImpl: impl });
    ok('getIssue URL correct', calls[0].url.includes('/issues/99/'));
    eq('getIssue returns issue', result.id, '99');
  }

  // --- 9. getLatestEvent URL ---
  {
    const { impl, calls } = mockFetch([{ json: { eventID: 'abc', entries: [] } }]);
    const result = await getLatestEvent({ issueId: '42', fetchImpl: impl });
    ok('getLatestEvent URL correct', calls[0].url.includes('/issues/42/events/latest/'));
    eq('getLatestEvent returns event', result.eventID, 'abc');
  }

  // --- 10. listIssues bad shape (non-array) ---
  {
    const { impl } = mockFetch([{ json: { detail: 'not found' } }]);
    let threw = null;
    try { await listIssues({ org: 'o', project: 'p', fetchImpl: impl }); }
    catch (e) { threw = e; }
    ok('bad shape throws', threw !== null);
    eq('bad shape code', threw.code, 'SENTRY_BAD_SHAPE');
  }

  // --- 11. listIssues requires org and project ---
  {
    let threw = null;
    try { await listIssues({ project: 'p', fetchImpl: async () => {} }); }
    catch (e) { threw = e; }
    ok('missing org throws', threw !== null && /org/.test(threw.message));
  }
  {
    let threw = null;
    try { await listIssues({ org: 'o', fetchImpl: async () => {} }); }
    catch (e) { threw = e; }
    ok('missing project throws', threw !== null && /project/.test(threw.message));
  }

  console.log(`\nsentryApi tests: ${asserted} assertions passed`);
}

run().catch((err) => {
  console.error('TEST FAILURE:', err);
  process.exit(1);
});
