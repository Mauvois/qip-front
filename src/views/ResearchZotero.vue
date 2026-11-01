<template>
  <div :class="embedded ? 'inline' : 'backdrop'" @click.self="!embedded && $emit('close')">
    <section :class="embedded ? 'inline-content' : 'modal'" :role="embedded ? null : 'dialog'"
      :aria-modal="embedded ? null : 'true'" aria-label="Échanges Zotero">
      <button v-if="!embedded" type="button" class="close" aria-label="Fermer" @click="$emit('close')">×</button>
      <h2 v-if="!embedded">Zotero · {{ projectName }}</h2>
      <p>Échanger des références bibliographiques sans toucher aux citations ni aux fichiers joints.</p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="notice" role="status">{{ notice }}</p>

      <section class="block">
        <h3>Fichiers CSL JSON et RIS</h3>
        <form v-if="canEdit" @submit.prevent="prepareFile">
          <label>Fichier à importer <input type="file" accept=".json,.ris,application/json" required
            @change="importFile = $event.target.files[0] || null" /></label>
          <label>Format <select v-model="fileFormat"><option value="csl-json">CSL JSON</option><option value="ris">RIS</option></select></label>
          <button type="submit" :disabled="busy || !importFile">Analyser le fichier</button>
        </form>
        <div class="export">
          <p>Exporter les sources sélectionnées ({{ selectedSourceIds.length }}). Les métadonnées non représentables en RIS peuvent être perdues.</p>
          <details><summary>Choisir les sources</summary>
            <button type="button" @click="selectedSourceIds = exportableSources.map(s => s.id)">Tout sélectionner</button>
            <button type="button" @click="selectedSourceIds = []">Tout désélectionner</button>
            <label v-for="source in exportableSources" :key="source.id" class="choice">
              <input v-model="selectedSourceIds" type="checkbox" :value="source.id" />{{ source.title }}</label>
          </details>
          <button type="button" :disabled="busy || !selectedSourceIds.length" @click="exportFile('csl-json')">Exporter CSL JSON</button>
          <button type="button" :disabled="busy || !selectedSourceIds.length" @click="exportFile('ris')">Exporter RIS</button>
        </div>
      </section>

      <section class="block">
        <h3>Collection connectée</h3>
        <p v-if="status?.collection">{{ status.collection.name }} · {{ status.collection.library_kind === 'groups' ? 'Groupe' : 'Bibliothèque personnelle' }}</p>
        <p v-else>Aucune collection reliée à ce projet.</p>
        <template v-if="isOwner">
          <p v-if="status?.connected_account">Compte autorisé : {{ status.connected_account.name || status.connected_account.user_id }}</p>
          <button v-if="status?.oauth_available" type="button" :disabled="busy" @click="authorize">
            {{ status.connected_account ? 'Réautoriser mon compte Zotero' : 'Autoriser mon compte Zotero' }}
          </button>
          <p v-else>La connexion nécessite les clés d'application Zotero sur le serveur ; les fichiers restent utilisables.</p>
          <template v-if="status?.connected_account">
            <button type="button" :disabled="busy" @click="loadLibraries">Choisir une collection</button>
            <label v-if="libraries.length">Bibliothèque <select v-model="library" @change="loadCollections">
              <option value="">Choisir</option><option v-for="entry in libraries" :key="`${entry.kind}:${entry.id}`"
                :value="`${entry.kind}:${entry.id}`">{{ entry.name }}</option></select></label>
            <label v-if="library && collections.length">Collection (les sous-collections sont proposées séparément)
              <select v-model="collectionKey"><option value="">Choisir</option>
                <option v-for="entry in collections" :key="entry.key" :value="entry.key">{{ entry.name }}{{ entry.parent ? ' · sous-collection' : '' }}</option>
              </select></label>
            <button v-if="collectionKey" type="button" :disabled="busy" @click="connect">Relier au projet</button>
          </template>
        </template>
        <button v-if="canEdit && status?.collection" type="button" :disabled="busy" @click="prepareSync">
          Comparer avec la collection Zotero</button>
      </section>

      <section v-if="preview" class="block">
        <h3>Prévisualisation · {{ preview.rows.length }} référence{{ preview.rows.length > 1 ? 's' : '' }}</h3>
        <p>Chaque référence crée une source Qip et ses métadonnées bibliographiques. La date de publication fournit une plage historique uniquement si elle est explicite ; la date de consultation reste bibliographique. Aucun factoïde n'est créé.</p>
        <p>Choisissez l'action pour chaque ligne. Ignorer ne modifie rien. Les doublons sont des suggestions, jamais des fusions automatiques.</p>
        <div class="bulk-actions">
          <button type="button" :disabled="busy" @click="chooseNew">Créer les nouvelles sans doublon ({{ newWithoutCandidates.length }})</button>
          <button type="button" :disabled="busy" @click="chooseAllIgnore">Tout ignorer</button>
          <strong>{{ chosenCount }} choisie{{ chosenCount > 1 ? 's' : '' }} pour l'échange</strong>
        </div>
        <nav v-if="pageCount > 1" class="pages" aria-label="Pages de références">
          <button type="button" :disabled="page === 0" @click="page--">Précédentes</button>
          <span>{{ page + 1 }} / {{ pageCount }}</span>
          <button type="button" :disabled="page + 1 >= pageCount" @click="page++">Suivantes</button>
        </nav>
        <div class="preview-list">
          <article v-for="row in visibleRows" :key="row.id" class="preview-row">
            <h4>{{ row.csl?.title || row.local_csl?.title || row.item_key || 'Référence non reconnue' }}</h4>
            <p>{{ statusLabels[row.status] || row.status }}
              <span v-if="row.csl?.DOI"> · DOI {{ row.csl.DOI }}</span>
              <span v-if="row.csl?.issued"> · Publication : {{ formatCslDate(row.csl.issued) }}</span></p>
            <div v-if="row.csl" class="field-map">
              <p><strong>Dans Qip :</strong> source « {{ row.csl.title }} »
                <span v-if="row.csl.author?.length"> · Auteur(s) : {{ creatorNames(row.csl.author) }}</span></p>
              <p v-if="row.csl.issued"><strong>Publication :</strong> {{ formatCslDate(row.csl.issued) }}
                <span v-if="row.publication_span?.begin_of_begin"> · frise historique du {{ row.publication_span.begin_of_begin }} au {{ row.publication_span.end_of_end }}</span>
                <span v-else> · date bibliographique non positionnable sur la frise</span></p>
              <p v-if="row.csl.accessed"><strong>Consultation (hors frise) :</strong> {{ formatCslDate(row.csl.accessed) }}</p>
              <p v-if="row.csl['container-title']"><strong>Revue / ouvrage :</strong> {{ row.csl['container-title'] }}</p>
              <p v-if="row.csl.URL"><strong>Lien :</strong> {{ row.csl.URL }}</p>
              <details><summary>Voir toutes les métadonnées enregistrées</summary><pre>{{ JSON.stringify(row.csl, null, 2) }}</pre></details>
            </div>
            <p v-if="row.reason">{{ row.reason }}</p>
            <p v-if="row.warnings?.length">{{ preview.direction === 'file' ? 'Champs ignorés ou corrigés à l’import' : 'Champs non envoyés à Zotero pour ce type' }} : {{ row.warnings.join(', ') }}</p>
            <p v-if="row.import_warnings?.length">Champs Zotero non importés : {{ row.import_warnings.join(', ') }}</p>
            <details v-if="row.local_csl && row.csl && row.status !== 'unchanged'">
              <summary>Comparer les métadonnées</summary>
              <div class="comparison"><div><strong>Qip</strong><pre>{{ JSON.stringify(row.local_csl, null, 2) }}</pre></div>
                <div><strong>Zotero</strong><pre>{{ JSON.stringify(row.csl, null, 2) }}</pre></div></div>
            </details>
            <p v-if="row.candidates?.length">Correspondances possibles : {{ row.candidates.map(c => `${c.title} (${c.reason})`).join(', ') }}</p>
            <p v-if="row.applied">Déjà traité · cette ligne ne sera pas rejouée.</p>
            <template v-else>
              <label>Décision <select v-model="decisions[row.id].action" :disabled="busy">
                <option value="ignore">Ignorer</option>
                <option v-if="row.status === 'new' || row.status === 'new_remote'" value="create">Créer dans Qip</option>
                <option v-if="row.candidates?.length && (row.status === 'new' || row.status === 'new_remote')" value="link">Lier sans écraser</option>
                <option v-if="row.candidates?.length && (row.status === 'new' || row.status === 'new_remote')" value="update">Mettre à jour Qip</option>
                <option v-if="['remote_changed', 'conflict', 'local_changed', 'unchanged'].includes(row.status)" value="update">Prendre Zotero dans Qip</option>
                <option v-if="['local_new', 'local_changed', 'remote_changed', 'conflict', 'unchanged'].includes(row.status)" value="push">Envoyer Qip vers Zotero</option>
              </select></label>
              <label v-if="['link', 'update'].includes(decisions[row.id].action) && !row.source_id">Source Qip cible
                <select v-model.number="decisions[row.id].source_id" required><option :value="null">Choisir</option>
                  <option v-for="candidate in row.candidates" :key="candidate.id" :value="candidate.id">{{ candidate.title }}</option>
                </select></label>
            </template>
          </article>
        </div>
        <nav v-if="pageCount > 1" class="pages" aria-label="Pages de références">
          <button type="button" :disabled="page === 0" @click="page--">Précédentes</button>
          <span>{{ page + 1 }} / {{ pageCount }}</span>
          <button type="button" :disabled="page + 1 >= pageCount" @click="page++">Suivantes</button>
        </nav>
        <button type="button" :disabled="busy || preview.applied" @click="apply">Appliquer les décisions</button>
        <button type="button" @click="preview = null">Fermer la prévisualisation</button>
      </section>
    </section>
  </div>
