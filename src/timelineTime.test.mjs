import assert from 'node:assert/strict';
import test from 'node:test';
import { itemInterval, placeItem, placeTimelineEntry, shiftTime, timeWindow } from './timelineTime.js';

test('the common present stays at the top and the same item moves at different speeds', () => {
  const now = Date.parse('2026-10-26T12:00:00Z');
  const item = { begin_of_begin: '2026-10-25', end_of_end: '2026-10-25' };
  const day = placeItem(item, now, 'day');
  const week = placeItem(item, now, 'week');
  assert.equal(timeWindow(now, 'day').end, now);
  assert.equal(day.top, 50);
  assert.ok(week.top < day.top);
  const later = now + 3 * 3600000;
  assert.ok(placeItem(item, later, 'day').top - day.top > placeItem(item, later, 'week').top - week.top);
});

test('unknown, future and incomplete dates never become fabricated points', () => {
  const now = Date.parse('2026-10-26T12:00:00Z');
  assert.equal(itemInterval({}), null);
  assert.equal(placeItem({ begin_of_begin: '2026-10-27' }, now, 'day'), null);
  assert.equal(placeItem({ begin_of_begin: '2026-10-26' }, now, 'hour'), null);
  const range = placeItem({ end_of_end: '2026-10-26' }, now, 'day');
  assert.equal(range.top, 0);
  assert.equal(range.height, 50);
});

test('navigation uses real calendar boundaries rather than fixed month lengths', () => {
  const march = Date.parse('2024-03-29T12:00:00Z');
  assert.equal(new Date(shiftTime(march, 'month', -1)).toISOString(), '2024-02-29T12:00:00.000Z');
  assert.equal(new Date(shiftTime(Date.parse('2025-03-29T12:00:00Z'), 'month', -1)).toISOString(), '2025-02-28T12:00:00.000Z');
  assert.equal(timeWindow(march, 'century').end, march);
  assert.equal(new Date(shiftTime(march, 'millennium', -1)).toISOString(), '1024-03-29T12:00:00.000Z');
  assert.equal(new Date(shiftTime(march, 'tenMillennia', -1)).getUTCFullYear(), -7976);
  const reference = Date.parse('2026-10-26T12:00:00Z');
  const olderSource = { begin_of_begin: '1426-01-01', end_of_end: '1426-12-31' };
  assert.equal(placeItem(olderSource, reference, 'century'), null);
  assert.ok(placeItem(olderSource, reference, 'millennium'));
});

test('one multiplier changes every window without moving their common reference', () => {
  const reference = Date.parse('2026-03-29T12:00:00Z');
  for (const [scale, start] of [
    ['year', '2023-03-29T12:00:00.000Z'],
    ['decade', '1996-03-29T12:00:00.000Z'],
    ['century', '1726-03-29T12:00:00.000Z'],
    ['millennium', '-000974-03-29T12:00:00.000Z'],
  ]) {
    const window = timeWindow(reference, scale, 3);
    assert.equal(window.end, reference);
    assert.equal(new Date(window.start).toISOString(), start);
    assert.equal(window.duration, reference - window.start);
  }
  assert.equal(new Date(timeWindow(reference, 'month', 2).start).toISOString(), '2026-01-29T12:00:00.000Z');
  assert.equal(new Date(timeWindow(reference, 'day', 9).start).toISOString(), '2026-03-20T12:00:00.000Z');
  assert.throws(() => timeWindow(reference, 'decade', 0), RangeError);
  assert.throws(() => timeWindow(reference, 'decade', 10), RangeError);
  assert.throws(() => timeWindow(reference, 'decade', 2.5), RangeError);
});

test('widening an interval reveals older sources and consignations while preserving time precision', () => {
  const reference = Date.parse('2026-10-26T12:00:00Z');
  const source = { time_axis: 'historical', historical_time_span: {
    begin_of_begin: '2001-04-18', end_of_end: '2001-04-18',
  } };
  const recorded = { time_axis: 'recorded', timestamp: '2024-04-18T09:00:00Z' };
  assert.equal(placeTimelineEntry(source, reference, 'decade'), null);
  assert.ok(placeTimelineEntry(source, reference, 'decade', 3));
  assert.equal(placeTimelineEntry(recorded, reference, 'year'), null);
  assert.ok(placeTimelineEntry(recorded, reference, 'year', 3));
  const older = { begin_of_begin: '2001-04-18', end_of_end: '2001-04-18' };
  assert.equal(placeItem(older, reference, 'decade'), null);
  assert.ok(placeItem(older, reference, 'decade', 3));
});

test('historical source dates and precisely recorded instants use independent time axes', () => {
  const reference = Date.parse('2026-10-26T12:00:00Z');
  const source = { time_axis: 'historical', historical_time_span: {
    begin_of_begin: '2026-10-25', end_of_end: '2026-10-25',
  } };
  const recorded = { time_axis: 'recorded', timestamp: '2026-10-26T11:30:00Z' };
  assert.equal(placeTimelineEntry(source, reference, 'hour'), null);
  assert.equal(placeTimelineEntry(recorded, reference, 'hour').top, 50);
  assert.equal(placeTimelineEntry(source, reference, 'day').top, 50);
  assert.equal(placeTimelineEntry({ time_axis: 'historical', historical_time_span: {} }, reference, 'year'), null);
});

test('project-local historical hours occupy their real hour, while date-only bounds stay imprecise', () => {
  const reference = Date.parse('2024-06-01T13:00:00Z');
  const entry = { time_axis: 'historical', historical_time_span: { begin_of_begin: '2024-06-01', end_of_end: '2024-06-01' },
    historical_instants: { begin_of_begin: '2024-06-01T14:30:00+02:00', end_of_end: '2024-06-01T14:30:00+02:00' },
    historical_day_limits: { begin_of_begin: { start: '2024-06-01T00:00:00+02:00', end: '2024-06-02T00:00:00+02:00' },
      end_of_end: { start: '2024-06-01T00:00:00+02:00', end: '2024-06-02T00:00:00+02:00' } } };
  assert.equal(placeTimelineEntry(entry, reference, 'hour').top, 50);
  assert.ok(placeTimelineEntry(entry, reference, 'day'));
  entry.historical_instants.end_of_end = null;
  assert.equal(placeTimelineEntry(entry, reference, 'hour'), null);
});
