import assert from 'node:assert/strict';
import test from 'node:test';
import { combineResearchSearches } from './researchSearch.js';

test('independent searches combine results without duplicating a source and keep both labels', () => {
  const combined = combineResearchSearches([
    { label: 'Mexico · titre', color: '#123', results: [
      { resource_kind: 'source', resource_id: 1, label: 'Mexico', matched_terms: ['Mexico'] },
      { resource_kind: 'source', resource_id: 2, label: 'Autre', matched_terms: ['Mexico'] },
    ] },
    { label: '1998 · date', color: '#456', results: [
      { resource_kind: 'source', resource_id: 1, label: 'Mexico', matched_terms: ['1998'] },
    ] },
  ]);
  assert.equal(combined.results.length, 2);
  assert.deepEqual(combined.results[0].matched_terms, ['Mexico · titre', '1998 · date']);
  assert.deepEqual(combined.results[1].matched_terms, ['Mexico · titre']);
  assert.equal(combined.colors['1998 · date'], '#456');
  assert.deepEqual(combineResearchSearches([]).results, []);
});
