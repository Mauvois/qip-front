<template>
  <section class="timeline-container" :class="{ 'search-mode': searchMode, 'edge-smallest': edge === 'smallest', 'edge-largest': edge === 'largest' }" @keydown.esc="$emit('group', null)">
    <div class="timeline-header">
      <h2>{{ scaleLabels[timescale] }}</h2>
      <div v-if="edge" class="edge-tools" role="group" :aria-label="edge === 'smallest' ? 'Échelles courtes' : 'Échelles longues'">
        <button v-if="canRemoveScale" type="button" class="scale-remove"
          :aria-label="`Retirer la frise ${scaleLabels[timescale]}`" :title="`Retirer ${scaleLabels[timescale]}`"
          @click="$emit('scale-remove', edge)">−</button>
        <button v-if="nextScale" type="button" class="scale-add"
          :aria-label="`Ajouter la frise ${scaleLabels[nextScale]}`" :title="`Ajouter ${scaleLabels[nextScale]}`"
          @click="$emit('scale-add', edge)">+</button>
      </div>
      <div v-if="showTimelineNavigation" class="navigation">
        <button type="button" :aria-label="`Reculer d'une ${scaleLabels[timescale]}`" @click="$emit('navigate', timescale, -1)">‹</button>
        <button type="button" :aria-label="`Avancer d'une ${scaleLabels[timescale]}`" @click="$emit('navigate', timescale, 1)">›</button>
      </div>
      <template v-if="showTimelineMetadata">
        <small>{{ formatDate(end) }} → {{ formatDate(start) }}</small>
      </template>
    </div>
    <div ref="axisRef" class="timeline-axis">
      <div v-for="(tick, index) in calendarGuides" :key="`calendar-${index}`" class="calendar-tick"
        :style="{ top: `${tick.top}%` }" aria-hidden="true">
        <span v-if="tick.label">{{ tick.label }}</span>
      </div>
      <template v-for="group in groups" :key="group.id">
        <div v-for="row in group.entries.filter(isPeriod)" :key="`${row.item.resource_kind}-${row.item.resource_id}-${row.item.time_axis}`"
          class="time-range" :class="row.item.resource_kind" :style="rangeStyle(row)" aria-hidden="true" />
        <button v-if="group.entries.length === 1" type="button" class="timeline-mark" :class="[group.entries[0].item.resource_kind, group.entries[0].item.time_axis]"
          :style="{ top: `${group.top}%` }" :aria-label="description(group.entries[0].item)"
          @mouseenter="showPreview(group.entries[0].item, $event)" @mouseleave="activePreview = null"
          @focus="showPreview(group.entries[0].item, $event)" @blur="activePreview = null"
          @click="activePreview = null; $emit('select', group.entries[0].item)">
          <span class="mark-symbol" aria-hidden="true" />
          <span v-if="searchMode" class="term-stripes" aria-hidden="true">
            <span v-for="term in group.entries[0].item.matched_terms" :key="term" :style="{ backgroundColor: termColors[term] }" />
          </span>
          <span class="sr-only">{{ description(group.entries[0].item) }}</span>
        </button>
        <button v-else type="button" class="timeline-group" :style="{ top: `${group.top}%` }"
          :aria-label="`${group.entries.length} marqueurs, ${group.resources} fiches sur la frise ${scaleLabels[timescale]}. ${groupStats(group).map(stat => `${stat.label} : ${stat.count}`).join(', ')}. Ouvrir le groupe.`"
          :aria-expanded="activeGroupKey === group.id" @click="$emit('group', activeGroupKey === group.id ? null : group.id)">
          <span class="group-count">{{ group.entries.length }}</span>
          <span class="group-stripes" aria-hidden="true">
            <span v-for="stat in groupStats(group)" :key="stat.label" :style="{ backgroundColor: stat.color }" />
          </span>
        </button>
      </template>
    </div>
    <div v-if="activePreview && !activeGroup" class="hover-preview" :style="previewStyle" role="status">
      <strong>{{ activePreview.label }}</strong>
      <small>{{ axisName(activePreview) }} · {{ period(activePreview) }}</small>
      <small v-if="searchMode && activePreview.matched_terms?.length">{{ activePreview.matched_terms.join(' · ') }}</small>
      <small>Ouvrir la fiche pour consulter la provenance.</small>
    </div>
    <div v-if="activeGroup" class="group-panel" role="region" :aria-label="`Groupe sur la frise ${scaleLabels[timescale]}`">
      <div class="group-panel-header"><strong>{{ activeGroup.entries.length }} marqueurs · {{ activeGroup.resources }} fiches</strong>
        <button type="button" aria-label="Fermer le groupe" @click="$emit('group', null)">×</button>
      </div>
      <div class="group-summary">
        <span v-for="stat in groupStats(activeGroup)" :key="stat.label" :style="{ borderColor: stat.color }">{{ stat.label }} · {{ stat.count }}</span>
      </div>
      <ul><li v-for="row in activeGroup.entries" :key="`${row.item.resource_kind}-${row.item.resource_id}-${row.item.time_axis}`">
        <button type="button" @click="$emit('select', row.item); $emit('group', null)">
          <span class="panel-symbol" :class="row.item.resource_kind" aria-hidden="true" />
          <span><strong>{{ row.item.label }}</strong><small>{{ axisName(row.item) }} · {{ period(row.item) }}</small>
            <small v-if="searchMode && row.item.matched_terms?.length">{{ row.item.matched_terms.join(' · ') }}</small></span>
        </button>
      </li></ul>
    </div>
  </section>
