const pad = (value) => String(value).padStart(2, '0');

function formatDateKey(date) {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`;
}

function formatTimeKey(date) {
  return `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}`;
}

/**
 * Parse IBKR tradingHours/liquidHours raw string into structured segments.
 *
 * IBKR returns semi-colon separated segments. Each segment is one of:
 *   - "YYYYMMDD:CLOSED"
 *   - "YYYYMMDD:HHMM-YYYYMMDD:HHMM"  (canonical cross-day form)
 *   - "YYYYMMDD:HHMM-HHMM"            (legacy same-day short form)
 *
 * We parse all three forms and normalize into { date, start, end, closed, raw }.
 */
function parseHoursSegments(raw = '') {
  return String(raw || '')
    .split(';')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      // Split only on the FIRST colon to separate date from the rest
      const colonIdx = segment.indexOf(':');
      if (colonIdx === -1) {
        return { date: segment || null, closed: true, raw: segment };
      }
      const date = segment.substring(0, colonIdx);
      const rest = segment.substring(colonIdx + 1);

      if (!date || !rest || rest.toUpperCase() === 'CLOSED') {
        return { date: date || null, closed: true, raw: segment };
      }

      // rest is either "HHMM-YYYYMMDD:HHMM" or "HHMM-HHMM"
      const dashIdx = rest.indexOf('-');
      if (dashIdx === -1) {
        // No dash — treat as just a start time with unknown end
        return { date, start: rest, end: null, closed: false, raw: segment };
      }

      const startPart = rest.substring(0, dashIdx);
      const endPart = rest.substring(dashIdx + 1);

      // endPart may be "YYYYMMDD:HHMM" (canonical) or just "HHMM" (short)
      let endTime;
      const endColonIdx = endPart.indexOf(':');
      if (endColonIdx > 0 && endColonIdx <= 8) {
        // Canonical form: "YYYYMMDD:HHMM" — extract the time part after colon
        endTime = endPart.substring(endColonIdx + 1);
      } else {
        // Short form: "HHMM"
        endTime = endPart;
      }

      return {
        date,
        start: startPart || null,
        end: endTime || null,
        closed: false,
        raw: segment,
      };
    });
}

/**
 * Evaluate current trading state from parsed segments and a timestamp.
 */
function evaluateHoursState(segments = [], now = new Date()) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return { status: 'unknown', activeDay: null, activeSegment: null, nextSegment: null };
  }

  const dateKey = formatDateKey(now);
  const timeKey = formatTimeKey(now);
  const sameDay = segments.filter((segment) => segment.date === dateKey);
  const dayEntry = sameDay[0] || null;

  if (!dayEntry) {
    // Today not present in segments at all — could be a holiday gap or weekend
    const nextSegment = segments.find((segment) => !segment.closed && segment.date > dateKey) || null;
    const prevSegment = [...segments].reverse().find((segment) => segment.date < dateKey) || null;
    // If we have both past and future segments but today is missing, it's likely a holiday
    if (prevSegment && nextSegment) {
      return { status: 'closed', activeDay: null, activeSegment: null, nextSegment };
    }
    return { status: 'unknown', activeDay: null, activeSegment: null, nextSegment };
  }

  if (dayEntry.closed) {
    return { status: 'closed', activeDay: dayEntry, activeSegment: null, nextSegment: null };
  }

  const openSegment = sameDay.find((segment) => !segment.closed && segment.start && segment.end) || null;
  if (!openSegment) {
    return { status: 'unknown', activeDay: dayEntry, activeSegment: null, nextSegment: null };
  }

  if (timeKey < openSegment.start) {
    return { status: 'before_open', activeDay: dayEntry, activeSegment: null, nextSegment: openSegment };
  }
  if (timeKey > openSegment.end) {
    return { status: 'after_close', activeDay: dayEntry, activeSegment: openSegment, nextSegment: null };
  }
  return { status: 'open', activeDay: dayEntry, activeSegment: openSegment, nextSegment: null };
}

/**
 * Determine the todayStatus for an instrument given its parsed segments.
 * Returns one of: open | closed_holiday | closed_weekend | pre_market | post_market | unknown
 */
function deriveTodayStatus(tradingSegments = [], liquidSegments = [], now = new Date()) {
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 6=Sat
  const dateKey = formatDateKey(now);

  // Weekend check
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 'closed_weekend';
  }

  // Check if today is explicitly marked CLOSED in trading hours
  const tradingToday = tradingSegments.filter((s) => s.date === dateKey);
  if (tradingToday.length > 0 && tradingToday.every((s) => s.closed)) {
    return 'closed_holiday';
  }

  // Check if today is missing entirely from trading segments (gap = holiday)
  if (tradingToday.length === 0 && tradingSegments.length > 0) {
    const hasPast = tradingSegments.some((s) => s.date && s.date < dateKey);
    const hasFuture = tradingSegments.some((s) => s.date && s.date > dateKey);
    if (hasPast && hasFuture) {
      return 'closed_holiday';
    }
    // If only future segments exist (e.g., today is before range), unknown
    return 'unknown';
  }

  // Today has trading segments — evaluate liquid hours state
  const liquidState = evaluateHoursState(liquidSegments, now);
  if (liquidState.status === 'open') return 'open';
  if (liquidState.status === 'before_open') return 'pre_market';
  if (liquidState.status === 'after_close') return 'post_market';

  // Fall back to trading hours state
  const tradingState = evaluateHoursState(tradingSegments, now);
  if (tradingState.status === 'open') return 'open';
  if (tradingState.status === 'before_open') return 'pre_market';
  if (tradingState.status === 'after_close') return 'post_market';
  if (tradingState.status === 'closed') return 'closed_holiday';

  return 'unknown';
}

/**
 * Extract holidays (YYYY-MM-DD) from parsed segments.
 * Includes both explicit CLOSED markers and inferred gaps between trading days.
 */
function extractHolidays(segments = []) {
  const holidays = new Set();
  if (!Array.isArray(segments) || segments.length === 0) return [];

  // Explicit CLOSED days
  for (const seg of segments) {
    if (seg.closed && seg.date && /^\d{8}$/.test(seg.date)) {
      holidays.add(formatIsoDate(seg.date));
    }
  }

  // Infer gaps: find missing weekdays between min and max dates in segments
  const dates = segments
    .map((s) => s.date)
    .filter((d) => d && /^\d{8}$/.test(d))
    .sort();
  if (dates.length >= 2) {
    const minDate = dates[0];
    const maxDate = dates[dates.length - 1];
    const presentDates = new Set(dates);
    let cursor = new Date(Date.UTC(
      Number(minDate.substring(0, 4)),
      Number(minDate.substring(4, 6)) - 1,
      Number(minDate.substring(6, 8))
    ));
    const end = new Date(Date.UTC(
      Number(maxDate.substring(0, 4)),
      Number(maxDate.substring(4, 6)) - 1,
      Number(maxDate.substring(6, 8))
    ));
    while (cursor <= end) {
      const dow = cursor.getUTCDay();
      if (dow !== 0 && dow !== 6) { // weekday
        const key = formatDateKey(cursor);
        if (!presentDates.has(key)) {
          holidays.add(formatIsoDate(key));
        }
      }
      cursor = new Date(cursor.getTime() + 86400000);
    }
  }

  return [...holidays].sort();
}

function formatIsoDate(yyyymmdd) {
  return `${yyyymmdd.substring(0, 4)}-${yyyymmdd.substring(4, 6)}-${yyyymmdd.substring(6, 8)}`;
}

module.exports = {
  formatDateKey,
  formatTimeKey,
  parseHoursSegments,
  evaluateHoursState,
  deriveTodayStatus,
  extractHolidays,
  formatIsoDate,
};
