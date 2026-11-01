<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <section class="modal-content" role="dialog" aria-modal="true" aria-label="Saisie et gestion de la recherche">
      <button type="button" class="close-modal" aria-label="Fermer" @click="$emit('close')">×</button>
      <nav class="tabs" aria-label="Saisie">
        <button v-for="entry in availableTabs" :key="entry" type="button" :class="{ active: activeTab === entry }"
          @click="activeTab = entry">{{ tabNames[entry] }}</button>
      </nav>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="message" role="status">{{ message }}</p>

      <template v-if="activeTab === 'project'">
        <h2>Nouveau projet</h2>
        <form class="form" @submit.prevent="createProject">
          <label>Nom <input v-model.trim="projectName" required /></label>
          <label>Description <textarea v-model="projectDescription" /></label>
          <button type="submit">Créer le projet</button>
        </form>
      </template>

      <template v-if="projectId && activeTab === 'members'">
        <h2>Membres du projet</h2>
        <ul><li v-for="member in memberships" :key="member.id">{{ member.username }} — {{ member.role }}</li></ul>
        <form v-if="isOwner" class="form" @submit.prevent="addMember">
          <label>Utilisateur inscrit <input v-model.trim="newMember" required /></label>
          <label>Accès <select v-model="newRole"><option value="viewer">Lecture</option><option value="editor">Édition</option></select></label>
          <button type="submit">Ajouter</button>
        </form>
      </template>

      <template v-if="projectId && activeTab === 'types'">
        <h2>Types</h2>
        <form v-if="canEdit" class="form" @submit.prevent="saveType">
          <label>Nom <input v-model.trim="typeForm.name" required /></label>
          <label>Définition <textarea v-model="typeForm.definition" /></label>
          <label>URI sémantique <input v-model.trim="typeForm.semantic_uri" type="url" /></label>
          <label>Type parent <select v-model="typeForm.parent"><option :value="null">Aucun</option>
            <option v-for="kind in types.filter(kind => kind.id !== typeForm.id)" :key="kind.id" :value="kind.id">{{ kind.name }}</option>
          </select></label>
          <button>{{ typeForm.id ? 'Enregistrer' : 'Créer un type' }}</button>
          <button v-if="typeForm.id" type="button" @click="resetType">Annuler</button>
        </form>
        <ul><li v-for="kind in types" :key="kind.id">{{ kind.name }} — {{ kind.definition }}
          <button v-if="canEdit" type="button" @click="editType(kind)">Modifier</button></li></ul>
      </template>

      <template v-if="projectId && activeTab === 'entities'">
        <h2>Entities</h2>
        <form v-if="canEdit" class="form" @submit.prevent="saveEntity">
          <label>Nom <input v-model.trim="entityForm.label" required /></label>
          <label>Type <select v-model="entityForm.type"><option :value="null">Sans type</option>
            <option v-for="kind in types" :key="kind.id" :value="kind.id">{{ kind.name }}</option>
          </select></label>
          <label>Notice <textarea v-model="entityForm.description" /></label>
          <button>{{ entityForm.id ? 'Enregistrer' : 'Créer une entity' }}</button>
          <button v-if="entityForm.id" type="button" @click="resetEntity">Annuler</button>
        </form>
        <ul><li v-for="entity in entities" :key="entity.id">{{ entity.label }} — {{ entity.description }}
          <button v-if="canEdit" type="button" @click="editEntity(entity)">Modifier</button></li></ul>
      </template>

      <template v-if="projectId && activeTab === 'media'">
        <h2>Media · document ou partie</h2>
        <form v-if="canEdit" class="form" @submit.prevent="saveMedia">
          <label>Titre <input v-model.trim="mediaForm.title" required /></label>
          <label>Description <textarea v-model="mediaForm.description" /></label>
          <label>Auteur ou organisme <input v-model.trim="mediaForm.author_label" /></label>
          <label>Date telle que connue <input v-model.trim="mediaForm.date_text" /></label>
          <label>Référence ou cote <textarea v-model="mediaForm.reference" /></label>
          <label>Partie de <select v-model="mediaForm.parent"><option :value="null">Document autonome</option>
            <option v-for="entry in media.filter(entry => entry.id !== mediaForm.id)" :key="entry.id" :value="entry.id">{{ entry.title }}</option>
          </select></label>
          <label>Repère (page, paragraphe…) <input v-model.trim="mediaForm.locator" /></label>
          <label>Fichier facultatif <input type="file" @change="selectedFile = $event.target.files[0] || null" /></label>
          <button :disabled="uploading">{{ uploading ? 'Téléversement…' : (mediaForm.id ? 'Enregistrer' : 'Créer le média') }}</button>
          <button v-if="mediaForm.id" type="button" @click="resetMedia">Annuler</button>
        </form>
        <ul><li v-for="entry in media" :key="entry.id">{{ entry.title }} {{ entry.locator }}
          <button v-if="entry.has_file" type="button" @click="$emit('open-file', entry)">Ouvrir</button>
          <button v-if="canEdit" type="button" @click="editMedia(entry)">Modifier</button></li></ul>
      </template>

      <template v-if="projectId && activeTab === 'items'">
        <h2>{{ itemForm.id ? 'Modifier l’item' : 'Nouvel item' }}</h2>
        <p v-if="!types.length">Créez d’abord un <button type="button" @click="activeTab = 'types'">type</button> pour cet item.</p>
        <form v-if="canEdit && types.length" class="form" @submit.prevent="saveItem">
          <label>Libellé <input v-model.trim="itemForm.label" required /></label>
          <div class="row">
            <label>Type <select v-model="itemForm.type" required><option value="" disabled>Choisir</option>
              <option v-for="kind in types" :key="kind.id" :value="kind.id">{{ kind.name }}</option>
            </select></label>
            <label>Statut épistémique <select v-model="itemForm.epistemic_status" required><option value="" disabled>Choisir</option>
              <option v-for="status in statuses" :key="status.id" :value="status.id">{{ status.label }}</option>
            </select></label>
          </div>
          <label>Description <textarea v-model="itemForm.description" /></label>
          <label>Date selon le média <input v-model="itemForm.date_text" placeholder="Ex. : vers 2001" /></label>
          <fieldset><legend>Temporalité · bornes facultatives</legend>
            <div class="dates">
              <label>Début précis <input type="date" v-model="itemForm.exact_begin" /></label>
              <label>Fin précise <input type="date" v-model="itemForm.exact_end" /></label>
              <label>Début du début <input type="date" v-model="itemForm.begin_of_begin" :disabled="!!itemForm.exact_begin" /></label>
              <label>Fin du début <input type="date" v-model="itemForm.end_of_begin" :disabled="!!itemForm.exact_begin" /></label>
              <label>Début de la fin <input type="date" v-model="itemForm.begin_of_end" :disabled="!!itemForm.exact_end" /></label>
              <label>Fin de la fin <input type="date" v-model="itemForm.end_of_end" :disabled="!!itemForm.exact_end" /></label>
            </div>
          </fieldset>
          <fieldset><legend>Entities participantes</legend>
            <div v-for="(row, index) in itemForm.entity_participations" :key="index" class="row">
              <select v-model="row.entity" required><option value="" disabled>Entity</option><option v-for="entity in entities" :key="entity.id" :value="entity.id">{{ entity.label }}</option></select>
              <select v-model="row.type" required><option value="" disabled>Type de participation</option><option v-for="kind in types" :key="kind.id" :value="kind.id">{{ kind.name }}</option></select>
              <input v-model="row.as_written" placeholder="Nom selon le média" />
              <button type="button" @click="itemForm.entity_participations.splice(index, 1)">×</button>
            </div>
            <button type="button" @click="itemForm.entity_participations.push({ entity: '', type: '', as_written: '' })">Ajouter une entity</button>
            <button type="button" @click="activeTab = 'entities'">Créer une entity</button>
          </fieldset>
          <fieldset><legend>Autres items participants</legend>
            <div v-for="(row, index) in itemForm.item_participations" :key="index" class="row">
              <select v-model="row.participant" required><option value="" disabled>Item</option><option v-for="entry in items.filter(entry => entry.id !== itemForm.id)" :key="entry.id" :value="entry.id">{{ entry.label }}</option></select>
              <select v-model="row.type" required><option value="" disabled>Type de participation</option><option v-for="kind in types" :key="kind.id" :value="kind.id">{{ kind.name }}</option></select>
              <button type="button" @click="itemForm.item_participations.splice(index, 1)">×</button>
            </div>
            <button type="button" @click="itemForm.item_participations.push({ participant: '', type: '' })">Ajouter un item</button>
          </fieldset>
          <fieldset><legend>Appuis documentaires · facultatifs</legend>
            <div v-for="(row, index) in itemForm.media_references" :key="index" class="row">
              <select v-model="row.media" required><option value="" disabled>Média</option><option v-for="entry in media" :key="entry.id" :value="entry.id">{{ entry.title }}</option></select>
              <input v-model="row.locator" placeholder="Page, passage…" />
              <input v-model="row.note" placeholder="Note" />
              <button type="button" @click="itemForm.media_references.splice(index, 1)">×</button>
            </div>
            <button type="button" @click="itemForm.media_references.push({ media: '', locator: '', note: '' })">Joindre un média</button>
            <button type="button" @click="activeTab = 'media'">Créer un média et joindre un fichier</button>
          </fieldset>
          <button>{{ itemForm.id ? 'Enregistrer l’item' : 'Créer l’item' }}</button>
        </form>
      </template>
    </section>
  </div>
