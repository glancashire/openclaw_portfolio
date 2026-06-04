'use strict';

/**
 * Unit tests for lib/observability/sentry.js.
 *
 * Covers:
 *   - no-op when SENTRY_DSN is empty (default safe path)
 *   - init when DSN set + mocked @sentry/node injected
 *   - idempotent init
 *   - captureError happy path with scope (tags/extra/level)
 *   - captureError no-op when not initialized
 *   - scrubSensitive on extras, tags, request.headers, request.env
 *   - composed beforeSend (user hook runs after default scrub)
 *   - scrubSensitive handles circular refs without throwing
 *
 * No network, no real @sentry/node call, no filesystem outside tmp.
 */

const assert = require('assert');

const sentry = require('../lib/observability/sentry');

let asserted = 0;
function ok(label, cond) {
  assert.ok(cond, label);
  console.log('  ok —', label);
  asserted++;
}

function makeMockSentry() {
  const calls = {
    init: [],
    captureException: [],
    withScope: [],
    scopeOps: [],
  };
  const mock = {
    init(cfg) { calls.init.push(cfg); },
    captureException(err) { calls.captureException.push(err); },
    withScope(fn) {
      const scope = {
        setTags(t) { calls.scopeOps.push(['tags', t]); },
        setExtras(e) { calls.scopeOps.push(['extras', e]); },
        setLevel(l) { calls.scopeOps.push(['level', l]); },
        setUser(u) { calls.scopeOps.push(['user', u]); },
      };
      calls.withScope.push(scope);
      fn(scope);
    },
  };
  return { mock, calls };
}

// --- 1. no-op when DSN empty ----------------------------------------------
{
  sentry._resetForTests();
  const prevDsn = process.env.SENTRY_DSN;
  delete process.env.SENTRY_DSN;
  const { mock, calls } = makeMockSentry();
  const result = sentry.initSentry({ sentryLib: mock });
  ok('initSentry returns false when DSN unset', result === false);
  ok('Sentry.init NOT called when DSN unset', calls.init.length === 0);
  ok('isInitialized stays false', sentry.isInitialized() === false);

  const captured = sentry.captureError(new Error('x'));
  ok('captureError returns false when not initialized', captured === false);

  if (prevDsn !== undefined) process.env.SENTRY_DSN = prevDsn;
}

// --- 2. init when DSN set, mock injected ----------------------------------
{
  sentry._resetForTests();
  const { mock, calls } = makeMockSentry();
  const result = sentry.initSentry({
    dsn: 'https://abc@o1.ingest.sentry.io/1',
    environment: 'test',
    sentryLib: mock,
  });
  ok('initSentry returns true with DSN + mock', result === true);
  ok('Sentry.init called exactly once', calls.init.length === 1);
  ok('config.environment honored', calls.init[0].environment === 'test');
  ok('tracesSampleRate hard-coded to 0', calls.init[0].tracesSampleRate === 0);
  ok('beforeSend wired', typeof calls.init[0].beforeSend === 'function');
  ok('isInitialized true after init', sentry.isInitialized() === true);
}

// --- 3. idempotent init ----------------------------------------------------
{
  sentry._resetForTests();
  const { mock, calls } = makeMockSentry();
  sentry.initSentry({ dsn: 'https://x@x/1', sentryLib: mock });
  sentry.initSentry({ dsn: 'https://x@x/1', sentryLib: mock });
  sentry.initSentry({ dsn: 'https://x@x/1', sentryLib: mock });
  ok('Sentry.init called exactly once across 3 initSentry calls', calls.init.length === 1);
}

// --- 4. captureError with scope -------------------------------------------
{
  sentry._resetForTests();
  const { mock, calls } = makeMockSentry();
  sentry.initSentry({ dsn: 'https://x@x/1', sentryLib: mock });
  const err = new Error('boom');
  const out = sentry.captureError(err, {
    tags: { script: 'autofix' },
    extra: { issueId: '123' },
    level: 'error',
    user: { id: 'graham' },
  });
  ok('captureError returns true when initialized', out === true);
  ok('captureException called once', calls.captureException.length === 1);
  ok('captureException received the same error ref', calls.captureException[0] === err);
  ok('withScope used', calls.withScope.length === 1);
  const opKinds = calls.scopeOps.map((x) => x[0]);
  ok('scope.setTags called', opKinds.includes('tags'));
  ok('scope.setExtras called', opKinds.includes('extras'));
  ok('scope.setLevel called', opKinds.includes('level'));
  ok('scope.setUser called', opKinds.includes('user'));
}

