import { placeTimelineEntry } from './timelineTime.js';

export function layoutTimeline(items, reference, scale, axisHeight = 600, multiplier = 1) {
  const spacing = 22 / Math.max(120, axisHeight) * 100;
  const placed = items.map(item => ({ item, range: placeTimelineEntry(item, reference, scale, multiplier) }))
    .filter(row => row.range !== null && Number.isFinite(row.range.top))
    .sort((a, b) => a.range.top - b.range.top || a.item.resource_id - b.item.resource_id);
  const groups = [];
  for (const row of placed) {
    const bucket = Math.floor(Math.min(99.999, Math.max(0, row.range.top)) / spacing);
    const previous = groups[groups.length - 1];
    if (previous && bucket === previous.bucket) {
      previous.entries.push(row);
    } else groups.push({ entries: [row], bucket });
  }
  return groups.map(group => ({
    id: `${scale}-${group.bucket}`,
    top: Math.min(100 - spacing / 2, (group.bucket + 0.5) * spacing),
    entries: group.entries,
    resources: new Set(group.entries.map(({ item }) => `${item.resource_kind}-${item.resource_id}`)).size,
  }));
}