</template>

<script setup>
/* global defineProps, defineEmits */
import { computed, reactive, ref } from 'vue';
import axios from '@/axios.js';

const props = defineProps({ tab: { type: String, required: true }, projectId: { type: Number, default: null },
  user: { type: Object, default: null }, memberships: { type: Array, required: true },
  types: { type: Array, required: true }, entities: { type: Array, required: true },
  media: { type: Array, required: true }, items: { type: Array, required: true },
  statuses: { type: Array, required: true }, editItem: { type: Object, default: null } });
const emit = defineEmits(['close', 'changed', 'project-created', 'open-file']);
const activeTab = ref(props.tab);
const tabNames = { items: 'Item', entities: 'Entities', media: 'Media', types: 'Types', members: 'Membres', project: 'Projet' };
const isOwner = computed(() => props.memberships.some(member => member.username === props.user?.username && member.role === 'owner'));
const canEdit = computed(() => props.memberships.some(member => member.username === props.user?.username && ['owner', 'editor'].includes(member.role)));
const availableTabs = computed(() => props.projectId ? ['items', 'entities', 'media', 'types', ...(isOwner.value ? ['members'] : []), 'project'] : ['project']);
const error = ref(''), message = ref(''), uploading = ref(false), selectedFile = ref(null);
const projectName = ref(''), projectDescription = ref(''), newMember = ref(''), newRole = ref('viewer');
const typeForm = reactive({ id: null, name: '', definition: '', semantic_uri: '', parent: null });
const entityForm = reactive({ id: null, label: '', description: '', type: null });
const mediaForm = reactive({ id: null, title: '', description: '', reference: '', author_label: '', date_text: '', parent: null, locator: '' });
function emptyItem() { return { id: null, label: '', description: '', type: '', epistemic_status: '', date_text: '',
  exact_begin: '', exact_end: '', begin_of_begin: '', end_of_begin: '', begin_of_end: '', end_of_end: '',
  entity_participations: [], item_participations: [], media_references: [] }; }