</template>

<script setup>
/* global defineProps, defineEmits */
import { computed, onMounted, ref } from 'vue';
import axios from '@/axios.js';

const props = defineProps({ projectId: { type: Number, required: true }, projectName: { type: String, default: '' },
  sources: { type: Array, required: true }, canEdit: { type: Boolean, default: false },
  isOwner: { type: Boolean, default: false }, embedded: { type: Boolean, default: false } });
const emit = defineEmits(['close', 'changed']);
const statusLabels = { new: 'Nouvelle référence du fichier', new_remote: 'Nouvelle dans Zotero',
  local_new: 'Source Qip non liée', local_changed: 'Modifiée dans Qip', remote_changed: 'Modifiée dans Zotero',
  conflict: 'Conflit : modifications des deux côtés', unchanged: 'À jour',
  remote_missing: 'Absente de la collection Zotero : aucune suppression', unmapped: 'Non reconnue' };
const status = ref(null), error = ref(''), notice = ref(''), busy = ref(false);
const libraries = ref([]), collections = ref([]), library = ref(''), collectionKey = ref('');
const preview = ref(null), decisions = ref({}), fileFormat = ref('csl-json'), importFile = ref(null);
const page = ref(0);
const pageSize = 40;
const visibleRows = computed(() => preview.value?.rows.slice(page.value * pageSize, (page.value + 1) * pageSize) || []);
const pageCount = computed(() => Math.ceil((preview.value?.rows.length || 0) / pageSize));
const newWithoutCandidates = computed(() => preview.value?.rows.filter(row => !row.applied &&
  ['new', 'new_remote'].includes(row.status) && !row.candidates?.length) || []);
