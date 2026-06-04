/**
 * lib/observability/sentry.js
 *
 * Thin wrapper around @sentry/node. No-ops cleanly when SENTRY_DSN is empty,
 * which is the default for dev/test/CI. Real instrumentation only kicks in
 * when the workspace .env has SENTRY_DSN set.
 *
 * Public API:
 *   initSentry(opts?)         — idempotent; safe to call multiple times.
 *   captureError(err, ctx?)   — alias for Sentry.captureException with context.
 *   isInitialized()           — boolean, primarily for tests.
 *   _resetForTests()          — testing hook.
 *
 * Safety:
 *   - tracesSampleRate is hard-coded to 0 (errors only, no perf quota burn).
 *   - beforeSend scrubs known sensitive env keys before any event leaves the
 *     process: SENTRY_AUTH_TOKEN, IBKR_ACCOUNT_ID, IBKR_USERNAME,
 *     MAILGUN_RECIPIENT, OPENCLAW_APPROVAL_SAFEWORD, OPENCLAW_APPROVAL_PIN.
 *   - Sentry is loaded lazily so requiring this module doesn't drag the
 *     SDK into scripts that don't need it.
 */

'use strict';

const SENSITIVE_KEY_PATTERNS = [
  /^SENTRY_AUTH_TOKEN$/i,
  /^IBKR_ACCOUNT_ID$/i,
  /^IBKR_USERNAME$/i,
  /^IBKR_PASSWORD$/i,
  /^MAILGUN_RECIPIENT$/i,
  /^MAILGUN_API_KEY$/i,
  /^OPENCLAW_APPROVAL_SAFEWORD$/i,
  /^OPENCLAW_APPROVAL_PIN$/i,
  /^authorization$/i,
  /^cookie$/i,
  /^set-cookie$/i,
  /token/i,
  /secret/i,
  /password/i,
  /api[_-]?key/i,
];

const REDACTED = '[REDACTED]';

let _initialized = false;
let _sentry = null;
let _lastInitConfig = null;

function _isSensitiveKey(key) {
  if (typeof key !== 'string') return false;
  return SENSITIVE_KEY_PATTERNS.some((re) => re.test(key));
}

/**
 * Recursively scrub sensitive keys in an arbitrary structure.
 * Mutates in place AND returns the same reference (caller convenience).
 * Skips circular refs.
 */
function scrubSensitive(obj, seen) {
  seen = seen || new WeakSet();
  if (obj === null || typeof obj !== 'object') return obj;
  if (seen.has(obj)) return obj;
  seen.add(obj);

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      if (obj[i] && typeof obj[i] === 'object') {
        scrubSensitive(obj[i], seen);
      }
    }
    return obj;
  }

  for (const key of Object.keys(obj)) {
    if (_isSensitiveKey(key)) {
      obj[key] = REDACTED;
    } else if (obj[key] && typeof obj[key] === 'object') {
      scrubSensitive(obj[key], seen);
    }
  }
  return obj;
}

/**
 * beforeSend hook passed to Sentry.init. Scrubs known sensitive keys
 * from event.extra, event.tags, event.contexts, event.request.headers,
 * and event.request.env. Returns the event (never drops events at this
 * layer — drops are configured separately via ignoreErrors).
 */
function defaultBeforeSend(event /* , hint */) {
  if (!event || typeof event !== 'object') return event;
  if (event.extra) scrubSensitive(event.extra);
  if (event.tags) scrubSensitive(event.tags);
  if (event.contexts) scrubSensitive(event.contexts);
  if (event.request) {
    if (event.request.headers) scrubSensitive(event.request.headers);
    if (event.request.env) scrubSensitive(event.request.env);
    if (event.request.cookies) scrubSensitive(event.request.cookies);
  }
  return event;
}

/**
 * initSentry — idempotent.
 * Returns true if Sentry was initialized (now or previously), false if no-op.
 *
 * Options (all optional, override env):
 *   dsn          — override SENTRY_DSN
 *   environment  — override SENTRY_ENVIRONMENT (default: 'production')
 *   release      — release tag
 *   sentryLib    — inject for tests; defaults to require('@sentry/node')
 *   beforeSend   — override the default scrubbing hook (composes if returned)
 */
function initSentry(opts) {
  opts = opts || {};
  if (_initialized) return true;

  const dsn = opts.dsn !== undefined ? opts.dsn : process.env.SENTRY_DSN;
  if (!dsn) {
    // No-op path. This is the default for dev/test/CI.
    return false;
  }

  let sentryLib = opts.sentryLib;
  if (!sentryLib) {
    try {
      // eslint-disable-next-line global-require
      sentryLib = require('@sentry/node');
    } catch (err) {
      // @sentry/node not installed — fail soft, log to stderr, do not crash host script.
      if (process.env.SENTRY_DEBUG === '1') {
        console.error('[sentry] @sentry/node not available:', err.message);
      }
      return false;
    }
  }

  const userBeforeSend = opts.beforeSend;
  const composedBeforeSend = userBeforeSend
    ? (event, hint) => {
        const scrubbed = defaultBeforeSend(event, hint);
        return userBeforeSend(scrubbed, hint);
      }
    : defaultBeforeSend;

  const config = {
    dsn,
    environment: opts.environment || process.env.SENTRY_ENVIRONMENT || 'production',
    release: opts.release || process.env.SENTRY_RELEASE || undefined,
    tracesSampleRate: 0, // errors only, no performance quota burn
    beforeSend: composedBeforeSend,
  };

  sentryLib.init(config);
  _sentry = sentryLib;
  _initialized = true;
  _lastInitConfig = config;
  return true;
}

/**
 * captureError — surfaces an error to Sentry if initialized, else no-op.
 * ctx is an optional object: { tags, extra, level, user }.
 */
function captureError(err, ctx) {
  if (!_initialized || !_sentry) return false;
  try {
    if (ctx && typeof _sentry.withScope === 'function') {
      _sentry.withScope((scope) => {
        if (ctx.tags) scope.setTags(ctx.tags);
        if (ctx.extra) scope.setExtras(ctx.extra);
        if (ctx.level) scope.setLevel(ctx.level);
        if (ctx.user) scope.setUser(ctx.user);
        _sentry.captureException(err);
      });
    } else {
      _sentry.captureException(err);
    }
    return true;
  } catch (innerErr) {
    if (process.env.SENTRY_DEBUG === '1') {
      console.error('[sentry] captureError failed:', innerErr.message);
    }
    return false;
  }
}

function isInitialized() {
  return _initialized;
}

function _resetForTests() {
  _initialized = false;
  _sentry = null;
  _lastInitConfig = null;
}

function _getLastInitConfig() {
  return _lastInitConfig;
}

module.exports = {
  initSentry,
  captureError,
  isInitialized,
  scrubSensitive,
  defaultBeforeSend,
  _resetForTests,
  _getLastInitConfig,
};