</template>

<script setup>
/* global defineProps, defineEmits */
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { timeWindow } from '@/timelineTime.js';
import { layoutTimeline } from '@/timelineClusters.js';
import { scaleLabels } from '@/timelineScales.js';
import { previewPosition } from '@/timelinePreview.js';
import { calendarTicks } from '@/calendarTicks.js';

const props = defineProps({
  timescale: { type: String, required: true },
  items: { type: Array, default: () => [] },
  referenceTime: { type: Number, required: true },
  timeMultiplier: { type: Number, default: 1 },
  projectTimezone: { type: String, default: 'UTC' },
  searchMode: { type: Boolean, default: false },
  termColors: { type: Object, default: () => ({}) },
  activeGroupKey: { type: String, default: null },
  edge: { type: String, default: null },
  nextScale: { type: String, default: null },
  canRemoveScale: { type: Boolean, default: false },
});
defineEmits(['select', 'navigate', 'group', 'scale-add', 'scale-remove']);
// Keep the time navigation available in code without adding controls to the dashboard.
const showTimelineNavigation = false;
const showTimelineMetadata = false;
const timelineWindow = computed(() => timeWindow(props.referenceTime, props.timescale, props.timeMultiplier));
const start = computed(() => new Date(timelineWindow.value.start));
const end = computed(() => new Date(timelineWindow.value.end));
const axisRef = ref(null), axisHeight = ref(600);
const activePreview = ref(null);
const previewStyle = ref({});
function showPreview(item, event) {
  const rect = event.currentTarget.getBoundingClientRect();
  const { left, top, above } = previewPosition(rect, { width: window.innerWidth, height: window.innerHeight });
  previewStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
    transform: above ? 'translateY(-100%)' : 'translateY(-50%)',
  };
  activePreview.value = item;
}
let observer;
onMounted(() => {
  observer = new ResizeObserver(entries => { axisHeight.value = entries[0].contentRect.height || 600; });
  observer.observe(axisRef.value);
});
onUnmounted(() => observer?.disconnect());
const groups = computed(() => layoutTimeline(props.items, props.referenceTime, props.timescale,
  axisHeight.value, props.timeMultiplier));
const calendarGuides = computed(() => calendarTicks(props.referenceTime, props.timescale,
  props.timeMultiplier, axisHeight.value, props.projectTimezone));
