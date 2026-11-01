import { timeWindow } from './timelineTime.js';

const DAY = 86400000;
const MONTHS = { month: 1, year: 12, decade: 120, century: 1200,
  millennium: 12000, tenMillennia: 120000 };
const APPROX_DAYS = { day: 1, week: 7, month: 30.436875, year: 365.2425,
  decade: 3652.425, century: 36524.25, millennium: 365242.5, tenMillennia: 3652425 };

function civilUtc(year, month, day, hour = 0, minute = 0, second = 0) {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, 0);
  return date.getTime();
}

function localParts(timestamp, formatter) {
  if (new Date(timestamp).getUTCFullYear() <= 0) {
    const date = new Date(timestamp);
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1,
      day: date.getUTCDate(), hour: date.getUTCHours(), minute: date.getUTCMinutes(),
      second: date.getUTCSeconds() };
  }
  const parts = Object.fromEntries(formatter.formatToParts(new Date(timestamp))
    .filter(part => ['year', 'month', 'day', 'hour', 'minute', 'second'].includes(part.type))
    .map(part => [part.type, Number(part.value)]));
  return parts;
}

function localStart(year, month, day, zone, formatter) {
  const target = civilUtc(year, month, day);
  // Astronomical negative years are only drawn as unlabeled guides; do not
  // present a calendar year zero as an historical year.
  if (year <= 0 || zone === 'UTC') return target;
  let instant = target;
  for (let attempt = 0; attempt < 4; attempt++) {
    const parts = localParts(instant, formatter);
    const difference = target - civilUtc(parts.year, parts.month, parts.day, parts.hour, parts.minute, parts.second);
    instant += difference;
    if (!difference) break;
  }
  return instant;
}

function niceInterval(minimum) {
  const power = 10 ** Math.floor(Math.log10(Math.max(1, minimum)));
  return [1, 2, 5, 10].map(value => value * power).find(value => value >= minimum);
}

function labelFor(scale, year, month, day, first) {
  if (year <= 0) return null;
  if (scale === 'day' || scale === 'week')
    return new Date(civilUtc(year, month, day)).toLocaleDateString('fr-FR', {
      timeZone: 'UTC', day: 'numeric', month: 'short', ...(first || month === 1 ? { year: 'numeric' } : {}),
    });
  if (scale === 'month') {
    const name = new Date(civilUtc(year, month, 1)).toLocaleDateString('fr-FR', { timeZone: 'UTC', month: 'short' });
    return first || month === 1 ? `${name} ${year}` : name;
  }
  return String(year);
}

export function calendarTicks(reference, scale, multiplier = 1, axisHeight = 600, zone = 'UTC') {
  const period = timeWindow(reference, scale, multiplier);
  const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: zone,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    second: '2-digit', hourCycle: 'h23' });
  const maximum = Math.max(2, Math.min(6, Math.floor(axisHeight / 85)));
  const interval = niceInterval(period.duration / DAY / APPROX_DAYS[scale] / maximum);
  const start = localParts(period.start, formatter);
  const end = localParts(period.end, formatter);
  const ticks = [];
  const add = (year, month, day) => {
    const instant = localStart(year, month, day, zone, formatter);
    if (instant <= period.start || instant >= period.end) return;
    ticks.push({ top: (period.end - instant) / period.duration * 100,
      label: labelFor(scale, year, month, day, ticks.length === 0) });
  };

  if (scale === 'day' || scale === 'week') {
    const startDay = Math.floor(civilUtc(start.year, start.month, start.day) / DAY);
    const endDay = Math.floor(civilUtc(end.year, end.month, end.day) / DAY);
    const step = (scale === 'week' ? 7 : 1) * interval;
    const mondayOffset = scale === 'week' ? 3 : 0; // 1970-01-01 was a Thursday.
    for (let index = Math.ceil((startDay + mondayOffset) / step) * step - mondayOffset;
      index <= endDay && ticks.length < maximum; index += step) {
      const date = new Date(index * DAY);
      add(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
    }
  } else {
    const step = MONTHS[scale] * interval;
    const startMonth = start.year * 12 + start.month - 1;
    const endMonth = end.year * 12 + end.month - 1;
    for (let index = Math.ceil(startMonth / step) * step;
      index <= endMonth && ticks.length < maximum; index += step) {
      const year = Math.floor(index / 12);
      const month = index - year * 12 + 1;
      add(year, month, 1);
    }
  }
  return ticks;
}
