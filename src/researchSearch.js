// The server paginates results; complete a search before switching the timeline to search mode.
export async function fetchResearchResults(axios, params) {
  const results = [];
  let offset = 0;
  let terms = [];
  do {
    const response = await axios.get('/api/v2/search/', { params: { ...params, limit: 100, offset } });
    results.push(...response.data.results);
    terms = response.data.terms;
    offset = response.data.next_offset;
    if (offset !== null && offset > 100000) throw new Error('Recherche trop large : affinez les termes.');
  } while (offset !== null);
  return { results, terms };
}

export const searchColors = ['#7b3fb6', '#007f91', '#b45116', '#a02764', '#4368bc', '#607c13', '#a93438', '#6550a2'];

export function searchText(terms) {
  return terms.map(term => /\s/.test(term) ? `"${term}"` : term).join(' ');
}

// Separate searches are alternatives. A resource found by several searches
// stays unique but carries every matching label for the timeline palette.
export function combineResearchSearches(searches) {
  const results = new Map();
  for (const search of searches) {
    for (const result of search.results) {
      const key = `${result.resource_kind}-${result.resource_id}`;
      if (!results.has(key)) results.set(key, { ...result, matched_terms: [] });
      if (!results.get(key).matched_terms.includes(search.label))
        results.get(key).matched_terms.push(search.label);
    }
  }
  return { results: [...results.values()], colors: Object.fromEntries(searches.map(row => [row.label, row.color])) };
}
