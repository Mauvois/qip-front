import assert from 'node:assert/strict';
import test from 'node:test';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createServer } from 'vite';

test('the add workspace keeps each form associated with its persistent save action', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { default: Editor } = await server.ssrLoadModule('/src/views/ResearchEditorV2.vue');
    const base = { projectId: 1, project: { id: 1, name: 'Archives' }, user: { username: 'historienne' },
      memberships: [{ username: 'historienne', role: 'owner' }], types: [{ id: 1, kind: 'information', name: 'Observation' }],
      entities: [], sources: [], informations: [], editEntry: null };
    for (const [tab, form] of [['sources', 'source-form'], ['informations', 'information-form'],
      ['entities', 'entity-form'], ['types', 'type-form'], ['members', 'member-form'],
      ['project', 'project-form'], ['new_project', 'project-form']]) {
      const html = await renderToString(createSSRApp(Editor, { ...base, tab }));
      assert.match(html, new RegExp(`id="${form}"`), `${tab} should render its form`);
      assert.match(html, new RegExp(`form="${form}"`), `${tab} should have a save action`);
      assert.match(html, /class="sections"/, 'navigation should stay available');
    }
    const viewer = { ...base, tab: 'zotero', memberships: [{ username: 'historienne', role: 'viewer' }] };
    const html = await renderToString(createSSRApp(Editor, viewer));
    assert.match(html, /Échanges Zotero/);
    assert.doesNotMatch(html, /form="source-form"/);
  } finally {
    await server.close();
  }
});
