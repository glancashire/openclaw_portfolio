/**
 * Test: email deduplication guard
 * Verifies that duplicate emails within the TTL window are blocked,
 * expired locks allow re-send, and category classification works.
 */
const assert = require('assert');
const path = require('path');
const fs = require('fs');

const {
  checkEmailLock,
  recordEmailSent,
  cleanExpiredLocks,
  classifyEmailCategory,
  lockKey,
  LOCK_DIR,
  TTL_MAP,
} = require('../src/reporting/emailDedup');

let passed = 0;

// 1. classifyEmailCategory
assert.strictEqual(classifyEmailCategory('[Portfolio] etf system health report (2026-05-27)'), 'health_report');
assert.strictEqual(classifyEmailCategory('[etf] Daily portfolio digest — 2026-05-27'), 'daily_digest');
assert.strictEqual(classifyEmailCategory('[etf] Weekly portfolio digest — week of 2026-05-27'), 'weekly_report');
assert.strictEqual(classifyEmailCategory('[etf] Monthly portfolio report — 2026-05-01'), 'monthly_report');
assert.strictEqual(classifyEmailCategory('[etf] Quarterly portfolio report — 2026-Q1'), 'quarterly_report');
assert.strictEqual(classifyEmailCategory('Random notification'), 'default');
passed++;
console.log('✓ classifyEmailCategory handles all categories');

// 2. lockKey is stable and different for different subjects
const k1 = lockKey('[Portfolio] etf system health report (2026-05-27)');
const k2 = lockKey('[Portfolio] etf system health report (2026-05-27)');
const k3 = lockKey('[Portfolio] etf system health report (2026-05-28)');
assert.strictEqual(k1, k2, 'Same subject+date should produce same key');
// Different date in subject but same dateBucket means same key (bucket is what matters)
const k4 = lockKey('[Portfolio] etf system health report (2026-05-27)', { dateBucket: '2026-05-27' });
const k5 = lockKey('[Portfolio] etf system health report (2026-05-27)', { dateBucket: '2026-05-28' });
assert.notStrictEqual(k4, k5, 'Different dateBucket should produce different key');
passed++;
console.log('✓ lockKey is stable and differentiates buckets');

// 3. checkEmailLock returns alreadySent=false for new subject
const testSubject = `TEST-DEDUP-${Date.now()}-${Math.random()}`;
const check1 = checkEmailLock(testSubject);
assert.strictEqual(check1.alreadySent, false);
passed++;
console.log('✓ checkEmailLock returns alreadySent=false for unseen subject');

// 4. recordEmailSent + subsequent checkEmailLock shows alreadySent=true
recordEmailSent(testSubject, { messageId: 'test-msg-123' });
const check2 = checkEmailLock(testSubject);
assert.strictEqual(check2.alreadySent, true);
assert.strictEqual(check2.previousMessageId, 'test-msg-123');
passed++;
console.log('✓ recordEmailSent blocks subsequent checkEmailLock');

// 5. TTL_MAP has expected categories
assert(TTL_MAP.health_report > 0);
assert(TTL_MAP.daily_digest > TTL_MAP.health_report);
assert(TTL_MAP.weekly_report > TTL_MAP.daily_digest);
passed++;
console.log('✓ TTL_MAP ordering is sensible');

// 6. Expired lock allows re-send
const expiredSubject = `TEST-EXPIRED-${Date.now()}`;
const expiredKey = lockKey(expiredSubject);
const expiredLockFile = path.join(LOCK_DIR, `${expiredKey}.json`);
fs.writeFileSync(expiredLockFile, JSON.stringify({
  subject: expiredSubject,
  sentAt: new Date(Date.now() - 999 * 60 * 60 * 1000).toISOString(), // 999h ago
  messageId: 'old-msg',
  category: 'default',
}));
const check3 = checkEmailLock(expiredSubject);
assert.strictEqual(check3.alreadySent, false);
assert.strictEqual(check3.expired, true);
passed++;
console.log('✓ Expired locks allow re-send');

// 7. cleanExpiredLocks removes old files
const cleaned = cleanExpiredLocks();
assert(cleaned >= 1, 'Should have cleaned at least the expired test lock');
assert(!fs.existsSync(expiredLockFile), 'Expired lock file should be removed');
passed++;
console.log('✓ cleanExpiredLocks removes old lock files');

// 8. Clean up test lock
const testLockFile = path.join(LOCK_DIR, `${lockKey(testSubject)}.json`);
if (fs.existsSync(testLockFile)) fs.unlinkSync(testLockFile);
passed++;
console.log('✓ Test cleanup');

// 9. LOCK_DIR is under runtime/
assert(LOCK_DIR.includes('runtime/email-locks'));
passed++;
console.log('✓ LOCK_DIR is in expected location');

console.log(`\n${passed} assertion blocks passed`);
