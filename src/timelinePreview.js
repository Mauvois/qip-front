export function previewPosition(rect, viewport) {
  const gap = 12;
  const width = Math.min(300, viewport.width - gap * 2);
  const left = rect.right + gap + width <= viewport.width - gap
    ? rect.right + gap : Math.max(gap, rect.left - gap - width);
  const height = Math.min(180, viewport.height / 2);
  const above = rect.bottom > viewport.height - height - gap && rect.top >= height + gap;
  const top = above ? rect.top - gap : Math.max(height / 2 + gap,
    Math.min(viewport.height - height / 2 - gap, rect.top + rect.height / 2));
  return { left, top, above };
}
