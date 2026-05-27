/**
 * Email deduplication guard.
 *
 * Prevents the same email (identified by subject + date bucket) from being
 * sent more than once within a configurable window. This protects against
 * cron agent retries that re-invoke send scripts multiple times in a single
 * session turn.
 *
 * Lock files are stored in runtime/email-locks/ and auto-expire after the
 * configured TTL (default: 4 hours for health reports, 20 hours for digests).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LOCK_DIR = path.join(__dirname, '..', 'runtime', 'email-locks');

// Default TTL per email category (ms)
const TTL_MAP = {
  health_report: 4 * 60 * 60 * 1000,   // 4h (health runs 3×/day at 6h intervals)
  daily_digest: 20 * 60 * 60 * 1000,    // 20h
  weekly_report: 6 * 24 * 60 * 60 * 1000, // 6 days
  monthly_report: 25 * 24 * 60 * 60 * 1000, // 25 days
  quarterly_report: 80 * 24 * 60 * 60 * 1000, // 80 days
  default: 4 * 60 * 60 * 1000,
};

/**
 * Classify an email subject into a dedup category.
 */
function classifyEmailCategory(subject = '') {
  const s = subject.toLowerCase();
  if (s.includes('health report')) return 'health_report';
  if (s.includes('daily') && (s.includes('digest') || s.includes('portfolio'))) return 'daily_digest';
  if (s.includes('weekly')) return 'weekly_report';
  if (s.includes('monthly')) return 'monthly_report';
  if (s.includes('quarterly')) return 'quarterly_report';
  return 'default';
}

/**
 * Build a stable lock key from subject + date bucket.
 */
function lockKey(subject, { dateBucket } = {}) {
  const bucket = dateBucket || new Date().toISOString().slice(0, 10);
  const hash = crypto.createHash('sha256').update(`${subject}::${bucket}`).digest('hex').slice(0, 16);
  return hash;
}

/**
 * Ensure lock directory exists.
 */
function ensureLockDir() {
  if (!fs.existsSync(LOCK_DIR)) {
    fs.mkdirSync(LOCK_DIR, { recursive: true });
  }
}

/**
 * Check if an email with this subject has already been sent within the TTL window.
 * Returns { alreadySent: boolean, lockFile, sentAt?, category, ttlMs }
 */
function checkEmailLock(subject, { dateBucket } = {}) {
  const category = classifyEmailCategory(subject);
  const ttlMs = TTL_MAP[category] || TTL_MAP.default;
  const key = lockKey(subject, { dateBucket });
  const lockFile = path.join(LOCK_DIR, `${key}.json`);

  ensureLockDir();

  if (!fs.existsSync(lockFile)) {
    return { alreadySent: false, lockFile, category, ttlMs };
  }

  try {
    const data = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
    const sentAt = new Date(data.sentAt).getTime();
    const now = Date.now();
    if (now - sentAt < ttlMs) {
      return { alreadySent: true, lockFile, sentAt: data.sentAt, category, ttlMs, previousMessageId: data.messageId };
    }
    // Expired — allow re-send
    return { alreadySent: false, lockFile, category, ttlMs, expired: true };
  } catch {
    // Corrupt lock file — allow send
    return { alreadySent: false, lockFile, category, ttlMs };
  }
}

/**
 * Record that an email was sent (write the lock file).
 */
function recordEmailSent(subject, { dateBucket, messageId } = {}) {
  const key = lockKey(subject, { dateBucket });
  const lockFile = path.join(LOCK_DIR, `${key}.json`);

  ensureLockDir();

  const data = {
    subject,
    sentAt: new Date().toISOString(),
    messageId: messageId || null,
    category: classifyEmailCategory(subject),
  };
  fs.writeFileSync(lockFile, JSON.stringify(data, null, 2));
  return lockFile;
}

/**
 * Clean up expired lock files (call periodically or on startup).
 */
function cleanExpiredLocks() {
  ensureLockDir();
  const now = Date.now();
  let cleaned = 0;

  for (const file of fs.readdirSync(LOCK_DIR)) {
    if (!file.endsWith('.json')) continue;
    const fp = path.join(LOCK_DIR, file);
    try {
      const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
      const sentAt = new Date(data.sentAt).getTime();
      const category = data.category || 'default';
      const ttl = TTL_MAP[category] || TTL_MAP.default;
      if (now - sentAt > ttl) {
        fs.unlinkSync(fp);
        cleaned++;
      }
    } catch {
      // Remove corrupt files
      fs.unlinkSync(fp);
      cleaned++;
    }
  }
  return cleaned;
}

module.exports = {
  checkEmailLock,
  recordEmailSent,
  cleanExpiredLocks,
  classifyEmailCategory,
  lockKey,
  LOCK_DIR,
  TTL_MAP,
};
