import assert from 'node:assert/strict';
import test from 'node:test';
import { previewPosition } from './timelinePreview.js';

test('hover preview follows the marker and flips before the right and bottom edges', () => {
  assert.deepEqual(previewPosition({ left: 100, right: 130, top: 200, bottom: 224, height: 24 },
    { width: 1100, height: 800 }), { left: 142, top: 212, above: false });
  assert.deepEqual(previewPosition({ left: 950, right: 980, top: 730, bottom: 754, height: 24 },
    { width: 1100, height: 800 }), { left: 638, top: 718, above: true });
});
