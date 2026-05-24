const pad = (value) => String(value).padStart(2, '0');

function formatDateKey(date) {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`;
}

function formatTimeKey(date) {
  return `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}`;
}

function parseHoursSegments(raw = '') {
  return String(raw || '')
    .split(';')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const [date, hours] = segment.split(':');
      if (!date || !hours || hours.toUpperCase() === 'CLOSED') {
        return { date: date || null, closed: true, raw: segment };
      }
      const [start, end] = hours.split('-');
      return {
        date,
        start: start || null,
        end: end || null,
        closed: false,
        raw: segment,
      };
    });
}

function evaluateHoursState(segments = [], now = new Date()) {
  if (!Array.isArray(segments) || segments.length === 0) {
    return { status: 'unknown', activeDay: null, activeSegment: null, nextSegment: null };
  }

  const dateKey = formatDateKey(now);
  const timeKey = formatTimeKey(now);
  const sameDay = segments.filter((segment) => segment.date === dateKey);
  const dayEntry = sameDay[0] || null;

  if (!dayEntry) {
    const nextSegment = segments.find((segment) => !segment.closed && segment.date >= dateKey) || null;
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

module.exports = {
  formatDateKey,
  formatTimeKey,
  parseHoursSegments,
  evaluateHoursState,
};
