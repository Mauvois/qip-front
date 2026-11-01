// The three central historical scales remain visible at every configuration.
export const availableScales = ['day', 'week', 'month', 'year', 'decade', 'century', 'millennium', 'tenMillennia'];
export const defaultScales = ['year', 'decade', 'century', 'millennium'];
export const scaleLabels = { day: 'Jour', week: 'Semaine', month: 'Mois', year: 'Année',
  decade: 'Décennie', century: 'Siècle', millennium: 'Millénaire', tenMillennia: '10 millénaires' };

export function adjacentScale(scales, edge) {
  const index = availableScales.indexOf(edge === 'smallest' ? scales[0] : scales[scales.length - 1]);
  return availableScales[index + (edge === 'smallest' ? -1 : 1)] || null;
}

export function addBoundaryScale(scales, edge) {
  const next = adjacentScale(scales, edge);
  if (!next) return scales;
  return edge === 'smallest' ? [next, ...scales] : [...scales, next];
}

export function canRemoveBoundaryScale(scales, edge) {
  const current = edge === 'smallest' ? scales[0] : scales[scales.length - 1];
  return scales.length > 3 && !['year', 'decade', 'century'].includes(current);
}

export function removeBoundaryScale(scales, edge) {
  if (!canRemoveBoundaryScale(scales, edge)) return scales;
  return edge === 'smallest' ? scales.slice(1) : scales.slice(0, -1);
}
