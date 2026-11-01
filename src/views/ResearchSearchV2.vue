<template>
  <div class="backdrop" @click.self="$emit('close')">
    <section class="modal" role="dialog" aria-modal="true" aria-label="Recherche dans le projet">
      <button class="close" type="button" aria-label="Fermer" @click="$emit('close')">×</button>
      <h2>Recherche dans le projet</h2>
      <form @submit.prevent="search">
        <label>Texte <input v-model.trim="query" autofocus placeholder="Libellé, titre, citation…" @input="invalidate" /></label>
        <div class="criteria">
          <label>Catégorie <select v-model="kind" @change="search">
            <option value="all">Toutes</option><option value="source">Sources</option>
            <option value="factoid">Factoïdes</option><option value="qualified">Informations qualifiées</option>
            <option value="entity">Entités</option><option value="type">Types</option>
          </select></label>
          <label>Champ <select v-model="field" @change="search">
            <option value="all">Tous les champs textuels</option><option value="label">Titre / libellé / nom</option>
            <option value="description">Description / définition</option><option value="reference">Référence / cote</option>
            <option value="author">Auteur / organisme</option><option value="citation">Citation / passage</option>
            <option value="date">Date telle que connue</option>
          </select></label>
          <button type="submit" :disabled="!query.trim()">Prévisualiser</button>
          <button type="button" :disabled="loading || !query.trim()" @click="apply">Afficher sur les frises</button>
        </div>
      </form>
      <p v-if="error" role="alert" class="error">{{ error }}</p>
      <p v-if="loading" role="status">Recherche…</p>
      <template v-else>
        <p v-if="!results.length && searched">Aucun résultat.</p>
        <p v-if="searched">{{ total }} résultat{{ total > 1 ? 's' : '' }} dans ce projet.</p>
        <button v-if="nextOffset !== null" type="button" @click="more">Afficher davantage de résultats</button>
        <ul class="results">
          <li v-for="result in results" :key="`${result.resource_kind}-${result.resource_id}`">
            <button type="button" @click="select(result)">{{ labels[result.resource_kind] }} · {{ result.label }}
              <span v-for="term in result.matched_terms" :key="term" class="matched-term"
                :style="{ borderColor: previewColors[term] }">{{ term }}</span>
            </button>
          </li>
        </ul>
        <article v-if="preview" class="preview">
          <h3>{{ preview.label }}</h3>
          <p>{{ labels[preview.resource_kind] }} · {{ previewRecord?.description || previewRecord?.definition || 'Sans notice' }}</p>
          <button v-if="canEdit" type="button" @click="$emit('edit', preview)">Modifier</button>
        </article>
      </template>
    </section>
  </div>
</template>

<script setup>
/* global defineProps, defineEmits */
import { computed, onMounted, ref } from 'vue';
import axios from '@/axios.js';
import { fetchResearchResults, searchColors } from '@/researchSearch.js';

const props = defineProps({ projectId: { type: Number, required: true }, initialQuery: { type: String, default: '' },
  initialField: { type: String, default: 'all' }, initialKind: { type: String, default: 'all' },
  entities: { type: Array, required: true }, types: { type: Array, required: true }, canEdit: { type: Boolean, default: false } });
const emit = defineEmits(['close', 'open', 'edit', 'apply']);
const labels = { source: 'Source', factoid: 'Factoïde', qualified: 'Information qualifiée', entity: 'Entité', type: 'Type' };
const query = ref(props.initialQuery), kind = ref(props.initialKind), field = ref(props.initialField);
const results = ref([]), preview = ref(null), loading = ref(false), searched = ref(false), total = ref(0);
const nextOffset = ref(null), error = ref(''), previewTerms = ref([]);
const previewColors = computed(() => Object.fromEntries(previewTerms.value.map((term, index) => [term, searchColors[index]])));
const previewRecord = computed(() => preview.value?.resource_kind === 'entity'
  ? props.entities.find(row => row.id === preview.value.resource_id)
  : props.types.find(row => row.id === preview.value?.resource_id));
let requestId = 0;
async function search() {
  if (!query.value.trim()) { invalidate(); return; }
  const current = ++requestId;
  loading.value = true; error.value = ''; preview.value = null;
  try {
    const response = await axios.get('/api/v2/search/', { params: { ...params(), limit: 50 } });
    if (current === requestId) {
      results.value = response.data.results; total.value = response.data.total; previewTerms.value = response.data.terms;
      nextOffset.value = response.data.next_offset; searched.value = true;
    }
  } catch (err) { if (current === requestId) error.value = JSON.stringify(err.response?.data || err.message); }
  finally { if (current === requestId) loading.value = false; }
}
function params() { return { project: props.projectId, q: query.value, kind: kind.value, field: field.value }; }
function invalidate() { ++requestId; results.value = []; nextOffset.value = null; searched.value = false; loading.value = false; }
async function more() {
  if (nextOffset.value === null || loading.value) return;
  const current = ++requestId;
  loading.value = true;
  try {
    const response = await axios.get('/api/v2/search/', { params: { ...params(), offset: nextOffset.value, limit: 50 } });
    if (current === requestId) { results.value.push(...response.data.results); nextOffset.value = response.data.next_offset; }
  } catch (err) { if (current === requestId) error.value = JSON.stringify(err.response?.data || err.message); }
  finally { if (current === requestId) loading.value = false; }
}
async function apply() {
  if (loading.value || !query.value.trim()) return;
  const current = ++requestId;
  loading.value = true; error.value = '';
  try {
    const all = await fetchResearchResults(axios, params());
    if (current === requestId && all.terms.length) emit('apply', { ...all, query: query.value, field: field.value, kind: kind.value });
  } catch (err) { if (current === requestId) error.value = JSON.stringify(err.response?.data || err.message); }
  finally { if (current === requestId) loading.value = false; }
}
function select(result) {
  if (['entity', 'type'].includes(result.resource_kind)) preview.value = result;
  else emit('open', result);
}
onMounted(() => { if (query.value.trim()) search(); });
</script>

<style scoped>
.backdrop { position: fixed; inset: 0; z-index: 1050; background: rgba(29,45,61,.6); display: grid; place-items: center; padding: 1rem; }
.modal { position: relative; background: #f8fafc; color: #293c4d; padding: 1.25rem; border-radius: .7rem; width: min(760px, 96vw); max-height: 90vh; overflow-y: auto; }
.close { position: absolute; right: .8rem; top: .5rem; font-size: 1.8rem; border: 0; background: transparent; }
form { display: flex; flex-direction: column; gap: .7rem; } label { display: flex; flex-direction: column; gap: .2rem; }
.criteria { display: flex; flex-wrap: wrap; gap: .6rem; align-items: flex-end; }
input, select { max-width: 100%; padding: .35rem; border: 1px solid #abbac7; border-radius: .3rem; }
button { padding: .4rem .65rem; border-radius: .3rem; border: 1px solid #6c8aa8; background: #e7edf3; cursor: pointer; }
.results { list-style: none; padding: 0; max-height: 40vh; overflow-y: auto; }
.results li { margin: .35rem 0; }.results button { width: 100%; text-align: left; }
.matched-term { display: inline-block; margin-left: .4rem; padding: .05rem .25rem; font-size: .76rem;
  background: white; border-left: 4px solid; border-radius: .2rem; }
.preview { border-top: 1px solid #bdcbd8; }.error { color: #a52b3b; }
</style>
