<template>
  <div class="dashboard">
    <Sidebar>
      <template #project>
        <label class="project-picker">
          <span class="eyebrow">Projet actif</span>
          <span class="select-shell"><select v-model.number="projectId" aria-label="Projet actif" @change="loadProject(true)">
            <option :value="null" disabled>Choisir un projet</option>
            <option v-for="project in projects" :key="project.id" :value="project.id">{{ project.name }}</option>
          </select><span class="chevron" aria-hidden="true">⌄</span></span>
        </label>
      </template>
      <template #search>
        <form v-if="projectId" class="quick-search" role="search" @submit.prevent="openSimpleSearch">
          <input v-model.trim="searchQuery" aria-label="Rechercher par titre ou libellé" placeholder="Rechercher un titre…" />
          <button type="submit" aria-label="Lancer la recherche" title="Lancer la recherche">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 5 5"/></svg>
          </button>
          <button type="button" aria-label="Recherche avancée" title="Recherche avancée" @click="openAdvancedSearch">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2" fill="#263b50"/><circle cx="16" cy="17" r="2" fill="#263b50"/></svg>
          </button>
        </form>
      </template>
      <template #filters>
        <div v-if="projectId" class="reading-controls">
          <span class="eyebrow">Affichage</span>
          <label class="entity-picker">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="7" r="3"/><path d="M5 20c0-4 3-6 7-6s7 2 7 6"/></svg>
            <span class="sr-only">Filtrer par entité</span>
            <select v-model="filters.entity" aria-label="Filtrer par entité">
              <option value="">Toutes les entités</option>
              <option v-for="entity in entities" :key="entity.id" :value="entity.id">{{ entity.label }}</option>
            </select>
            <span class="chevron" aria-hidden="true">⌄</span>
          </label>
          <div class="filter-group" role="group" aria-label="Contenus affichés">
            <button type="button" :aria-pressed="display.source" :class="{ selected: display.source }" @click="display.source = !display.source">Sources</button>
            <button type="button" :aria-pressed="display.factoid" :class="{ selected: display.factoid }" @click="display.factoid = !display.factoid">Factoïdes</button>
            <button type="button" :aria-pressed="display.qualified" :class="{ selected: display.qualified }" @click="display.qualified = !display.qualified">Qualifiées</button>
          </div>
          <div class="axis-group" role="group" aria-label="Axes temporels affichés">
            <button type="button" :aria-pressed="display.historical" :class="{ selected: display.historical }" @click="display.historical = !display.historical">Historique</button>
            <button type="button" :aria-pressed="display.recorded" :class="{ selected: display.recorded }" @click="display.recorded = !display.recorded">Consignation</button>
          </div>
        </div>
      </template>
      <template #time>
        <div class="time-control">
          <span class="eyebrow">Repère temporel</span>
          <button v-if="!editingTime" type="button" class="reference-date" aria-label="Modifier la date de référence"
            title="Modifier la date de référence" @click="editReference">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></svg>
            <span>{{ formattedReferenceTime }}</span>
          </button>
          <div v-else class="time-editor">
            <input type="datetime-local" v-model="timeInput" aria-label="Date et heure de référence"
              @change="chooseReference($event.target.value)" @keydown.esc="editingTime = false" />
            <button type="button" aria-label="Fermer le choix de date" @click="editingTime = false">×</button>
          </div>
          <div class="amplitude-control">
            <div class="amplitude-heading"><label for="time-amplitude">Amplitude des frises</label>
              <output for="time-amplitude">×{{ timeMultiplier }}</output></div>
            <div class="amplitude-adjust">
              <button type="button" aria-label="Réduire l’amplitude des frises" title="Réduire l’amplitude"
                :disabled="timeMultiplier === 1" @click="setTimeMultiplier(timeMultiplier - 1)">−</button>
              <input id="time-amplitude" type="range" min="1" max="9" step="1" :value="timeMultiplier"
                :aria-valuetext="`×${timeMultiplier} : ${timeMultiplier * 10} ans sur la frise Décennie`"
                @input="setTimeMultiplier($event.target.value)" />
              <button type="button" aria-label="Augmenter l’amplitude des frises" title="Augmenter l’amplitude"
                :disabled="timeMultiplier === 9" @click="setTimeMultiplier(timeMultiplier + 1)">+</button>
            </div>
          </div>
          <div class="clock-controls">
            <span class="clock-status"><span class="status-dot" :class="{ exploring: clockMode !== 'live' || paused }" />
              {{ clockMode === 'live' ? (paused ? 'En pause' : 'Présent') : 'Exploration' }}</span>
            <button v-if="clockMode === 'live'" type="button" :aria-label="paused ? 'Reprendre le temps réel' : 'Mettre le temps réel en pause'"
              :title="paused ? 'Reprendre' : 'Pause'" @click="togglePlayback">{{ paused ? '▶' : 'Ⅱ' }}</button>
            <button type="button" class="now-button" @click="returnToNow">Maintenant</button>
          </div>
        </div>
      </template>
    </Sidebar>

    <div class="content">
      <p v-if="error" class="message error" role="alert">{{ error }}</p>
      <div v-if="activeSearch" class="search-banner" role="status">
        <span class="search-count">{{ activeSearch.results.length }} résultat{{ activeSearch.results.length > 1 ? 's' : '' }}</span>
        <div class="search-tags" aria-label="Recherches affichées">
          <button v-for="search in searches" :key="search.key" type="button" class="search-tag"
            :style="{ '--tag-color': search.color }" :aria-label="`Retirer la recherche ${search.label}`" @click="removeSearch(search.key)">
            {{ search.label }} <span aria-hidden="true">×</span>
          </button>
        </div>
        <button type="button" class="search-add" aria-label="Ajouter une recherche" title="Ajouter une recherche" @click="openAdvancedSearch">+</button>
        <button type="button" class="search-close" aria-label="Fermer le mode recherche" title="Fermer le mode recherche" @click="clearSearch">×</button>
      </div>
      <p v-if="searchLoading" class="message" role="status">Recherche dans le projet…</p>
      <p v-if="!projectId" class="message">Sélectionnez un projet ou créez-en un avec le bouton +.</p>
      <div class="timelines">
        <Timeline v-for="timescale in timescales" :key="timescale" :timescale="timescale"
          :reference-time="referenceTime" :time-multiplier="timeMultiplier" :project-timezone="projectTimeZone"
          :items="visibleEntries"
          :search-mode="!!activeSearch" :term-colors="termColors"
          :edge="timescale === timescales[0] ? 'smallest' : timescale === timescales[timescales.length - 1] ? 'largest' : null"
          :next-scale="timescale === timescales[0] ? adjacentScale(timescales, 'smallest') :
            timescale === timescales[timescales.length - 1] ? adjacentScale(timescales, 'largest') : null"
          :can-remove-scale="timescale === timescales[0] ? canRemoveBoundaryScale(timescales, 'smallest') :
            timescale === timescales[timescales.length - 1] && canRemoveBoundaryScale(timescales, 'largest')"
          :active-group-key="activeGroupKey" @group="activeGroupKey = $event"
          @select="selectedEntry = $event; activeGroupKey = null" @navigate="navigate"
          @scale-add="addScale" @scale-remove="removeScale" />
      </div>
      <details v-if="activeSearch && nonTimelineResults.length" class="non-timeline">
        <summary>{{ nonTimelineResults.length }} entité{{ nonTimelineResults.length > 1 ? 's' : '' }} ou type{{ nonTimelineResults.length > 1 ? 's' : '' }} trouvés hors frise</summary>
        <ul><li v-for="row in nonTimelineResults" :key="`${row.resource_kind}-${row.resource_id}`">{{ row.label }}</li></ul>
      </details>
      <details v-if="legacyItems.length || legacyMedia.length" class="legacy">
        <summary>Données de recherche v1 à examiner ({{ legacyItems.length }} items, {{ legacyMedia.length }} médias)</summary>
        <p>Conservées séparément jusqu'à l'inventaire et la migration métier.</p>
        <button v-for="item in legacyItems" :key="`item-${item.id}`" type="button" @click="legacySelected = item">{{ item.label }}</button>
        <span v-for="entry in legacyMedia" :key="`media-${entry.id}`">{{ entry.title }}
          <button v-if="entry.has_file" type="button" @click="openLegacyFile(entry)">Ouvrir</button></span>
      </details>
    </div>

    <button class="add-icon-button" type="button"
      :aria-label="projectId ? 'Ouvrir le menu Ajouter' : 'Ajouter un projet'"
      @click="openEditor(projectId ? (canEdit ? 'informations' : 'zotero') : 'project')">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="add-icon">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    </button>

    <ResearchSearchV2 v-if="searchOpen && projectId" :project-id="projectId" initial-query=""
      initial-field="all" initial-kind="all"
      :entities="entities" :types="types" :can-edit="canEdit" @close="searchOpen = false"
      @open="openSearchResult" @edit="editSearchResult" @apply="applySearchFromModal" />
    <ResearchEditorV2 v-if="editorTab" :key="`${projectId}-${editorTab}-${editEntry?.id || 'new'}`"
      :tab="editorTab" :project-id="projectId" :project="projects.find(p => p.id === projectId) || null"
      :user="user" :memberships="memberships"
      :types="types" :entities="entities" :sources="sources" :informations="informations"
      :edit-entry="editEntry" @close="closeEditor" @changed="refreshProject" @project-created="projectCreated"
      @project-updated="projectUpdated" @open-file="openFile" />
    <ResearchDetailV2 v-if="selectedEntry" :entry="selectedEntry" :types="types" :entities="entities"
      :sources="sources" :informations="informations" :can-edit="canEdit"
      @close="selectedEntry = null" @edit="editSelectedEntry" @open-file="openFile" />
    <LegacyDetail v-if="legacySelected" :item="legacySelected" :items="legacyItems" :media="legacyMedia"
      :entities="legacyEntities" :types="legacyTypes" :statuses="legacyStatuses" :can-edit="false"
      @close="legacySelected = null" @open-file="openLegacyFile" />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import axios from '@/axios.js';