const chosenCount = computed(() => preview.value?.rows.filter(row => !row.applied &&
  decisions.value[row.id]?.action !== 'ignore').length || 0);
function chooseNew() { newWithoutCandidates.value.forEach(row => { decisions.value[row.id].action = 'create'; }); }
function chooseAllIgnore() { preview.value?.rows.forEach(row => { if (!row.applied) decisions.value[row.id].action = 'ignore'; }); }
function formatCslDate(value) {
  if (!value) return '';
  if (value.raw) return value.raw;
  return (value['date-parts']?.[0] || []).map((part, index) => index ? String(part).padStart(2, '0') : part).join('-');
}
function creatorNames(creators) { return creators.map(row => row.literal || [row.given, row.family].filter(Boolean).join(' ')).join(', '); }
const exportableSources = computed(() => props.sources.filter(source => !source.parent));
const selectedSourceIds = ref(props.sources.filter(source => !source.parent).map(source => source.id));
function report(err) { error.value = JSON.stringify(err.response?.data || err.message); notice.value = ''; }
async function refreshStatus() {
  try { status.value = (await axios.get('/api/v2/zotero/status/', { params: { project: props.projectId } })).data; }
  catch (err) { report(err); }
}
onMounted(refreshStatus);
function showPreview(data) {
  preview.value = data;
  page.value = 0;
  decisions.value = Object.fromEntries(data.rows.map(row => [row.id, { id: row.id, action: 'ignore', source_id: row.source_id || null }]));
  notice.value = 'Comparaison prête : vérifiez les choix avant application.';
}
async function prepareFile() {
  if (!importFile.value || busy.value) return;
  busy.value = true; error.value = '';
  try {
    const body = new FormData(); body.append('project', props.projectId); body.append('format', fileFormat.value);
    body.append('file', importFile.value);
    showPreview((await axios.post('/api/v2/zotero/file/preview/', body)).data);
  } catch (err) { report(err); } finally { busy.value = false; }
}
async function exportFile(format) {
  if (!selectedSourceIds.value.length || busy.value) return;
  busy.value = true; error.value = '';
  try {
    const params = { project: props.projectId, file_format: format, source_ids: selectedSourceIds.value.join(',') };
    if (format === 'ris') {
      const report = (await axios.get('/api/v2/zotero/file/export/', { params: { ...params, manifest: '1' } })).data;
      notice.value = report.warnings.length ? `Champs non exportés en RIS : ${report.warnings.map(row =>
        `${row.title} (${row.fields.join(', ')})`).join(' ; ')}` : 'Aucune perte de champ connue pour cet export RIS.';
    }
    const response = await axios.get('/api/v2/zotero/file/export/', { params: { project: props.projectId,
      file_format: format, source_ids: selectedSourceIds.value.join(',') }, responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a'); link.href = url; link.download = `qip-references.${format === 'ris' ? 'ris' : 'json'}`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (err) { report(err); } finally { busy.value = false; }
}
async function authorize() {
  busy.value = true; error.value = '';
  try {
    const response = await axios.post('/api/v2/zotero/oauth/start/', { project: props.projectId });
    window.location.assign(response.data.authorize_url);
  } catch (err) { report(err); busy.value = false; }
}
async function loadLibraries() {
  busy.value = true; error.value = '';
  try { libraries.value = (await axios.get('/api/v2/zotero/libraries/', { params: { project: props.projectId } })).data; }
  catch (err) { report(err); } finally { busy.value = false; }
}
async function loadCollections() {
  collections.value = []; collectionKey.value = '';
  if (!library.value) return;
  const [kind, id] = library.value.split(':'); busy.value = true; error.value = '';
  try { collections.value = (await axios.get('/api/v2/zotero/collections/', { params: { project: props.projectId, kind, id } })).data; }
  catch (err) { report(err); } finally { busy.value = false; }
}
async function connect() {
  const [kind, library_id] = library.value.split(':'); busy.value = true; error.value = '';
  try {
    await axios.post('/api/v2/zotero/connect/', { project: props.projectId, kind, library_id, collection_key: collectionKey.value });
    await refreshStatus(); notice.value = 'Collection reliée au projet.';
  } catch (err) { report(err); } finally { busy.value = false; }
}
async function prepareSync() {
  busy.value = true; error.value = '';
  try { showPreview((await axios.post('/api/v2/zotero/sync/preview/', { project: props.projectId })).data); }
  catch (err) { report(err); } finally { busy.value = false; }
}
async function apply() {
  if (!preview.value || busy.value) return;
  if (preview.value.rows.some(row => !row.applied && ['link', 'update'].includes(decisions.value[row.id].action) &&
      !decisions.value[row.id].source_id && !row.source_id)) {
    error.value = 'Choisissez une source Qip pour chaque rapprochement.'; return;
  }
  busy.value = true; error.value = '';
  try {
    const response = await axios.post(`/api/v2/zotero/preview/${preview.value.id}/apply/`,
      { decisions: preview.value.rows.map(row => decisions.value[row.id]) });
    notice.value = `${response.data.outcomes.filter(row => row.status === 'applied').length} référence(s) traitée(s).`;
    emit('changed');
  } catch (err) { report(err); }
  finally {
    try { preview.value = (await axios.get(`/api/v2/zotero/preview/${preview.value.id}/`)).data; }
    catch (err) { report(err); }
    busy.value = false;
  }
}
</script>

<style scoped>
.backdrop { position: fixed; inset: 0; z-index: 1100; background: rgba(29,45,61,.6); display: grid; place-items: center; padding: 1rem; }
.modal { position: relative; background: #f8fafc; color: #293c4d; padding: 1.25rem; border-radius: .7rem;
  width: min(920px, 96vw); max-height: 92vh; overflow-y: auto; }
.inline, .inline-content { width: 100%; }.inline-content { color: #293c4d; }
.close { position: absolute; right: .8rem; top: .5rem; background: transparent; border: 0; font-size: 1.8rem; cursor: pointer; }
.block { border-top: 1px solid #c1ced9; padding: .7rem 0; }.block h3 { margin: .3rem 0; }
form, .export { display: flex; align-items: flex-start; flex-wrap: wrap; gap: .5rem; }
label { display: flex; flex-direction: column; gap: .3rem; margin: .4rem 0; }
.choice { flex-direction: row; align-items: center; }.export details { width: 100%; max-height: 10rem; overflow-y: auto; }
input, select { padding: .35rem; border: 1px solid #aebcca; border-radius: .3rem; max-width: 100%; }
button { border: 1px solid #7290a9; border-radius: .35rem; background: #e6edf5; color: #243747; cursor: pointer;
  margin: .2rem; padding: .35rem .55rem; }button:disabled { opacity: .55; cursor: default; }
.preview-list { max-height: 42vh; overflow-y: auto; }.preview-row { border: 1px solid #c1ced9; padding: .65rem; margin: .5rem 0; border-radius: .35rem; }
.inline .preview-list { max-height: none; overflow: visible; }
.preview-row h4 { margin: .1rem; }.preview-row p { margin: .35rem 0; }
.preview-row { overflow-wrap: anywhere; }.field-map { padding: .3rem .6rem; background: #eef4fa; border-radius: .3rem; }
.bulk-actions, .pages { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
.comparison { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .6rem; }
pre { overflow: auto; white-space: pre-wrap; word-break: break-word; font-size: .76rem; }.error { color: #a52b3b; }
@media (max-width: 600px) { .comparison { grid-template-columns: 1fr; } }
</style>
