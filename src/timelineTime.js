const DAY = 24 * 60 * 60 * 1000;

// Calendar arithmetic keeps months and years meaningful at every scale.
export function shiftTime(reference, scale, steps) {
  const date = new Date(reference);
  if (scale === 'hour') date.setUTCHours(date.getUTCHours() + steps);
  else if (scale === 'day') date.setUTCDate(date.getUTCDate() + steps);
  else if (scale === 'week') date.setUTCDate(date.getUTCDate() + 7 * steps);
  else {
    const months = steps * ({ month: 1, year: 12, decade: 120, century: 1200,
      millennium: 12000, tenMillennia: 120000 }[scale]);
    if (!Number.isFinite(months)) throw new Error(`Unknown time scale: ${scale}`);
    const dayOfMonth = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + months);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(dayOfMonth, lastDay));
  }
  return date.getTime();
}

export function timeWindow(reference, scale, multiplier = 1) {
  if (!Number.isInteger(multiplier) || multiplier < 1 || multiplier > 9)
    throw new RangeError('Timeline multiplier must be an integer from 1 to 9.');
  const start = shiftTime(reference, scale, -multiplier);
  return { start, end: reference, duration: reference - start };
}

// A date without a time describes the calendar day, never an invented instant.
export function itemInterval(item) {
  const first = item.begin_of_begin || item.end_of_begin || item.begin_of_end || item.end_of_end;
  const last = item.end_of_end || item.begin_of_end || item.end_of_begin || item.begin_of_begin;
  if (!first || !last) return null;
  return {
    first: Date.parse(`${first}T00:00:00Z`),
    last: Date.parse(`${last}T00:00:00Z`) + DAY,
  };
}

export function placeItem(item, reference, scale, multiplier = 1) {
  // The current model has day precision. Hourly positioning would fabricate a time.
  if (scale === 'hour') return null;
  const interval = itemInterval(item);
  const window = timeWindow(reference, scale, multiplier);
  if (!interval || interval.first > window.end || interval.last <= window.start) return null;
  const top = (window.end - Math.min(window.end, interval.last)) / window.duration * 100;
  const bottom = (window.end - Math.max(window.start, interval.first)) / window.duration * 100;
  return { top, height: Math.max(0, bottom - top) };
}

// Historical dates have day precision. Recorded instants retain their real time.
export function placeTimelineEntry(entry, reference, scale, multiplier = 1) {
  if (entry.time_axis === 'historical') {
    const bounds = entry.historical_time_span;
    const firstKey = ['begin_of_begin', 'end_of_begin', 'begin_of_end', 'end_of_end'].find(key => bounds[key]);
    const lastKey = ['end_of_end', 'begin_of_end', 'end_of_begin', 'begin_of_begin'].find(key => bounds[key]);
    if (!firstKey || !lastKey) return null;
    const instants = entry.historical_instants || {};
    if (scale === 'hour' && (!instants[firstKey] || !instants[lastKey])) return null;
    if (!entry.historical_day_limits) return placeItem(bounds, reference, scale, multiplier);
    const first = Date.parse(instants[firstKey] || entry.historical_day_limits[firstKey].start);
    const last = Date.parse(instants[lastKey] || entry.historical_day_limits[lastKey].end);
    const window = timeWindow(reference, scale, multiplier);
    if (first > window.end || last < window.start) return null;
    const top = (window.end - Math.min(window.end, last)) / window.duration * 100;
    const bottom = (window.end - Math.max(window.start, first)) / window.duration * 100;
    return { top, height: Math.max(0.5, bottom - top) };
  }
  const timestamp = Date.parse(entry.timestamp);
  const window = timeWindow(reference, scale, multiplier);
  if (!Number.isFinite(timestamp) || timestamp > window.end || timestamp < window.start) return null;
  return { top: (window.end - timestamp) / window.duration * 100, height: 0.5 };
}