import Sidebar from './Sidebar.vue';
import Timeline from './Timeline.vue';
import ResearchDetailV2 from './ResearchDetailV2.vue';
import ResearchEditorV2 from './ResearchEditorV2.vue';
import ResearchSearchV2 from './ResearchSearchV2.vue';
import LegacyDetail from './Detail.vue';
import { shiftTime } from '@/timelineTime.js';
import { defaultScales, adjacentScale, addBoundaryScale, canRemoveBoundaryScale,
  removeBoundaryScale } from '@/timelineScales.js';
import { fetchResearchResults, searchColors, combineResearchSearches } from '@/researchSearch.js';

const store = useStore();
const router = useRouter();
const user = computed(() => store.state.user);
const projects = ref([]);
const projectId = ref(null);
const memberships = ref([]);
const types = ref([]);
const entities = ref([]);
const sources = ref([]);
const informations = ref([]);
const timelineEntries = ref([]);
const legacyItems = ref([]), legacyMedia = ref([]), legacyEntities = ref([]), legacyTypes = ref([]), legacyStatuses = ref([]);
const legacySelected = ref(null);
const error = ref('');
const referenceTime = ref(Date.now());
const timeMultiplier = ref(1);
const clockMode = ref('live');
const paused = ref(false);
// const playbackRate = ref(1); // Vitesse d'exploration réservée pour plus tard.
const editingTime = ref(false);
const formattedReferenceTime = computed(() => new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(new Date(referenceTime.value)));
function localInputDate(timestamp) {
  const date = new Date(timestamp);
  return new Date(timestamp - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
const timeInput = ref(localInputDate(referenceTime.value));
let clockTimer;
// let previousTick; // À restaurer avec la vitesse d'exploration.
const filters = reactive({ entity: '' });
const display = reactive({ source: true, factoid: true, qualified: true, historical: true, recorded: true });
const timescales = ref([...defaultScales]);
const editorTab = ref(null);
const editEntry = ref(null);
const selectedEntry = ref(null);
const searchQuery = ref('');
const searchOpen = ref(false);
const searchLoading = ref(false);
const searches = ref([]);
const activeSearch = computed(() => searches.value.length ? combineResearchSearches(searches.value) : null);
const activeGroupKey = ref(null);
let searchRequest = 0;
const fieldNames = { all: '', label: 'titre', description: 'description', reference: 'référence',
  author: 'auteur', citation: 'citation', date: 'date' };
const kindNames = { all: '', source: 'sources', factoid: 'factoïdes', qualified: 'qualifiées', entity: 'entités', type: 'types' };
function searchLabel(query, field, kind) {
  return [query.trim(), fieldNames[field], kindNames[kind]].filter(Boolean).join(' · ');
}
const termColors = computed(() => activeSearch.value?.colors || {});
const matches = computed(() => new Map((activeSearch.value?.results || []).map(row => [
  `${row.resource_kind}-${row.resource_id}`, row.matched_terms,
])));
const nonTimelineResults = computed(() => (activeSearch.value?.results || [])
  .filter(row => ['entity', 'type'].includes(row.resource_kind)));
const canEdit = computed(() => memberships.value.some(member => member.username === user.value?.username && ['owner', 'editor'].includes(member.role)));
const isOwner = computed(() => memberships.value.some(member => member.username === user.value?.username && member.role === 'owner'));
const projectTimeZone = computed(() => projects.value.find(project => project.id === projectId.value)?.timezone || 'UTC');
const visibleEntries = computed(() => timelineEntries.value.filter(entry => {
  if (!display[entry.resource_kind] || !display[entry.time_axis]) return false;
  if (activeSearch.value && !matches.value.has(`${entry.resource_kind}-${entry.resource_id}`)) return false;
  if (!filters.entity) return true;
  if (entry.resource_kind === 'source') return informations.value.some(info =>
    info.citations.some(c => c.source === entry.resource_id) && info.entities.some(row => row.entity === Number(filters.entity)));
  return informations.value.some(info => info.id === entry.resource_id && info.entities.some(row => row.entity === Number(filters.entity)));
}).map(entry => activeSearch.value ? { ...entry, matched_terms: matches.value.get(`${entry.resource_kind}-${entry.resource_id}`) } : entry));

onMounted(async () => {
  // previousTick = performance.now();
  clockTimer = window.setInterval(() => {
    // const now = performance.now();
    // const elapsed = Math.min(1000, Math.max(0, now - previousTick));
    // previousTick = now;
    if (!paused.value) {
      if (clockMode.value === 'live') referenceTime.value = Date.now();
      // Exploration historique : ne pas faire progresser la date manuellement choisie.
      // else referenceTime.value += elapsed * playbackRate.value;
      if (!editingTime.value) timeInput.value = localInputDate(referenceTime.value);
    }
  }, 1000);
  await store.dispatch('initializeAuthenticationState');
  if (!user.value) { router.replace('/'); return; }
  try {
    const projectResponse = await axios.get('/api/v2/projects/');
    projects.value = projectResponse.data;
    const requestedProject = Number(new URLSearchParams(window.location.search).get('project'));
    if (projects.value.length) {
      projectId.value = projects.value.find(project => project.id === requestedProject)?.id || projects.value[0].id;
      await loadProject(true);
    }
    if (new URLSearchParams(window.location.search).get('zotero') === 'connected' && projectId.value) {
      editorTab.value = 'zotero';
      window.history.replaceState(null, '', '/dashboard');
    }
  } catch (err) { report(err); }
});
onUnmounted(() => window.clearInterval(clockTimer));

function chooseReference(value) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return;
  referenceTime.value = timestamp;
  editingTime.value = false;
  clockMode.value = 'historical';
  paused.value = false;
  // previousTick = performance.now();
}
function editReference() {
  timeInput.value = localInputDate(referenceTime.value);
  editingTime.value = true;
}
function togglePlayback() {
  if (paused.value && clockMode.value === 'live') referenceTime.value = Date.now();
  paused.value = !paused.value;
  // previousTick = performance.now();
}
function returnToNow() {
  referenceTime.value = Date.now();
  editingTime.value = false;
  clockMode.value = 'live';
  paused.value = false;
  // playbackRate.value = 1;
  timeInput.value = localInputDate(referenceTime.value);
  // previousTick = performance.now();
}
function setTimeMultiplier(value) {
  const next = Number(value);
  if (!Number.isInteger(next) || next < 1 || next > 9 || next === timeMultiplier.value) return;
  timeMultiplier.value = next;
  activeGroupKey.value = null;
}

function report(err) { error.value = JSON.stringify(err.response?.data || err.message); }
async function loadProject(resetView = false) {
  if (!projectId.value) return;
  error.value = '';
  if (resetView) {
    ++searchRequest;
    searchLoading.value = false;
    searches.value = [];
    activeGroupKey.value = null;
    searchOpen.value = false;
    searchQuery.value = '';
    filters.entity = '';
    selectedEntry.value = null;
    legacySelected.value = null;
  }
  try {
    const params = { project: projectId.value };
    const [members, kinds, objects, documents, knowledge, timeline] = await Promise.all([
      axios.get('/api/v2/memberships/', { params }), axios.get('/api/v2/types/', { params }),
      axios.get('/api/v2/entities/', { params }), axios.get('/api/v2/sources/', { params }),
      axios.get('/api/v2/informations/', { params }), axios.get('/api/v2/timeline/', { params }),
    ]);
    memberships.value = members.data; types.value = kinds.data; entities.value = objects.data;
    sources.value = documents.data; informations.value = knowledge.data; timelineEntries.value = timeline.data;
    const legacyPaths = ['items', 'media', 'entities', 'types', 'epistemic-statuses'];
    const legacy = await Promise.allSettled(legacyPaths.map(path => axios.get(`/api/v1/${path}/`, { params })));
    [legacyItems, legacyMedia, legacyEntities, legacyTypes, legacyStatuses].forEach((target, index) => {
      target.value = legacy[index].status === 'fulfilled' ? legacy[index].value.data : [];
    });
  } catch (err) { report(err); }
}
async function refreshProject(change) {
  await loadProject(false);
  if (searches.value.length) {
    const current = ++searchRequest;
    searchLoading.value = true;
    try {
      const refreshed = await Promise.all(searches.value.map(async search => ({
        ...search, ...await fetchResearchResults(axios, { project: projectId.value,
          q: search.query, field: search.field, kind: search.kind }),
      })));
      if (current === searchRequest) searches.value = refreshed;
    } catch (err) { if (current === searchRequest) report(err); }
    finally { if (current === searchRequest) searchLoading.value = false; }
  }
  const item = change?.information;
  const primary = change?.source?.datings?.find(d => d.is_primary) || change?.source?.datings?.[0];
  const dated = item || primary;
  const date = dated && (dated.begin_of_begin || dated.end_of_begin || dated.begin_of_end || dated.end_of_end);
  const marker = timelineEntries.value.find(row => row.time_axis === 'historical' &&
    row.resource_kind === (item ? item.level : 'source') && row.resource_id === (item?.id || change?.source?.id));
  if (date && marker) {
    const first = ['begin_of_begin', 'end_of_begin', 'begin_of_end', 'end_of_end']
      .find(key => marker.historical_time_span[key]);
    referenceTime.value = Date.parse(marker.historical_instants[first] || marker.historical_day_limits[first].end) + 3600000;
    clockMode.value = 'historical';
    paused.value = false;
    timeInput.value = localInputDate(referenceTime.value);
    // previousTick = performance.now();
  }
}
function openEditor(tab) {
  if (tab !== 'project' && !projectId.value) return;
  if (tab === 'members' && !isOwner.value) return;
  if (!['project', 'members', 'zotero'].includes(tab) && !canEdit.value) return;
  editEntry.value = null;
  editorTab.value = tab;
}
function closeEditor() { editorTab.value = null; editEntry.value = null; }
function activateSearch(search) {
  const query = search.query.trim();
  const key = `${search.field}:${search.kind}:${query}`;
  const previous = searches.value.find(row => row.key === key);
  const color = previous?.color || searchColors.find(value => !searches.value.some(row => row.color === value)) ||
    searchColors[searches.value.length % searchColors.length];
  const entry = { ...search, key, query, label: searchLabel(query, search.field, search.kind), color };
  searches.value = previous ? searches.value.map(row => row.key === key ? entry : row) : [...searches.value, entry];
  searchQuery.value = '';
  activeGroupKey.value = null;
  searchOpen.value = false;
}
async function runSearch(query, field = 'label', kind = 'all') {
  const current = ++searchRequest;
  const project = projectId.value;
  searchLoading.value = true; error.value = '';
  try {
    const response = await fetchResearchResults(axios, { project, q: query, field, kind });
    if (current === searchRequest && project === projectId.value && response.terms.length) {
      activateSearch({ ...response, query, field, kind });
    }
  } catch (err) { if (current === searchRequest) report(err); }
  finally { if (current === searchRequest) searchLoading.value = false; }
}
function openSimpleSearch() {
  if (!projectId.value) return;
  if (!searchQuery.value.trim()) { openAdvancedSearch(); return; }
  runSearch(searchQuery.value, 'label');
}
function openAdvancedSearch() {
  if (projectId.value) searchOpen.value = true;
}
function applySearchFromModal(search) {
  ++searchRequest;
  searchLoading.value = false;
  activateSearch(search);
}
function clearSearch() {
  ++searchRequest;
  searches.value = [];
  activeGroupKey.value = null;
  searchQuery.value = '';
  searchLoading.value = false;
}
function removeSearch(key) {
  ++searchRequest;
  searchLoading.value = false;
  searches.value = searches.value.filter(row => row.key !== key);
  activeGroupKey.value = null;
}
function openSearchResult(result) {
  searchOpen.value = false;
  selectedEntry.value = { ...result, time_axis: 'historical' };
}
function editSearchResult(result) {
  if (!canEdit.value) return;
  const entry = result.resource_kind === 'entity' ? entities.value.find(row => row.id === result.resource_id)
    : types.value.find(row => row.id === result.resource_id);
  if (!entry) return;
  searchOpen.value = false;
  editEntry.value = { ...entry, resource_kind: result.resource_kind };
  editorTab.value = result.resource_kind === 'entity' ? 'entities' : 'types';
}
async function projectCreated(project) {
  projects.value.push(project);
  projectId.value = project.id;
  closeEditor();
  await loadProject(true);
}
async function projectUpdated(project) {
  const index = projects.value.findIndex(row => row.id === project.id);
  if (index !== -1) projects.value.splice(index, 1, project);
  await loadProject(false);
}
function editSelectedEntry() {
  const entry = selectedEntry.value;
  editEntry.value = entry.resource_kind === 'source'
    ? { ...sources.value.find(row => row.id === entry.resource_id), resource_kind: 'source' }
    : { ...informations.value.find(row => row.id === entry.resource_id), resource_kind: entry.resource_kind };
  editorTab.value = entry.resource_kind === 'source' ? 'sources' : 'informations';
  selectedEntry.value = null;
}
function navigate(scale, direction) {
  referenceTime.value = shiftTime(referenceTime.value, scale, direction);
  clockMode.value = 'historical';
  paused.value = false;
  timeInput.value = localInputDate(referenceTime.value);
  // previousTick = performance.now();
}
function addScale(edge) {
  timescales.value = addBoundaryScale(timescales.value, edge);
  activeGroupKey.value = null;
}
function removeScale(edge) {
  timescales.value = removeBoundaryScale(timescales.value, edge);
  activeGroupKey.value = null;
}
async function openFile(entry) {
  const tab = window.open('about:blank', '_blank');
  if (tab) tab.opener = null;
  try {
    const response = await axios.get(`/api/v2/sources/${entry.id}/file/`);
    if (tab) tab.location.href = response.data.signed_url;
    else window.location.href = response.data.signed_url;
  } catch (err) { if (tab) tab.close(); report(err); }
}
async function openLegacyFile(entry) {
  const tab = window.open('about:blank', '_blank');
  if (tab) tab.opener = null;
  try {
    const response = await axios.get(`/api/v1/media/${entry.id}/file/`);
    if (tab) tab.location.href = response.data.signed_url;
    else window.location.href = response.data.signed_url;
  } catch (err) { if (tab) tab.close(); report(err); }
}
</script>

<style scoped>
.dashboard { display: flex; height: 100vh; width: 100%; position: relative; }
.content { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.timelines { display: flex; flex: 1; min-height: 0; overflow-x: auto; color: #6c8aa8; }
.timelines > * { flex: 1; }
.timelines > *:nth-child(odd) { background: #f4f4f4; }
.timelines > *:nth-child(even) { background: #ebedee; }
.search-banner { display: flex; align-items: center; gap: .45rem; padding: .25rem .55rem;
  min-height: 2.4rem; background: #283b53; color: #f7faff; border-bottom: 2px solid #5e91b5; white-space: nowrap; }
.search-count { font-size: .8rem; flex-shrink: 0; }
.search-tags { display: flex; align-items: center; gap: .35rem; overflow-x: auto; min-width: 0; flex: 1; }
.search-banner button { cursor: pointer; border-radius: .35rem; }
.search-banner .search-tag { flex: none; background: #fff; color: #233749; border: 0;
  border-left: 4px solid var(--tag-color); padding: .18rem .4rem; font-size: .8rem; }
.search-tag span { margin-left: .35rem; color: #596b7d; }
.search-banner .search-add, .search-banner .search-close { flex: none; background: transparent; color: #eaf1f8;
  border: 0; padding: .05rem .3rem; font-size: 1.1rem; line-height: 1; }
.search-banner .search-close { opacity: .75; }.search-banner .search-close:hover { opacity: 1; }
.non-timeline { padding: .35rem .75rem; background: #e6edf5; color: #344c60; font-size: .8rem; }
.non-timeline ul { max-height: 7rem; overflow: auto; margin: .3rem 0; }
.message { padding: 1rem; color: #4b6075; }
.eyebrow { display: block; color: #aebfd0; font-size: .66rem; font-weight: 700;
  letter-spacing: .11em; text-transform: uppercase; margin-bottom: .65rem; }
.project-picker { display: block; margin: 1.2rem 0 1.05rem; }
.select-shell, .entity-picker { position: relative; display: flex; align-items: center; min-width: 0;
  background: #ffffff12; border: 1px solid #ffffff26; border-radius: .55rem; }
.project-picker select, .entity-picker select { appearance: none; width: 100%; min-width: 0; padding: .62rem 1.7rem .62rem .7rem;
  background: transparent; border: 0; border-radius: .55rem; color: #f2f6fa; cursor: pointer; outline: 0; font-size: .89rem; }
.project-picker select { font-weight: 650; }.project-picker option, .entity-picker option { background: #fff; color: #263b50; }
.select-shell:focus-within, .entity-picker:focus-within { outline: 2px solid #a6d5ef; outline-offset: 2px; }
.chevron { position: absolute; right: .55rem; pointer-events: none; font-size: 1.1rem; color: #aecce1; }
.quick-search { display: grid; grid-template-columns: minmax(0,1fr) 2rem 2rem; gap: .15rem;
  align-items: center; padding: .15rem; border-radius: .55rem; background: #f2f6fa; }
.quick-search:focus-within { outline: 2px solid #a6d5ef; outline-offset: 2px; }
.quick-search input { width: 100%; min-width: 0; padding: .42rem .45rem; background: transparent;
  border: 0; outline: none; color: #263b50; font-size: .84rem; }
.quick-search input::placeholder { color: #6b7f91; }
.quick-search button { display: grid; place-items: center; width: 2rem; height: 2rem; padding: .32rem;
  background: transparent; border: 0; border-radius: .35rem; color: #3e5f78; cursor: pointer; }
.quick-search button:hover, .quick-search button:focus-visible { background: #dceaf3; outline: 0; }
.quick-search svg, .entity-picker svg, .reference-date svg { width: 1.1rem; height: 1.1rem; flex: none; }
.reading-controls { padding-top: 1.2rem; border-top: 1px solid #ffffff20; }
.entity-picker { margin-bottom: 1.2rem; }.entity-picker svg { margin-left: .65rem; color: #b9d1e2; }
.entity-picker select { padding: .55rem 1.5rem .55rem .5rem; font-size: .8rem; }
.filter-group { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .3rem; margin-bottom: 1.05rem; }
.filter-group button, .axis-group button { min-width: 0; border: 0; border-radius: .4rem; cursor: pointer;
  color: #cad8e5; background: #ffffff13; }
.filter-group button { padding: .58rem .1rem; font-size: .7rem; }
.filter-group button.selected { background: #cfe3f0; color: #263b50; font-weight: 650; }
.axis-group { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .15rem;
  padding: .25rem; border-radius: .5rem; background: #182f43; }
.axis-group button { background: transparent; padding: .53rem .1rem; font-size: .73rem; }
.axis-group button.selected { background: #84aeca; color: #142c40; font-weight: 700; }
.filter-group button:focus-visible, .axis-group button:focus-visible, .reference-date:focus-visible,
.time-editor button:focus-visible, .clock-controls button:focus-visible,
.amplitude-adjust button:focus-visible, .amplitude-adjust input:focus-visible { outline: 2px solid #b2d9f5; outline-offset: 2px; }
.reference-date { display: flex; align-items: center; gap: .55rem; width: 100%; text-align: left;
  background: none; border: 0; border-radius: .4rem; color: #f2f6fa; padding: .4rem 0; cursor: pointer; font-size: .83rem; }
.reference-date:hover { color: #bfe1f4; }.reference-date svg { color: #a9c7dd; }
.time-editor { display: flex; gap: .3rem; align-items: center; }
.time-editor input { width: 100%; min-width: 0; border: 1px solid #9bb9cf; border-radius: .35rem; padding: .3rem;
  font-size: .8rem; color: #263b50; }
.time-editor button { border: 0; background: transparent; color: #e6edf5; font-size: 1.25rem; cursor: pointer; }
.amplitude-control { margin-top: 1rem; padding-top: .9rem; border-top: 1px solid #ffffff20; }
.amplitude-heading { display: flex; align-items: baseline; justify-content: space-between; gap: .5rem; }
.amplitude-heading label { font-size: .76rem; color: #c2d1df; }
.amplitude-heading output { font-size: 1.13rem; color: #f2f6fa; font-weight: 700; font-variant-numeric: tabular-nums; }
.amplitude-adjust { display: flex; align-items: center; gap: .6rem; margin-top: .5rem; }
.amplitude-adjust button { width: 1.8rem; height: 1.8rem; flex: none; display: grid; place-items: center;
  border: 1px solid #ffffff38; border-radius: .4rem; background: transparent; color: #e6edf5;
  font-size: 1rem; line-height: 1; cursor: pointer; }
.amplitude-adjust button:hover:not(:disabled) { background: #ffffff1e; }
.amplitude-adjust button:disabled { opacity: .35; cursor: default; }
.amplitude-adjust input { width: 100%; min-width: 0; margin: 0; accent-color: #99c5df; cursor: pointer; }
.clock-controls { display: flex; align-items: center; gap: .3rem; margin-top: 1.05rem; }
.clock-status { display: flex; gap: .4rem; align-items: center; min-width: 0; margin-right: auto;
  font-size: .72rem; color: #c2d1df; white-space: nowrap; }
.status-dot { width: .38rem; height: .38rem; border-radius: 50%; background: #89c5a7; flex: none; }
.status-dot.exploring { background: #edbd80; }
.clock-controls button { border: 1px solid #ffffff38; border-radius: .38rem; padding: .3rem .43rem;
  background: transparent; color: #e6edf5; font-size: .74rem; cursor: pointer; white-space: nowrap; }
.clock-controls button:hover { background: #ffffff1e; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.legacy { padding: .4rem; max-height: 7rem; overflow-y: auto; background: #f0e9d9; font-size: .8rem; }
.legacy button { margin: .15rem; text-decoration: underline; }
.error { color: #a52b3b; }
.add-icon-button { position: fixed; right: 12px; bottom: 12px; border: 0; background: transparent; color: #6c8aa8; cursor: pointer; z-index: 50; }
.add-icon { width: 54px; height: 65px; }
@media (max-width: 600px) {
  .dashboard { flex-direction: column; }
  .content { min-height: 0; }
  .timelines > * { flex: 0 0 34vw; }
}
</style>