// --- 5. scrubSensitive: flat keys ------------------------------------------
{
  const input = {
    safe: 'keep',
    SENTRY_AUTH_TOKEN: 'tok-xxx',
    IBKR_ACCOUNT_ID: 'U25624150',
    IBKR_USERNAME: 'glancashire',
    MAILGUN_RECIPIENT: 'lancashire@swift.ch',
    OPENCLAW_APPROVAL_SAFEWORD: 'shortseller',
    OPENCLAW_APPROVAL_PIN: '8755',
    api_key: 'k',
    auth_token: 'a',
    user_password: 'p',
  };
  const out = sentry.scrubSensitive(input);
  ok('non-sensitive key kept', out.safe === 'keep');
  ok('SENTRY_AUTH_TOKEN scrubbed', out.SENTRY_AUTH_TOKEN === '[REDACTED]');
  ok('IBKR_ACCOUNT_ID scrubbed', out.IBKR_ACCOUNT_ID === '[REDACTED]');
  ok('IBKR_USERNAME scrubbed', out.IBKR_USERNAME === '[REDACTED]');
  ok('MAILGUN_RECIPIENT scrubbed', out.MAILGUN_RECIPIENT === '[REDACTED]');
  ok('OPENCLAW_APPROVAL_SAFEWORD scrubbed', out.OPENCLAW_APPROVAL_SAFEWORD === '[REDACTED]');
  ok('OPENCLAW_APPROVAL_PIN scrubbed', out.OPENCLAW_APPROVAL_PIN === '[REDACTED]');
  ok('generic api_key scrubbed', out.api_key === '[REDACTED]');
  ok('generic auth_token scrubbed', out.auth_token === '[REDACTED]');
  ok('generic password key scrubbed', out.user_password === '[REDACTED]');
}

// --- 6. scrubSensitive: nested + arrays + request shape -------------------
{
  const evt = {
    extra: { ok: 1, SENTRY_AUTH_TOKEN: 'leaked' },
    tags: { env: 'prod', api_key: 'leaked' },
    contexts: { runtime: { name: 'node', secret: 'leaked' } },
    request: {
      headers: { 'X-Token': 'leaked', 'X-Trace': 'safe', authorization: 'Bearer x' },
      env: { MAILGUN_RECIPIENT: 'graham@example.com', NODE_ENV: 'production' },
      cookies: { session_token: 'leaked', flavor: 'oatmeal' },
    },
    breadcrumbs: [{ message: 'ok', data: { password: 'pw', other: 'kept' } }],
  };
  sentry.defaultBeforeSend(evt);
  ok('event.extra scrubbed', evt.extra.SENTRY_AUTH_TOKEN === '[REDACTED]' && evt.extra.ok === 1);
  ok('event.tags scrubbed', evt.tags.api_key === '[REDACTED]' && evt.tags.env === 'prod');
  ok('event.contexts deep scrubbed', evt.contexts.runtime.secret === '[REDACTED]' && evt.contexts.runtime.name === 'node');
  ok('headers X-Token scrubbed', evt.request.headers['X-Token'] === '[REDACTED]');
  ok('headers X-Trace kept', evt.request.headers['X-Trace'] === 'safe');
  ok('headers authorization scrubbed', evt.request.headers.authorization === '[REDACTED]');
  ok('request.env recipient scrubbed', evt.request.env.MAILGUN_RECIPIENT === '[REDACTED]');
  ok('request.env NODE_ENV kept', evt.request.env.NODE_ENV === 'production');
  ok('cookies session_token scrubbed', evt.request.cookies.session_token === '[REDACTED]');
}

// --- 7. composed beforeSend (user hook runs after default scrub) ----------
{
  sentry._resetForTests();
  const { mock, calls } = makeMockSentry();
  const userHookEvents = [];
  sentry.initSentry({
    dsn: 'https://x@x/1',
    sentryLib: mock,
    beforeSend: (event) => {
      userHookEvents.push(JSON.parse(JSON.stringify(event)));
      event.userMutated = true;
      return event;
    },
  });
  const composed = calls.init[0].beforeSend;
  const fakeEvent = {
    extra: { SENTRY_AUTH_TOKEN: 'leak', ok: 1 },
  };
  const finalEvent = composed(fakeEvent, {});
  ok('user hook saw event AFTER scrub', userHookEvents[0].extra.SENTRY_AUTH_TOKEN === '[REDACTED]');
  ok('user hook mutation applied', finalEvent.userMutated === true);
}

// --- 8. circular refs do not blow up --------------------------------------
{
  const a = { name: 'a', SENTRY_AUTH_TOKEN: 'leak' };
  a.self = a;
  const out = sentry.scrubSensitive(a);
  ok('circular ref handled', out.SENTRY_AUTH_TOKEN === '[REDACTED]' && out.self === a);
}

// --- 9. missing @sentry/node is soft-fail ---------------------------------
{
  // Force the require('@sentry/node') path by passing no sentryLib but stubbing module cache.
  // Easiest: pass a sentryLib that explodes on init to ensure we don't double-init,
  // and verify graceful handling when require itself fails. We can't truly remove a
  // module from the registry mid-test, so cover the soft-fail by injecting a thrower
  // through the documented opts.sentryLib param.
  sentry._resetForTests();
  const exploder = {
    init() { throw new Error('init exploded'); },
  };
  let threw = null;
  try {
    sentry.initSentry({ dsn: 'https://x@x/1', sentryLib: exploder });
  } catch (e) {
    threw = e;
  }
  // We document init exceptions as bubbling up — caller's choice. Verify that's the
  // current behavior so future regressions are visible.
  ok('init exception bubbles (documented)', threw && /init exploded/.test(threw.message));
  ok('isInitialized stays false on init failure', sentry.isInitialized() === false);
}

console.log(`\nsentry tests: ${asserted} assertions passed`);
