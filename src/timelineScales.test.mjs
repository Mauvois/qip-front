import assert from 'node:assert/strict';
import test from 'node:test';
import { addBoundaryScale, adjacentScale, availableScales, canRemoveBoundaryScale,
  defaultScales, removeBoundaryScale } from './timelineScales.js';

test('boundary controls add neighbouring historical scales without restoring the hour', () => {
  assert.equal(availableScales.includes('hour'), false);
  assert.equal(adjacentScale(defaultScales, 'smallest'), 'month');
  assert.equal(adjacentScale(defaultScales, 'largest'), 'tenMillennia');
  let scales = addBoundaryScale(defaultScales, 'smallest');
  scales = addBoundaryScale(scales, 'smallest');
  scales = addBoundaryScale(scales, 'smallest');
  assert.deepEqual(scales, ['day', 'week', 'month', 'year', 'decade', 'century', 'millennium']);
  assert.equal(adjacentScale(scales, 'smallest'), null);
  assert.equal(addBoundaryScale(scales, 'smallest'), scales);
  scales = addBoundaryScale(scales, 'largest');
  assert.equal(adjacentScale(scales, 'largest'), null);
  assert.equal(scales.at(-1), 'tenMillennia');
});

test('removing optional edges can never remove year, decade or century', () => {
  let scales = ['month', ...defaultScales, 'tenMillennia'];
  scales = removeBoundaryScale(scales, 'smallest');
  scales = removeBoundaryScale(scales, 'largest');
  scales = removeBoundaryScale(scales, 'largest');
  assert.deepEqual(scales, ['year', 'decade', 'century']);
  assert.equal(canRemoveBoundaryScale(scales, 'smallest'), false);
  assert.equal(canRemoveBoundaryScale(scales, 'largest'), false);
  assert.equal(removeBoundaryScale(scales, 'smallest'), scales);
  assert.equal(removeBoundaryScale(scales, 'largest'), scales);
});
