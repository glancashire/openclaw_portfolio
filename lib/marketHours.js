'use strict';

/**
 * Market hours utility. Determines if a given exchange is currently open.
 * All times in CET/CEST (Europe/Zurich).
 */

// Exchange schedules: [openHour, openMin, closeHour, closeMin] in CET
const EXCHANGE_HOURS = {
  EBS:    { open: [9, 0], close: [17, 30], tz: 'Europe/Zurich', days: [1,2,3,4,5] },
  IBIS2:  { open: [9, 0], close: [17, 30], tz: 'Europe/Berlin', days: [1,2,3,4,5] },
  LSEETF: { open: [9, 0], close: [17, 30], tz: 'Europe/London', days: [1,2,3,4,5] },
  SMART:  { open: [9, 0], close: [17, 30], tz: 'Europe/Zurich', days: [1,2,3,4,5] }, // default to Swiss hours
};

/**
 * Get current time in a given timezone.
 */
function nowInTz(tz) {
  const str = new Date().toLocaleString('en-US', { timeZone: tz });
  return new Date(str);
}

/**
 * Convert a Date to { day, hours, minutes } in a given timezone.
 */
function datePartsInTz(date, tz) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    weekday: 'short', hour: 'numeric', minute: 'numeric', year: 'numeric', month: 'numeric', day: 'numeric'
  }).formatToParts(date);
  const get = (type) => parts.find(p => p.type === type)?.value;
  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    day: dayMap[get('weekday')] ?? new Date(get('year'), get('month') - 1, get('day')).getDay(),
    hours: parseInt(get('hour'), 10),
    minutes: parseInt(get('minute'), 10),
  };
}

/**
 * Check if a given exchange is currently open.
 * @param {string} exchange - Exchange code (EBS, IBIS2, LSEETF, SMART)
 * @param {Date} [now] - Override current time for testing (any timezone, will be converted)
 * @returns {{ open: boolean, reason: string }}
 */
function isMarketOpen(exchange = 'EBS', now) {
  const schedule = EXCHANGE_HOURS[exchange] || EXCHANGE_HOURS.SMART;
  const refTime = now || new Date();
  const local = datePartsInTz(refTime, schedule.tz);

  const day = local.day;
  if (!schedule.days.includes(day)) {
    return { open: false, reason: `Weekend (day ${day})` };
  }

  const h = local.hours;
  const m = local.minutes;
  const currentMinutes = h * 60 + m;
  const openMinutes = schedule.open[0] * 60 + schedule.open[1];
  const closeMinutes = schedule.close[0] * 60 + schedule.close[1];

  if (currentMinutes < openMinutes) {
    return { open: false, reason: `Before open (${schedule.open[0]}:${String(schedule.open[1]).padStart(2,'0')})` };
  }
  if (currentMinutes >= closeMinutes) {
    return { open: false, reason: `After close (${schedule.close[0]}:${String(schedule.close[1]).padStart(2,'0')})` };
  }

  return { open: true, reason: 'Market is open' };
}

/**
 * Get the next market open time as ISO string.
 * @param {string} exchange
 * @returns {string} ISO timestamp of next open
 */
function nextOpenTime(exchange = 'EBS') {
  const schedule = EXCHANGE_HOURS[exchange] || EXCHANGE_HOURS.SMART;
  const localNow = nowInTz(schedule.tz);

  let candidate = new Date(localNow);
  candidate.setHours(schedule.open[0], schedule.open[1], 0, 0);

  // If we're past today's open, move to tomorrow
  if (candidate <= localNow) {
    candidate.setDate(candidate.getDate() + 1);
  }

  // Skip weekends
  while (!schedule.days.includes(candidate.getDay())) {
    candidate.setDate(candidate.getDate() + 1);
  }

  return candidate.toISOString();
}

module.exports = { isMarketOpen, nextOpenTime, EXCHANGE_HOURS };