const itemForm = reactive(emptyItem());
if (props.editItem) Object.assign(itemForm, props.editItem, { exact_begin: '', exact_end: '',
  entity_participations: props.editItem.entity_participations.map(row => ({ ...row })),
  item_participations: props.editItem.item_participations.map(row => ({ ...row })),
  media_references: props.editItem.media_references.map(row => ({ ...row })),
});
function resetType() { Object.assign(typeForm, { id: null, name: '', definition: '', semantic_uri: '', parent: null }); }
function resetEntity() { Object.assign(entityForm, { id: null, label: '', description: '', type: null }); }
function resetMedia() { Object.assign(mediaForm, { id: null, title: '', description: '', reference: '', author_label: '', date_text: '', parent: null, locator: '' }); selectedFile.value = null; }
function editType(kind) { Object.assign(typeForm, kind); }
function editEntity(entity) { Object.assign(entityForm, entity); }
function editMedia(entry) { resetMedia(); Object.assign(mediaForm, entry); }
function report(err) { error.value = JSON.stringify(err.response?.data || err.message); message.value = ''; }
function success(text) { error.value = ''; message.value = text; emit('changed'); }
async function createProject() {
  try { const result = await axios.post('/api/v1/projects/', { name: projectName.value, description: projectDescription.value }); emit('project-created', result.data); }
  catch (err) { report(err); }
}
async function addMember() {
  try {
    await axios.post('/api/v1/memberships/', { project: props.projectId, username: newMember.value, role: newRole.value });
    newMember.value = ''; success('Membre ajouté.');
  } catch (err) { report(err); }
}
async function saveSimple(collection, form, reset) {
  const payload = { ...form, project: props.projectId };
  delete payload.id; delete payload.created_by; delete payload.created_at;
  try {
    if (form.id) await axios.patch(`/api/v1/${collection}/${form.id}/`, payload);
    else await axios.post(`/api/v1/${collection}/`, payload);
    reset(); success('Enregistré.');
  } catch (err) { report(err); }
}
function saveType() { return saveSimple('types', typeForm, resetType); }
function saveEntity() { return saveSimple('entities', entityForm, resetEntity); }
async function saveMedia() {
  if (uploading.value) return;
  uploading.value = true;
  try {
    const payload = { project: props.projectId, title: mediaForm.title, description: mediaForm.description,
      reference: mediaForm.reference, author_label: mediaForm.author_label, date_text: mediaForm.date_text,
      parent: mediaForm.parent, locator: mediaForm.locator };
    if (selectedFile.value) {
      const file = selectedFile.value;
      const contentType = file.type || 'application/octet-stream';
      let upload;
      if (import.meta.env.VITE_QIP_STORAGE_MODE === 'local') {
        const data = new FormData(); data.append('project', props.projectId); data.append('file', file);
        upload = (await axios.post('/api/v1/media/upload-file/', data)).data;
      } else {
        upload = (await axios.post('/api/v1/media/upload-url/', {
          project: props.projectId, filename: file.name, content_type: contentType,
        })).data;
        const put = await fetch(upload.signed_url, { method: 'PUT', body: file,
          headers: { 'Content-Type': contentType }, credentials: 'omit' });
        if (!put.ok) throw new Error(`Téléversement impossible (${put.status})`);
      }
      payload.storage_key = upload.storage_key;
      payload.content_type = contentType;
    }
    if (mediaForm.id) await axios.patch(`/api/v1/media/${mediaForm.id}/`, payload);
    else await axios.post('/api/v1/media/', payload);
    resetMedia(); success('Média enregistré. Vous pouvez maintenant le relier à un item.');
  } catch (err) { report(err); }
  finally { uploading.value = false; }
}
async function saveItem() {
  const payload = { project: props.projectId, label: itemForm.label, description: itemForm.description,
    type: itemForm.type, epistemic_status: itemForm.epistemic_status, date_text: itemForm.date_text,
    entity_participations: itemForm.entity_participations, item_participations: itemForm.item_participations,
    media_references: itemForm.media_references };
  for (const key of ['begin_of_begin', 'end_of_begin', 'begin_of_end', 'end_of_end']) {
    if ((['begin_of_begin', 'end_of_begin'].includes(key) && itemForm.exact_begin) ||
        (['begin_of_end', 'end_of_end'].includes(key) && itemForm.exact_end)) continue;
    payload[key] = itemForm[key] || null;
  }
  if (itemForm.exact_begin) payload.exact_begin = itemForm.exact_begin;
  if (itemForm.exact_end) payload.exact_end = itemForm.exact_end;
  try {
    const saved = itemForm.id
      ? await axios.patch(`/api/v1/items/${itemForm.id}/`, payload)
      : await axios.post('/api/v1/items/', payload);
    emit('changed', { item: saved.data }); emit('close');
  } catch (err) { report(err); }
}
</script>

