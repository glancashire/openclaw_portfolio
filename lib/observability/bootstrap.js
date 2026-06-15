/**
 * lib/observability/bootstrap.js
 *
 * Single-line auto-init shim. Drop
 *
 *   require('../lib/observability/bootstrap');
 *
 * at the top of an unattended entry point and you get:
 *   - Sentry initialized from env (no-op if SENTRY_DSN unset)
 *   - global uncaughtException handler that captures + rethrows
 *   - global unhandledRejection handler that captures + lets Node decide exit
 *
 * Idempotent: safe to require from many scripts. Handlers register exactly once.
 *
 * Why a shim instead of NODE_OPTIONS=-r: cron jobs on this host launch via
 * `agentTurn` payloads that invoke `node scripts/...`, and we want predictable
 * behavior without depending on environment plumbing the agent doesn't control.
 */

'use strict';

// Load .env before anything reads process.env. Unattended entry points (Sentry
// cron, etc.) require this shim; cron agentTurn runs `node scripts/...` without
// `.env` exported, so without this the Sentry vars are empty and the weekly
// autofix silently no-ops. Non-destructive: real env always wins over the file.
try { require('../loadEnvFile')(); } catch (_) { /* never let env loading crash bootstrap */ }

const sentry = require('./sentry');

let _handlersRegistered = false;

function _registerHandlersOnce() {
  if (_handlersRegistered) return;
  _handlersRegistered = true;

  process.on('uncaughtException', (err) => {
    try {
      sentry.captureError(err, { tags: { handler: 'uncaughtException' }, level: 'fatal' });
    } catch (_inner) {
      // never let the error path itself crash the process worse than it already is
    }
    // Match Node default behavior: print + exit non-zero. Give Sentry a
    // short flush window via setImmediate so the event has a chance to ship.
    if (process.env.SENTRY_DEBUG === '1') {
      console.error('[sentry-bootstrap] uncaughtException captured:', err && err.stack);
    } else {
      console.error(err && err.stack ? err.stack : err);
    }
    setImmediate(() => process.exit(1));
  });

  process.on('unhandledRejection', (reason /* , promise */) => {
    try {
      const err = reason instanceof Error ? reason : new Error(String(reason));
      sentry.captureError(err, { tags: { handler: 'unhandledRejection' }, level: 'error' });
    } catch (_inner) {
      // swallow
    }
    if (process.env.SENTRY_DEBUG === '1') {
      console.error('[sentry-bootstrap] unhandledRejection captured:', reason);
    }
    // Do NOT call process.exit here. Node's default in current versions is
    // to terminate, and other code may register its own handler. Let the
    // normal pipeline decide.
  });
}

/**
 * bootstrap — main entry. Initializes Sentry (best-effort, may no-op) and
 * registers global handlers exactly once.
 */
function bootstrap(opts) {
  sentry.initSentry(opts);
  _registerHandlersOnce();
  return {
    initialized: sentry.isInitialized(),
    handlersRegistered: _handlersRegistered,
  };
}

// Auto-run on require so the canonical use is a single `require(...)` line.
const _autoResult = bootstrap();

function _resetForTests() {
  _handlersRegistered = false;
  sentry._resetForTests();
  // Note: this does NOT detach handlers from `process` — tests must use the
  // exported _listHandlers() helper to verify counts before reset.
}

function _listHandlers() {
  return {
    uncaughtException: process.listeners('uncaughtException').length,
    unhandledRejection: process.listeners('unhandledRejection').length,
  };
}

module.exports = bootstrap;
module.exports.bootstrap = bootstrap;
module.exports.autoResult = _autoResult;
module.exports._resetForTests = _resetForTests;
module.exports._listHandlers = _listHandlers;
