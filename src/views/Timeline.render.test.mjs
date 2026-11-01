import assert from 'node:assert/strict';
import test from 'node:test';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createServer } from 'vite';

test('calendar guides are rendered behind markers on a multiplied century view', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { default: Timeline } = await server.ssrLoadModule('/src/views/Timeline.vue');
    const html = await renderToString(createSSRApp(Timeline, {
      timescale: 'century', referenceTime: Date.parse('2026-10-30T12:00:00Z'),
      timeMultiplier: 3, projectTimezone: 'UTC',
      items: [{ resource_kind: 'source', resource_id: 3, label: 'Archive',
        time_axis: 'recorded', timestamp: '1900-06-01T12:00:00Z' }],
    }));
    assert.match(html, /1800/);
    assert.match(html, /1900/);
    assert.match(html, /2000/);
    assert.ok(html.indexOf('calendar-tick') < html.indexOf('timeline-mark'));
    assert.match(html, /aria-hidden="true"/);
  } finally { await server.close(); }
});