<style scoped>
.modal-backdrop { position: fixed; inset: 0; z-index: 1100; background: rgba(29,45,61,.6); display: grid; place-items: center; padding: 1rem; }
.modal-content { position: relative; background: #f8fafc; color: #293c4d; padding: 1.25rem; border-radius: .7rem; width: min(760px, 96vw); max-height: 90vh; overflow-y: auto; }
.close-modal { position: absolute; right: .8rem; top: .5rem; background: transparent; border: 0; font-size: 1.8rem; }
.tabs { display: flex; flex-wrap: wrap; gap: .35rem; padding-right: 2rem; border-bottom: 1px solid #bdcbd8; }
.tabs button { padding: .45rem .7rem; }
.tabs .active { background: #4b6075; color: white; }
.form { display: flex; flex-direction: column; gap: .6rem; align-items: flex-start; }
.form label { display: flex; flex-direction: column; gap: .2rem; width: min(100%, 35rem); }
.form input, .form textarea, .form select, .row input, .row select { border: 1px solid #abbac7; border-radius: .3rem; padding: .35rem; max-width: 100%; }
.form textarea { min-height: 4rem; }
.form fieldset { width: 100%; border: 1px solid #bdcbd8; border-radius: .4rem; }
.dates { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: .5rem; }
.row { display: flex; align-items: center; flex-wrap: wrap; gap: .4rem; margin: .5rem 0; }
.row label { width: auto; }
button { padding: .4rem .65rem; border-radius: .3rem; border: 1px solid #6c8aa8; background: #e7edf3; cursor: pointer; }
button:disabled { cursor: wait; opacity: .5; }
ul { padding-left: 1.3rem; } li { margin: .35rem 0; }
.error { color: #a52b3b; }
@media (max-width: 600px) { .dates { grid-template-columns: 1fr; } }
</style>
