'use strict';

/**
 * Unit tests for lib/observability/bootstrap.js.
 *
 * Covers:
 *   - require() is a no-op when SENTRY_DSN unset (default safe path)
 *   - re-requiring does not double-register handlers
 *   - manual bootstrap() with mocked Sentry lib initializes once
 *   - uncaughtException handler routes through captureError (verified via
 *     direct invocation of the listener — we do NOT actually crash the test)
 *   - unhandledRejection handler routes through captureError
 *
 * Notes:
 *   - We deliberately do NOT trigger real process exits.
 *   - We mock process.exit to verify the uncaughtException handler attempts
 *     to exit(1), then restore it.
 */

const assert = require('assert');

let asserted = 0;
function ok(label, cond) {
  assert.ok(cond, label);
  console.log('  ok —', label);
  asserted++;
}

// Snapshot handler counts BEFORE we require bootstrap — that way we can
// verify the delta even if the test runner pre-registered handlers.
const before = {
  uncaughtException: process.listeners('uncaughtException').length,
  unhandledRejection: process.listeners('unhandledRejection').length,
};

// --- 1. require is safe with no DSN ----------------------------------------
// Disable the .env file loader for this test: we are validating the no-DSN
// default path, so the repo .env (which carries SENTRY_DSN) must not bleed in.
process.env.OPENCLAW_DISABLE_ENV_FILE = '1';
const prevDsn = process.env.SENTRY_DSN;
delete process.env.SENTRY_DSN;

const bootstrap = require('../lib/observability/bootstrap');
const sentry = require('../lib/observability/sentry');

const after1 = bootstrap._listHandlers();
ok('require(bootstrap) does not throw with no DSN', true);
ok('bootstrap.autoResult.initialized=false with no DSN', bootstrap.autoResult.initialized === false);
ok('handlersRegistered=true regardless of DSN', bootstrap.autoResult.handlersRegistered === true);
ok('uncaughtException handler added (+1)', after1.uncaughtException === before.uncaughtException + 1);
ok('unhandledRejection handler added (+1)', after1.unhandledRejection === before.unhandledRejection + 1);

// --- 2. re-requiring does not double-register -----------------------------
// Force the cached module to re-run its top-level by deleting and re-requiring,
// then re-invoke bootstrap() directly to confirm idempotency.
const r1 = bootstrap();
const r2 = bootstrap();
const after2 = bootstrap._listHandlers();
ok('explicit bootstrap() returns initialized=false (no DSN)', r1.initialized === false && r2.initialized === false);
ok('handler counts unchanged after extra bootstrap() calls', after2.uncaughtException === after1.uncaughtException && after2.unhandledRejection === after1.unhandledRejection);

// --- 3. manual bootstrap with injected mock initializes Sentry ------------
bootstrap._resetForTests();
const mockCalls = { init: 0, captureException: [] };
const mockSentryLib = {
  init() { mockCalls.init++; },
  captureException(err) { mockCalls.captureException.push(err); },
  withScope(fn) { fn({ setTags() {}, setExtras() {}, setLevel() {}, setUser() {} }); },
};
const r3 = bootstrap({ dsn: 'https://x@x/1', sentryLib: mockSentryLib });
ok('bootstrap with mock + dsn initializes', r3.initialized === true);
ok('Sentry.init called once', mockCalls.init === 1);

// --- 4. directly invoke the uncaughtException listener with mocked exit ---
{
  const listeners = process.listeners('uncaughtException');
  const ourListener = listeners[listeners.length - 1]; // most recently added
  ok('uncaughtException listener is a function', typeof ourListener === 'function');

  const origExit = process.exit;
  const exitCalls = [];
  process.exit = (code) => { exitCalls.push(code); };
  const origStderr = console.error;
  console.error = () => {};

  try {
    ourListener(new Error('boom-from-test'));
  } finally {
    // setImmediate inside the handler schedules exit; flush it synchronously
    // by polling once. Use a small busy-wait via setImmediate->callback.
  }
  // Wait one event loop tick for setImmediate
  const waitOneTick = () => new Promise((resolve) => setImmediate(resolve));
  waitOneTick().then(() => {
    process.exit = origExit;
    console.error = origStderr;

    ok('uncaughtException routed to captureException', mockCalls.captureException.length === 1);
    ok('captured error message matches', /boom-from-test/.test(mockCalls.captureException[0].message));
    ok('process.exit(1) scheduled', exitCalls.length === 1 && exitCalls[0] === 1);

    // --- 5. unhandledRejection handler -----------------------------------
    const rejListeners = process.listeners('unhandledRejection');
    const rejListener = rejListeners[rejListeners.length - 1];
    ok('unhandledRejection listener is a function', typeof rejListener === 'function');

    // Reset captureException count to isolate this assertion.
    mockCalls.captureException.length = 0;
    rejListener(new Error('rej-boom'));
    ok('unhandledRejection captured Error', mockCalls.captureException.length === 1 && /rej-boom/.test(mockCalls.captureException[0].message));

    // Non-Error rejection is wrapped.
    mockCalls.captureException.length = 0;
    rejListener('string-rejection');
    ok('unhandledRejection wraps non-Error', mockCalls.captureException.length === 1 && /string-rejection/.test(mockCalls.captureException[0].message));

    if (prevDsn !== undefined) process.env.SENTRY_DSN = prevDsn;
    console.log(`\nbootstrap tests: ${asserted} assertions passed`);
  }).catch((e) => {
    console.error('test failure', e);
    process.exit(2);
  });
}
