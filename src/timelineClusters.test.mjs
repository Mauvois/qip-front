import assert from 'node:assert/strict';
import test from 'node:test';
import { layoutTimeline } from './timelineClusters.js';

const record = (id, minute, axis = 'recorded') => ({ resource_kind: 'source', resource_id: id,
  label: `Source ${id}`, time_axis: axis, timestamp: `2024-06-01T12:${String(minute).padStart(2, '0')}:00Z` });
const reference = Date.parse('2024-06-01T13:00:00Z');

test('overlapping entries form an accessible group without discarding members or duplicating resources', () => {
  const entries = [record(1, 50), record(1, 50), record(2, 50), record(3, 20)];
  const groups = layoutTimeline(entries, reference, 'hour', 600);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].entries.length + groups[1].entries.length, 4);
  assert.equal(groups[0].entries.length, 3);
  assert.equal(groups[0].resources, 2);
});

test('density threshold follows available pixels rather than an arbitrary top cutoff', () => {
  const entries = [record(1, 59), record(2, 57)];
  assert.equal(layoutTimeline(entries, reference, 'hour', 120).length, 1);
  assert.equal(layoutTimeline(entries, reference, 'hour', 1200).length, 2);
  assert.ok(layoutTimeline([record(4, 59)], reference, 'hour')[0].top < 5);
});

test('changing the shared multiplier recomputes the visible groups and keeps older records', () => {
  const when = Date.parse('2026-10-26T12:00:00Z');
  const entries = [{ resource_kind: 'source', resource_id: 21, time_axis: 'recorded',
    timestamp: '2001-04-18T09:00:00Z' }];
  assert.equal(layoutTimeline(entries, when, 'decade', 600).length, 0);
  const groups = layoutTimeline(entries, when, 'decade', 600, 3);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].entries[0].item.resource_id, 21);
});