const activeGroup = computed(() => groups.value.find(group => group.id === props.activeGroupKey && group.entries.length > 1));
const kindColors = { source: '#53816a', factoid: '#a58149', qualified: '#866e9f' };
const kindNames = { source: 'Sources', factoid: 'Factoïdes', qualified: 'Informations qualifiées' };
function groupStats(group) {
  const stats = new Map();
  for (const { item } of group.entries) {
    const labels = props.searchMode ? item.matched_terms || [] : [item.resource_kind];
    for (const label of labels) {
      if (!stats.has(label)) stats.set(label, { label: props.searchMode ? label : kindNames[label],
        color: props.searchMode ? props.termColors[label] : kindColors[label], ids: new Set() });
      stats.get(label).ids.add(`${item.resource_kind}-${item.resource_id}`);
    }
  }
  return [...stats.values()].map(stat => ({ label: stat.label, color: stat.color, count: stat.ids.size }));
}
function formatDate(value) {
  return props.timescale === 'hour'
    ? value.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
    : value.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
function axisName(item) { return item.time_axis === 'recorded' ? 'Consignation' : 'Temps historique'; }
function period(item) {
  if (item.time_axis === 'recorded') return new Date(item.timestamp).toLocaleString('fr-FR');
  if (item.date_text) return item.date_text;
  const span = item.historical_time_span || {};
  const dates = ['begin_of_begin', 'end_of_begin', 'begin_of_end', 'end_of_end']
    .filter(key => span[key]).map(key => item.historical_instants?.[key] || span[key]);
  return [...new Set(dates)].join(' → ') || 'Date non précisée';
}
function description(item) {
  return `${item.label} · ${item.resource_kind === 'source' ? 'Source' : item.resource_kind === 'factoid' ? 'Factoïde' : 'Information qualifiée'} · ${axisName(item)} · ${period(item)}${item.matched_terms?.length ? ` · Recherches : ${item.matched_terms.join(', ')}` : ''}`;
}
function isPeriod(row) { return row.item.time_axis === 'historical' && row.range.height > 1; }
function rangeStyle(row) {
  return { top: `${row.range.top}%`, height: `${Math.max(0.5, row.range.height)}%`,
    borderColor: props.searchMode ? props.termColors[row.item.matched_terms?.[0]] : kindColors[row.item.resource_kind] };
}
</script>

<style scoped>
.timeline-container { min-width: 125px; height: 100%; display: flex; flex-direction: column; position: relative; }
.timeline-container.edge-smallest, .timeline-container.edge-largest { min-width: 165px; }
.timeline-header { display: flex; align-items: center; justify-content: center; gap: .4rem; text-align: center;
  color: #4b6075; background: rgba(255,255,255,.82); height: 2.8rem; flex: none; padding: .35rem .4rem; }
.timeline-header h2 { flex: 1; min-width: 0; margin: 0; font-size: .94rem; font-weight: 650; white-space: nowrap; }
.timeline-header small { display: block; font-size: .7rem; }
.edge-smallest .edge-tools { order: -1; }
.edge-tools { display: inline-flex; gap: .15rem; padding: .12rem; border: 1px solid #d4e1e9;
  border-radius: 1rem; background: #f4f8fb; flex: none; }
.edge-tools button { display: grid; place-items: center; width: 1.55rem; height: 1.55rem;
  border: 0; border-radius: 50%; background: transparent; color: #4b667c; cursor: pointer;
  line-height: 1; font-size: 1.15rem; }
.edge-tools .scale-add { background: #dcecf5; color: #254b67; font-weight: 650; }
.edge-tools button:hover, .edge-tools button:focus-visible { background: #8cb6d0; color: #172f42;
  outline: 2px solid #284b64; outline-offset: 1px; }
.navigation { display: flex; justify-content: center; gap: .75rem; }
.navigation button { border: 0; background: none; color: #4b6075; font-size: 1.5rem; cursor: pointer; }
.timeline-axis { flex: 1; min-height: 0; position: relative; border-left: 1px solid #aebcc9;
  margin: .5rem; overflow: hidden; }
.calendar-tick { position: absolute; left: 0; right: 0; z-index: 0; height: 0;
  border-top: 1px solid #738d9d43; pointer-events: none; }
.calendar-tick span { position: absolute; top: -.55rem; left: .25rem; color: #607b8b;
  opacity: .65; font-size: .65rem; font-weight: 500; line-height: 1; white-space: nowrap;
  text-shadow: 0 1px 1px #fff; }
.time-range { position: absolute; left: 8%; width: 77%; background: rgba(108,138,168,.1); border-left: 3px solid; border-radius: .4rem; pointer-events: none; }
.time-range.source { background: #53816a18; }.time-range.factoid { background: #a5814918; }.time-range.qualified { background: #866e9f18; }
.search-mode .time-range { background: #73869b16; }
.timeline-mark, .timeline-group { position: absolute; left: 22%; transform: translateY(-50%); z-index: 2; display: flex; align-items: center;
  justify-content: center; gap: .15rem; min-height: 22px; padding: 2px 5px; border: 1px solid #63859a; border-radius: 100px;
  background: #fff; color: #243747; cursor: pointer; box-shadow: 0 1px 3px #1c304725; }
.timeline-mark.source { background: #e2f1e7; border-color: #53816a; }.timeline-mark.factoid { background: #f8edda; border-color: #a58149; }
.timeline-mark.qualified { background: #ede5f4; border-color: #866e9f; }.timeline-mark.recorded { border-style: dashed; }
.timeline-mark:hover, .timeline-group:hover, .timeline-mark:focus-visible, .timeline-group:focus-visible {
  outline: 2px solid #214e68; outline-offset: 2px; z-index: 3; }
.mark-symbol, .panel-symbol { display: inline-block; flex: none; width: 10px; height: 10px; background: #53816a; border-radius: 50%; }
.factoid .mark-symbol, .panel-symbol.factoid { background: #a58149; border-radius: 0; transform: rotate(45deg) scale(.8); }
.qualified .mark-symbol, .panel-symbol.qualified { background: #866e9f; border-radius: 2px; }
.term-stripes, .group-stripes { display: inline-flex; gap: 1px; }.term-stripes > span, .group-stripes > span { width: 7px; height: 12px; border-radius: 2px; }
.search-mode .timeline-mark { background: white; border-color: #526b7d; }
.timeline-group { left: 8%; max-width: 88%; background: #fff; border-color: #587588; }
.group-count { font-size: .73rem; font-weight: 700; }.group-stripes > span { width: 5px; height: 10px; }
.group-panel { position: fixed; top: 5rem; right: 1rem; z-index: 100; width: min(360px, calc(100vw - 2rem)); max-height: min(68vh, 540px);
  display: flex; flex-direction: column; border: 1px solid #7891a5; border-radius: .65rem; background: #fff; color: #243747;
  box-shadow: 0 12px 30px #1c304743; }
.hover-preview { position: fixed; z-index: 40; width: min(300px, calc(100vw - 1.5rem)); max-height: min(180px, 50vh);
  overflow: hidden; pointer-events: none; padding: .75rem; background: #fff; border: 1px solid #7891a5; border-radius: .55rem;
  box-shadow: 0 8px 20px #1c304735; color: #243747; }
.hover-preview strong { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden; }
.hover-preview small { display: block; margin-top: .2rem; color: #50677a; }
.group-panel-header { padding: .6rem; display: flex; justify-content: space-between; align-items: center; background: #e6edf5; }
.group-panel-header button { background: transparent; border: 0; font-size: 1.4rem; cursor: pointer; }
.group-summary { display: flex; gap: .35rem; padding: .4rem .6rem; flex-wrap: wrap; }
.group-summary span { border-left: 4px solid; background: #f3f6f8; padding: .2rem .4rem; border-radius: .2rem; font-size: .74rem; }
.group-panel ul { overflow-y: auto; list-style: none; margin: 0; padding: .3rem; }
.group-panel li button { display: flex; align-items: center; gap: .5rem; width: 100%; text-align: left; padding: .5rem;
  border: 0; background: white; color: inherit; cursor: pointer; border-bottom: 1px solid #e2e9ed; }
.group-panel li button:hover, .group-panel li button:focus-visible { background: #eaf2f8; }
.group-panel li small { display: block; font-size: .73rem; color: #50677a; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
@media (prefers-reduced-motion: no-preference) { .timeline-mark, .timeline-group, .time-range { transition: top .22s ease; } }
@media (max-width: 600px) { .timeline-container { min-width: 34vw; }
  .timeline-container.edge-smallest, .timeline-container.edge-largest { min-width: 165px; }
  .group-panel { top: auto; bottom: 1rem; } }
@media (hover: none) { .hover-preview { display: none; } }
</style>
