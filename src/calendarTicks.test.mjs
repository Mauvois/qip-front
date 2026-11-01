import assert from 'node:assert/strict';
import test from 'node:test';
import { calendarTicks } from './calendarTicks.js';
import { timeWindow } from './timelineTime.js';

test('century and decade guides land on round calendar years at the shared amplitude', () => {
  const reference = Date.parse('2026-10-30T12:00:00Z');
  assert.deepEqual(calendarTicks(reference, 'century', 3, 600).map(tick => tick.label), ['1800', '1900', '2000']);
  assert.deepEqual(calendarTicks(reference, 'decade', 3, 600).map(tick => tick.label), ['2000', '2010', '2020']);
  assert.deepEqual(calendarTicks(reference, 'century', 1, 600).map(tick => tick.label), ['2000']);
  const window = timeWindow(reference, 'century', 3);
  for (const tick of calendarTicks(reference, 'century', 3, 600)) {
    assert.ok(tick.top > 0 && tick.top < 100);
    assert.ok(Number.isFinite(window.end - tick.top / 100 * window.duration));
  }
});

test('sparse guides use real project-local midnights through daylight saving time', () => {
  const reference = Date.parse('2024-03-31T12:00:00Z');
  const ticks = calendarTicks(reference, 'day', 3, 800, 'Europe/Paris');
  const march31 = ticks.find(tick => tick.label?.includes('31 mars'));
  assert.ok(march31);
  const window = timeWindow(reference, 'day', 3);
  const instant = window.end - march31.top / 100 * window.duration;
  assert.ok(Math.abs(instant - Date.parse('2024-03-30T23:00:00Z')) < 1);
  assert.ok(calendarTicks(reference, 'month', 9, 120).length <= 2);
  const weekReference = Date.parse('2026-10-30T12:00:00Z');
  const mondays = calendarTicks(weekReference, 'week', 3, 600);
  assert.ok(mondays[0].label.includes('12 oct.'));
  const week = timeWindow(weekReference, 'week', 3);
  assert.ok(Math.abs(week.end - mondays[0].top / 100 * week.duration -
    Date.parse('2026-10-12T00:00:00Z')) < 1);
});

test('prehistoric guides never present an astronomical year zero as a historical label', () => {
  const ticks = calendarTicks(Date.parse('2026-10-30T12:00:00Z'), 'tenMillennia', 9, 600);
  assert.ok(ticks.length > 1 && ticks.length <= 6);
  assert.equal(ticks.some(tick => tick.label === '0'), false);
  assert.ok(ticks.every(tick => tick.top > 0 && tick.top < 100));
});
