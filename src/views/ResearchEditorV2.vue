<template>
  <div class="backdrop" @click.self="$emit('close')" @keydown.esc="$emit('close')">
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="editor-title">
      <header class="modal-header">
        <div><span class="context">{{ project?.name || 'Espace de recherche' }}</span>
          <h1 id="editor-title">{{ heading }}</h1></div>
        <button class="close" type="button" @click="$emit('close')" aria-label="Fermer">×</button>
      </header>
      <label class="mobile-section">Section
        <select v-model="active"><optgroup v-if="creationTabs.length" label="Créer">
          <option v-for="name in creationTabs" :key="name" :value="name">{{ labels[name] }}</option>
        </optgroup><optgroup v-if="managementTabs.length" label="Gérer">
          <option v-for="name in managementTabs" :key="name" :value="name">{{ tabLabel(name) }}</option>
        </optgroup></select>
      </label>
      <div class="workspace">
        <nav class="sections" aria-label="Sections du panneau Ajouter">
          <div v-if="creationTabs.length" class="nav-group"><span>Créer</span>
            <button v-for="name in creationTabs" :key="name" type="button" :class="{ active: active === name }"
              :aria-current="active === name ? 'page' : null" @click="active = name">{{ labels[name] }}</button>
          </div>
          <div v-if="managementTabs.length" class="nav-group"><span>Gérer</span>
            <button v-for="name in managementTabs" :key="name" type="button" :class="{ active: active === name }"
              :aria-current="active === name ? 'page' : null" @click="active = name">{{ tabLabel(name) }}</button>
          </div>
        </nav>
        <div class="work-area">
          <div ref="formScroll" class="form-scroll">
      <ResearchZotero v-if="active === 'zotero' && projectId" embedded :project-id="projectId"
        :project-name="project?.name || ''" :sources="sources" :can-edit="canEdit" :is-owner="isOwner"
        @changed="emit('changed')" />
      <p v-if="error" role="alert" class="error">{{ error }}</p>
      <p v-if="message" role="status">{{ message }}</p>

      <form v-if="active === 'project' || active === 'new_project'" id="project-form" @submit.prevent="saveProject">
        <label v-if="projectId && active === 'project'">Nom <input :value="project?.name" readonly /></label>
        <label v-else>Nom <input v-model.trim="projectName" required /></label>
        <label v-if="!projectId || active === 'new_project'">Description <textarea v-model="projectDescription" /></label>
        <label>Fuseau horaire du projet (IANA, ex. Europe/Paris)
          <input v-if="active === 'new_project'" v-model.trim="newProjectTimezone" required placeholder="Europe/Paris" />
          <input v-else v-model.trim="projectTimezone" required placeholder="Europe/Paris"
            :disabled="!!projectId && active === 'project' && !isOwner" /></label>
        <small>Les heures historiques sont interprétées dans ce fuseau ; une date sans heure reste imprécise.</small>
      </form>
      <div v-if="active === 'members' && projectId">
        <div class="member-list"><p v-for="member in memberships" :key="member.id">{{ member.username }} <span>{{ member.role }}</span></p></div>
        <form v-if="isOwner" id="member-form" @submit.prevent="saveMember"><label>Utilisateur <input v-model.trim="memberName" required /></label>
          <label>Rôle <select v-model="memberRole"><option value="viewer">Lecture</option><option value="editor">Édition</option></select></label>
        </form>
      </div>
      <div v-if="active === 'types' && projectId">
        <form v-if="canEdit" id="type-form" @submit.prevent="saveType">
          <label>Usage <select v-model="typeForm.kind" :disabled="!!typeForm.id"><option v-for="kind in typeKinds" :key="kind" :value="kind">{{ labels[kind] }}</option></select></label>
          <label>Nom <input v-model.trim="typeForm.name" required /></label><label>Définition <textarea v-model="typeForm.definition" /></label>
          <label>URI d'alignement (facultative) <input v-model.trim="typeForm.semantic_uri" type="url" /></label>
          <label>Type parent <select v-model="typeForm.parent"><option :value="null">Aucun</option>
            <option v-for="kind in types.filter(t => t.kind === typeForm.kind && t.id !== typeForm.id)" :key="kind.id" :value="kind.id">{{ kind.name }}</option></select></label>
        </form>
      </div>
      <div v-if="active === 'entities' && projectId">
        <form v-if="canEdit" id="entity-form" @submit.prevent="saveEntity" @invalid.capture="revealInvalid">
          <label>Catégorie <select v-model="entityForm.kind" :disabled="!!entityForm.id"><option value="person">Personne</option><option value="geographical_place">Lieu géographique</option><option value="other">Autre</option></select></label>
          <label>Nom <input v-model.trim="entityForm.label" required /></label>
          <label>Type <select v-model="entityForm.type"><option :value="null">Sans type</option><option v-for="kind in typesFor('entity')" :key="kind.id" :value="kind.id">{{ kind.name }}</option></select></label>
          <label>Notice <textarea v-model="entityForm.description" /></label>
          <template v-if="entityForm.kind === 'geographical_place'">
            <label>Latitude WGS84 <input v-model="entityForm.latitude" type="number" step="any" min="-90" max="90" /></label>
            <label>Longitude WGS84 <input v-model="entityForm.longitude" type="number" step="any" min="-180" max="180" /></label>
            <label>Précision sur les coordonnées <input v-model="entityForm.coordinate_note" /></label>
          </template>
          <details v-if="entityForm.kind === 'person'" class="form-section" :open="!!entityForm.id && !!entityForm.birth">
            <summary>Naissance qualifiée <span>Facultative</span></summary><div class="section-content">
            <label>Date connue <input v-model="birthDate" type="date" /></label>
            <label>Lieu de naissance <select v-model="birthPlace"><option :value="null">Inconnu</option><option v-for="place in entities.filter(e => e.kind === 'geographical_place')" :key="place.id" :value="place.id">{{ place.label }}</option></select></label>
            <small>Les mentions divergentes peuvent être conservées comme factoïdes distincts.</small>
            </div></details>
        </form>
      </div>
      <div v-if="active === 'sources' && projectId">
        <form v-if="canEdit" id="source-form" @submit.prevent="saveSource" @invalid.capture="revealInvalid">
          <label class="wide">Titre <input v-model.trim="sourceForm.title" required /></label>
          <label class="wide">Description <textarea v-model="sourceForm.description" /></label>
          <label>Type <select v-model="sourceForm.type"><option :value="null">Sans type</option><option v-for="kind in typesFor('source')" :key="kind.id" :value="kind.id">{{ kind.name }}</option></select></label>
          <label>Auteur / organisme <input v-model="sourceForm.author_label" /></label>
          <label class="wide">Référence / cote <textarea v-model="sourceForm.reference" /></label>
          <details class="form-section" :open="!!sourceForm.id && !!sourceBibliography.type">
            <summary>Référence bibliographique <span>Échange Zotero · facultatif</span></summary><div class="section-content">
            <label>Type de référence <select v-model="sourceBibliography.type">
              <option value="">Pas de métadonnées bibliographiques</option>
              <option value="book">Livre</option><option value="article-journal">Article de revue</option>
              <option value="article-newspaper">Article de presse</option><option value="chapter">Chapitre</option>
              <option value="thesis">Thèse</option><option value="report">Rapport</option>
              <option value="webpage">Page web</option><option value="document">Document</option>
            </select></label>
            <template v-if="sourceBibliography.type">
              <label>Revue / ouvrage <input v-model="sourceBibliography['container-title']" /></label>
              <label>Éditeur <input v-model="sourceBibliography.publisher" /></label>
              <label>DOI <input v-model="sourceBibliography.DOI" /></label>
              <label>ISBN <input v-model="sourceBibliography.ISBN" /></label>
              <label>URL <input v-model="sourceBibliography.URL" type="url" /></label>
              <label>Résumé bibliographique <textarea v-model="sourceBibliography.abstract" /></label>
            </template>
            </div></details>
          <details class="form-section" :open="!!sourceForm.id && (!!sourceForm.date_text || boundFields.some(field => !!sourceForm[field.key]))">
            <summary>Date historique du document <span>Facultative</span></summary><div class="section-content">
            <label>Ce que l'on date <select v-model="sourceForm.date_kind"><option value="production">Production</option><option value="issue">Émission</option><option value="publication">Publication</option></select></label>
            <label>Formulation de la date <input v-model="sourceForm.date_text" placeholder="Ex. vers 1850" /></label>
            <label>Début précis <input v-model="sourceForm.exact_begin" type="date" /></label>
            <label v-if="sourceForm.exact_begin">Heure de début (facultative) <input v-model="sourceForm.exact_begin_time" type="time" /></label>
            <label>Fin précise <input v-model="sourceForm.exact_end" type="date" /></label>
            <label v-if="sourceForm.exact_end">Heure de fin (facultative) <input v-model="sourceForm.exact_end_time" type="time" /></label>
            <details class="advanced-bounds" :open="!!sourceForm.id && boundFields.some(field => !!sourceForm[field.key])">
              <summary>Précision avancée · quatre bornes</summary><div class="dates"><label v-for="field in boundFields" :key="field.key">{{ field.label }}
              <input v-model="sourceForm[field.key]" type="date" :disabled="(field.begin && !!sourceForm.exact_begin) || (!field.begin && !!sourceForm.exact_end)" />
              Heure (facultative) <input v-model="sourceForm[`${field.key}_time`]" type="time"
                :disabled="(field.begin && !!sourceForm.exact_begin) || (!field.begin && !!sourceForm.exact_end) || !sourceForm[field.key]" />
            </label></div></details>
            </div></details>
          <details class="form-section" :open="!!sourceForm.id && (!!otherDatings.length || !!sourceForm.parent || !!sourceForm.locator || !!sourceForm.has_file)">
            <summary>Fichier, parties et autres datations</summary><div class="section-content">
            <label>Partie de <select v-model="sourceForm.parent"><option :value="null">Source autonome</option><option v-for="source in sources.filter(s => s.id !== sourceForm.id)" :key="source.id" :value="source.id">{{ source.title }}</option></select></label>
            <label>Repère (page, paragraphe…) <input v-model="sourceForm.locator" /></label>
            <fieldset><legend>Autres datations du document</legend>
            <div v-for="(dating, index) in otherDatings" :key="index" class="row">
              <select v-model="dating.date_kind"><option value="production">Production</option><option value="issue">Émission</option><option value="publication">Publication</option></select>
              <input v-model="dating.date_text" placeholder="Formulation" />
              <label v-for="field in boundFields" :key="field.key">{{ field.label }}
                <input v-model="dating[field.key]" type="date" />
                <input v-model="dating[`${field.key}_time`]" type="time" :disabled="!dating[field.key]" />
              </label>
              <button type="button" @click="otherDatings.splice(index, 1)">×</button>
            </div>
            <button type="button" @click="otherDatings.push({ date_kind: 'publication', date_text: '', begin_of_begin: null, end_of_end: null, is_primary: false })">Ajouter une datation</button>
          </fieldset>
            <label>Fichier facultatif <input type="file" @change="file = $event.target.files[0] || null" /></label>
            </div></details>
        </form>
      </div>
      <div v-if="active === 'informations' && projectId">
        <p v-if="!typesFor('information').length">Créez d’abord un type d'information dans l’onglet Types.</p>
        <form v-if="canEdit && typesFor('information').length" id="information-form" @submit.prevent="saveInformation" @invalid.capture="revealInvalid">
          <label class="wide">Libellé <input v-model.trim="infoForm.label" required /></label>
          <label>Niveau <select v-model="infoForm.level" :disabled="!!infoForm.id"><option value="factoid">Factoïde (relevé dans une source)</option><option value="qualified">Information qualifiée</option></select></label>
          <label>Type <select v-model="infoForm.type" required><option value="" disabled>Choisir</option><option v-for="type in typesFor('information')" :key="type.id" :value="type.id">{{ type.name }}</option></select></label>
          <label class="wide">Description / qualification <textarea v-model="infoForm.description" /></label>
          <details class="form-section" :open="!!infoForm.id && (!!infoForm.date_text || boundFields.some(field => !!infoForm[field.key]))">
            <summary>Date historique de l'information <span>Facultative</span></summary><div class="section-content">
            <label>Date telle que connue <input v-model="infoForm.date_text" /></label>
            <label>Début précis <input v-model="infoForm.exact_begin" type="date" /></label><label>Fin précise <input v-model="infoForm.exact_end" type="date" /></label>
            <label v-if="infoForm.exact_begin">Heure de début (facultative) <input v-model="infoForm.exact_begin_time" type="time" /></label>
            <label v-if="infoForm.exact_end">Heure de fin (facultative) <input v-model="infoForm.exact_end_time" type="time" /></label>
            <details class="advanced-bounds" :open="!!infoForm.id && boundFields.some(field => !!infoForm[field.key])">
              <summary>Précision avancée · quatre bornes</summary><div class="dates"><label v-for="field in boundFields" :key="field.key">{{ field.label }}
              <input v-model="infoForm[field.key]" type="date" :disabled="(field.begin && !!infoForm.exact_begin) || (!field.begin && !!infoForm.exact_end)" />
              Heure (facultative) <input v-model="infoForm[`${field.key}_time`]" type="time"
                :disabled="(field.begin && !!infoForm.exact_begin) || (!field.begin && !!infoForm.exact_end) || !infoForm[field.key]" />
            </label></div></details>
            </div></details>
          <fieldset><legend>Sources {{ infoForm.level === 'factoid' ? '(au moins une requise)' : '(facultatives)' }}</legend>
            <div v-for="(row, index) in infoForm.citations" :key="index" class="row"><select v-model="row.source" required><option value="" disabled>Source</option><option v-for="source in sources" :key="source.id" :value="source.id">{{ source.title }}</option></select>
              <input v-model="row.locator" placeholder="Passage / page" /><input v-model="row.quotation" placeholder="Citation" /><button type="button" @click="infoForm.citations.splice(index, 1)">×</button></div>
            <button type="button" @click="infoForm.citations.push({ source: '', locator: '', quotation: '', note: '' })">Ajouter une citation</button>
            <button type="button" @click="active = 'sources'">Créer une source</button>
          </fieldset>
          <details class="form-section" :open="!!infoForm.entities.length"><summary>Entités concernées <span>{{ infoForm.entities.length || 'Facultatif' }}</span></summary><div class="section-content"><div v-for="(row, index) in infoForm.entities" :key="index" class="row">
            <select v-model="row.entity" required><option value="" disabled>Entité</option><option v-for="entity in entities" :key="entity.id" :value="entity.id">{{ entity.label }}</option></select>
            <select v-model="row.type" required><option value="" disabled>Relation</option><option v-for="type in typesFor('relation')" :key="type.id" :value="type.id">{{ type.name }}</option></select>
            <button type="button" @click="infoForm.entities.splice(index, 1)">×</button></div>
            <button type="button" @click="infoForm.entities.push({ entity: '', type: '', as_written: '', note: '' })">Ajouter une entité</button></div></details>
          <details v-if="infoForm.level === 'qualified'" class="form-section" :open="!!infoForm.evidence.length">
            <summary>Factoïdes examinés <span>{{ infoForm.evidence.length || 'Facultatif' }}</span></summary><div class="section-content">
            <div v-for="(row, index) in infoForm.evidence" :key="index" class="row"><select v-model="row.factoid_information" required><option value="" disabled>Factoïde</option><option v-for="factoid in informations.filter(i => i.level === 'factoid')" :key="factoid.id" :value="factoid.id">{{ factoid.label }}</option></select>
              <select v-model="row.relation"><option value="supports">Appuie</option><option value="contradicts">Contredit</option><option value="contextualizes">Contextualise</option></select><input v-model="row.note" placeholder="Note" />
              <button type="button" @click="infoForm.evidence.splice(index, 1)">×</button></div>
            <button type="button" @click="infoForm.evidence.push({ factoid_information: '', relation: 'supports', note: '' })">Ajouter un factoïde</button></div></details>
        </form>
      </div>
          </div>
          <footer class="modal-actions">
            <button type="button" class="secondary" @click="$emit('close')">{{ activeForm ? 'Annuler' : 'Fermer' }}</button>
            <button v-if="activeForm" type="submit" :form="activeForm" class="primary" :disabled="saving">
              {{ saving ? 'Enregistrement…' : actionLabel }}
            </button>
          </footer>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
/* global defineProps, defineEmits */
import { computed, nextTick, reactive, ref, watch } from 'vue';
import axios from '@/axios.js';
import ResearchZotero from './ResearchZotero.vue';

const props = defineProps({ tab: { type: String, required: true }, projectId: { type: Number, default: null },
  project: { type: Object, default: null },
  user: { type: Object, default: null }, memberships: { type: Array, required: true },
  types: { type: Array, required: true }, entities: { type: Array, required: true },
  sources: { type: Array, required: true }, informations: { type: Array, required: true },
  editEntry: { type: Object, default: null } });
const emit = defineEmits(['close', 'changed', 'project-created', 'project-updated', 'open-file']);
const labels = { project: 'Projet', members: 'Membres', types: 'Types', entities: 'Entités',
  sources: 'Sources', informations: 'Informations', zotero: 'Zotero', new_project: 'Nouveau projet', source: 'Sources', entity: 'Entités', information: 'Informations', relation: 'Relations' };
const typeKinds = ['source', 'entity', 'information', 'relation'];
const tabs = computed(() => props.projectId ? (canEdit.value
  ? ['informations', 'sources', 'entities', 'types', 'zotero', ...(isOwner.value ? ['members'] : []), 'project', 'new_project']
  : ['zotero', 'project', 'new_project']) : ['project']);
const active = ref(props.tab);
const formScroll = ref(null);
watch(active, async () => {
  error.value = '';
  message.value = '';
  await nextTick();
  formScroll.value?.scrollTo({ top: 0 });
});
const isOwner = computed(() => props.memberships.some(m => m.username === props.user?.username && m.role === 'owner'));
const canEdit = computed(() => props.memberships.some(m => m.username === props.user?.username && ['owner', 'editor'].includes(m.role)));
const creationTabs = computed(() => tabs.value.filter(name => ['informations', 'sources', 'entities', 'types'].includes(name)));
const managementTabs = computed(() => tabs.value.filter(name => !creationTabs.value.includes(name)));
const tabLabel = name => name === 'project' && !props.projectId ? 'Nouveau projet' : labels[name];
const heading = computed(() => ({
  project: props.projectId ? 'Réglages du projet' : 'Nouveau projet', new_project: 'Nouveau projet',
  members: 'Membres du projet', zotero: 'Échanges Zotero',
  types: typeForm.id ? 'Modifier un type' : 'Nouveau type',
  entities: entityForm.id ? 'Modifier une entité' : 'Nouvelle entité',
  sources: sourceForm.id ? 'Modifier une source' : 'Nouvelle source',
  informations: infoForm.id ? 'Modifier une information' : 'Nouvelle information',
})[active.value] || 'Ajouter');
const activeForm = computed(() => ({
  project: !props.projectId || isOwner.value ? 'project-form' : null,
  new_project: 'project-form', members: isOwner.value ? 'member-form' : null,
  types: canEdit.value ? 'type-form' : null, entities: canEdit.value ? 'entity-form' : null,
  sources: canEdit.value ? 'source-form' : null,
  informations: canEdit.value && typesFor('information').length ? 'information-form' : null,
})[active.value] || null);
const actionLabel = computed(() => ({ project: props.projectId ? 'Enregistrer le fuseau' : 'Créer le projet',
  new_project: 'Créer le projet', members: 'Ajouter le membre', types: 'Enregistrer le type',
  entities: 'Enregistrer l’entité', sources: 'Enregistrer la source',
  informations: 'Enregistrer l’information' })[active.value] || 'Enregistrer');
const typesFor = kind => props.types.filter(type => type.kind === kind);
const boundFields = [
  { key: 'begin_of_begin', label: 'Début du début', begin: true }, { key: 'end_of_begin', label: 'Fin du début', begin: true },
  { key: 'begin_of_end', label: 'Début de la fin', begin: false }, { key: 'end_of_end', label: 'Fin de la fin', begin: false },
];
const error = ref(''), message = ref(''), saving = ref(false), file = ref(null);
const projectName = ref(''), projectDescription = ref(''), projectTimezone = ref(props.project?.timezone || 'UTC');
const newProjectTimezone = ref('UTC');
const memberName = ref(''), memberRole = ref('viewer');
const typeForm = reactive({ id: null, kind: 'information', name: '', definition: '', semantic_uri: '', parent: null });
const entityForm = reactive({ id: null, kind: 'person', label: '', description: '', type: null, latitude: '', longitude: '', coordinate_note: '' });
const birthDate = ref(''), birthPlace = ref(null);
const originalBirthDate = ref(''), originalBirthPlace = ref(null);
const emptySource = () => ({ id: null, title: '', type: null, description: '', reference: '', author_label: '', originalAuthorLabel: '', parent: null, locator: '',
  date_kind: 'production', date_text: '', exact_begin: '', exact_end: '', exact_begin_time: '', exact_end_time: '',
  ...Object.fromEntries(boundFields.flatMap(field => [[field.key, ''], [`${field.key}_time`, '']])) });
const sourceForm = reactive(emptySource());
const emptyBibliography = () => ({ type: '', 'container-title': '', publisher: '', DOI: '', ISBN: '', URL: '', abstract: '' });
const sourceBibliography = reactive(emptyBibliography());
const otherDatings = ref([]);
const emptyInfo = () => ({ id: null, level: 'factoid', label: '', description: '', type: '', date_text: '',
  exact_begin: '', exact_end: '', exact_begin_time: '', exact_end_time: '',
  ...Object.fromEntries(boundFields.flatMap(field => [[field.key, ''], [`${field.key}_time`, '']])),
  citations: [], entities: [], evidence: [] });
const infoForm = reactive(emptyInfo());
if (props.editEntry?.resource_kind === 'type') Object.assign(typeForm, props.editEntry);
if (props.editEntry?.resource_kind === 'entity') editEntity(props.editEntry);
if (props.editEntry?.resource_kind === 'source') editSource(props.editEntry);
if (['factoid', 'qualified'].includes(props.editEntry?.resource_kind)) editInfo(props.editEntry);
function resetType() { Object.assign(typeForm, { id: null, kind: 'information', name: '', definition: '', semantic_uri: '', parent: null }); }
function resetEntity() { Object.assign(entityForm, { id: null, kind: 'person', label: '', description: '', type: null, latitude: '', longitude: '', coordinate_note: '' }); birthDate.value = ''; birthPlace.value = null; originalBirthDate.value = ''; originalBirthPlace.value = null; }
function resetSource() { Object.assign(sourceForm, emptySource()); Object.assign(sourceBibliography, emptyBibliography()); file.value = null; otherDatings.value = []; }
function resetInfo() { Object.assign(infoForm, emptyInfo()); }
function editEntity(entity) {
  resetEntity(); Object.assign(entityForm, entity);
  birthPlace.value = entity.birth?.place || null;
  const info = props.informations.find(row => row.id === entity.birth?.information);
  birthDate.value = info?.begin_of_begin === info?.end_of_end ? info?.begin_of_begin || '' : '';
  originalBirthDate.value = birthDate.value;
  originalBirthPlace.value = birthPlace.value;
}
function editSource(source) {
  resetSource(); Object.assign(sourceForm, source);
  sourceForm.originalAuthorLabel = source.author_label;
  Object.assign(sourceBibliography, source.bibliography || {});
  const dating = source.datings.find(row => row.is_primary) || source.datings[0];
  if (dating) Object.assign(sourceForm, dating, { exact_begin: '', exact_end: '', exact_begin_time: '', exact_end_time: '' });
  otherDatings.value = source.datings.filter(row => row !== dating).map(row => ({ ...row }));
  active.value = 'sources';
}
function editInfo(info) { resetInfo(); Object.assign(infoForm, info, { exact_begin: '', exact_end: '', exact_begin_time: '', exact_end_time: '',
  citations: info.citations.map(row => ({ ...row })), entities: info.entities.map(row => ({ ...row })),
  evidence: info.evidence.map(row => ({ ...row })) }); active.value = 'informations'; }
function revealInvalid(event) {
  let section = event.target.closest('details');
  while (section) { section.open = true; section = section.parentElement.closest('details'); }
}
function report(err) {
  error.value = JSON.stringify(err.response?.data || err.message);
  message.value = '';
  nextTick(() => formScroll.value?.scrollTo({ top: 0 }));
}
function success(text) { error.value = ''; message.value = text; emit('changed'); }
async function saveProject() { try {
  if (props.projectId && active.value === 'project') {
    if (!isOwner.value) return;
    const response = await axios.patch(`/api/v2/projects/${props.projectId}/`, { timezone: projectTimezone.value });
    emit('project-updated', response.data); message.value = 'Fuseau enregistré.';
  } else {
    const response = await axios.post('/api/v2/projects/', { name: projectName.value, description: projectDescription.value,
      timezone: active.value === 'new_project' ? newProjectTimezone.value : projectTimezone.value });
    emit('project-created', response.data);
  }
} catch (err) { report(err); } }
async function saveMember() { try { await axios.post('/api/v2/memberships/', { project: props.projectId, username: memberName.value, role: memberRole.value }); memberName.value = ''; success('Membre ajouté.'); } catch (err) { report(err); } }
async function saveType() { try { const payload = { project: props.projectId, kind: typeForm.kind, name: typeForm.name, definition: typeForm.definition, semantic_uri: typeForm.semantic_uri, parent: typeForm.parent };
  await axios[typeForm.id ? 'patch' : 'post'](typeForm.id ? `/api/v2/types/${typeForm.id}/` : '/api/v2/types/', payload); resetType(); success('Type enregistré.'); } catch (err) { report(err); } }
function bounds(form) { const result = {}; for (const field of boundFields) {
  result[field.key] = form[field.key] || null;
  result[`${field.key}_time`] = result[field.key] ? form[`${field.key}_time`] || null : null;
}
  if (form.exact_begin) { result.begin_of_begin = form.exact_begin; result.end_of_begin = form.exact_begin;
    result.begin_of_begin_time = form.exact_begin_time || null; result.end_of_begin_time = form.exact_begin_time || null; }
  if (form.exact_end) { result.begin_of_end = form.exact_end; result.end_of_end = form.exact_end;
    result.begin_of_end_time = form.exact_end_time || null; result.end_of_end_time = form.exact_end_time || null; }
  return result; }
async function saveEntity() {
  try {
    const payload = { project: props.projectId, kind: entityForm.kind, label: entityForm.label, description: entityForm.description, type: entityForm.type };
    if (entityForm.kind === 'geographical_place') Object.assign(payload, { latitude: entityForm.latitude || null, longitude: entityForm.longitude || null, coordinate_note: entityForm.coordinate_note || '' });
    const response = await axios[entityForm.id ? 'patch' : 'post'](entityForm.id ? `/api/v2/entities/${entityForm.id}/` : '/api/v2/entities/', payload);
    const entity = response.data;
    if (entity.kind === 'person' && (birthDate.value || birthPlace.value || entity.birth) &&
        (!entity.birth || birthDate.value !== originalBirthDate.value || birthPlace.value !== originalBirthPlace.value)) {
      let birthInfo = entity.birth?.information;
      if (!birthInfo) {
        let birthType = typesFor('information').find(t => t.name === 'Naissance');
        if (!birthType) birthType = (await axios.post('/api/v2/types/', { project: props.projectId, kind: 'information', name: 'Naissance' })).data;
        birthInfo = (await axios.post('/api/v2/informations/', { project: props.projectId, level: 'qualified', type: birthType.id,
          label: `Naissance de ${entity.label}`, ...(birthDate.value ? { begin_of_begin: birthDate.value, end_of_begin: birthDate.value, begin_of_end: birthDate.value, end_of_end: birthDate.value } : {}) })).data.id;
        await axios.post('/api/v2/person-births/', { person: entity.id, information: birthInfo, place: birthPlace.value });
      } else {
        if (birthDate.value !== originalBirthDate.value) await axios.patch(`/api/v2/informations/${birthInfo}/`,
          Object.fromEntries(boundFields.map(f => [f.key, birthDate.value || null])));
        if (!birthDate.value && !birthPlace.value) await axios.delete(`/api/v2/person-births/${entity.birth.id}/`);
        else await axios.patch(`/api/v2/person-births/${entity.birth.id}/`, { place: birthPlace.value });
      }
    }
    resetEntity(); success('Entité enregistrée.');
  } catch (err) { report(err); }
}
async function saveSource() {
  if (saving.value) return; saving.value = true;
  try {
    const payload = { project: props.projectId, title: sourceForm.title, type: sourceForm.type, description: sourceForm.description,
      reference: sourceForm.reference, author_label: sourceForm.author_label, parent: sourceForm.parent, locator: sourceForm.locator };
    if (sourceBibliography.type) {
      payload.bibliography = { ...(sourceForm.bibliography || {}), ...sourceBibliography, title: sourceForm.title };
      if (!sourceForm.bibliography?.author || sourceForm.author_label !== sourceForm.originalAuthorLabel) {
        payload.bibliography.author = sourceForm.author_label ? [{ literal: sourceForm.author_label }] : [];
      }
    }
    const span = bounds(sourceForm);
    payload.datings = [
      ...(Object.values(span).some(Boolean) || sourceForm.date_text
        ? [{ date_kind: sourceForm.date_kind, date_text: sourceForm.date_text, is_primary: true, ...span }] : []),
       ...otherDatings.value.map(dating => ({ date_kind: dating.date_kind, date_text: dating.date_text,
         ...bounds(dating), is_primary: false })),
    ];
    if (file.value) {
      const contentType = file.value.type || 'application/octet-stream'; let upload;
      if (import.meta.env.VITE_QIP_STORAGE_MODE === 'local') {
        const data = new FormData(); data.append('project', props.projectId); data.append('file', file.value);
        upload = (await axios.post('/api/v2/sources/upload-file/', data)).data;
      } else {
        upload = (await axios.post('/api/v2/sources/upload-url/', { project: props.projectId, filename: file.value.name, content_type: contentType })).data;
        const result = await fetch(upload.signed_url, { method: 'PUT', body: file.value, headers: { 'Content-Type': contentType }, credentials: 'omit' });
        if (!result.ok) throw new Error(`Téléversement impossible (${result.status})`);
      }
      payload.storage_key = upload.storage_key; payload.content_type = contentType;
    }
    const saved = (await axios[sourceForm.id ? 'patch' : 'post'](sourceForm.id ? `/api/v2/sources/${sourceForm.id}/` : '/api/v2/sources/', payload)).data;
    resetSource(); error.value = ''; message.value = 'Source enregistrée.'; emit('changed', { source: saved });
  } catch (err) { report(err); } finally { saving.value = false; }
}
async function saveInformation() {
  try {
    const payload = { project: props.projectId, level: infoForm.level, type: infoForm.type, label: infoForm.label,
      description: infoForm.description, date_text: infoForm.date_text, ...bounds(infoForm),
      citations: infoForm.citations, entities: infoForm.entities, evidence: infoForm.evidence };
    const saved = (await axios[infoForm.id ? 'patch' : 'post'](infoForm.id ? `/api/v2/informations/${infoForm.id}/` : '/api/v2/informations/', payload)).data;
    emit('changed', { information: saved }); emit('close');
  } catch (err) { report(err); }
}
</script>

<style scoped>
.backdrop { position: fixed; inset: 0; z-index: 1100; background: #13293baf; display: grid;
  place-items: center; padding: 1rem; }
.modal { display: flex; flex-direction: column; width: min(1020px, 96vw); height: min(760px, 92vh);
  min-height: 0; overflow: hidden; border-radius: .85rem; background: #f8fafc; color: #293c4d;
  box-shadow: 0 22px 65px #14283b52; }
.modal-header { flex: none; display: flex; justify-content: space-between; align-items: center;
  padding: 1.15rem 1.5rem 1rem; border-bottom: 1px solid #dce5ed; background: white; }
.context { color: #637a8d; font-size: .76rem; font-weight: 650; }
.modal-header h1 { margin: .18rem 0 0; font-size: 1.32rem; line-height: 1.2; }
.close { border: 0; background: transparent; color: #667f91; font-size: 1.6rem; line-height: 1;
  padding: .35rem .55rem; border-radius: .35rem; cursor: pointer; }
.close:hover { background: #e7edf3; color: #243d50; }
.workspace { display: flex; flex: 1; min-height: 0; }
.sections { flex: 0 0 190px; overflow-y: auto; padding: 1.15rem .7rem;
  background: #edf3f7; border-right: 1px solid #dce5ed; }
.nav-group + .nav-group { margin-top: 1.45rem; padding-top: 1.1rem; border-top: 1px solid #d7e2ea; }
.nav-group > span { display: block; padding: 0 .65rem .5rem; text-transform: uppercase;
  font-size: .65rem; letter-spacing: .1em; font-weight: 700; color: #72899b; }
.nav-group button { width: 100%; border: 0; background: transparent; color: #405b70;
  text-align: left; padding: .62rem .65rem; border-radius: .45rem; cursor: pointer; }
.nav-group button:hover { background: #dfeaf1; }
.nav-group button.active { color: #23445e; background: #d4e6f1; font-weight: 700;
  box-shadow: inset 3px 0 #427795; }
.work-area { display: flex; flex-direction: column; flex: 1; min-width: 0; min-height: 0; }
.form-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 1.5rem clamp(1.15rem, 3vw, 2rem) 2rem; }
.form-scroll > :first-child { margin-top: 0; }
form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem 1.1rem;
  align-items: start; }
label { display: flex; flex-direction: column; gap: .35rem; min-width: 0; font-size: .84rem; font-weight: 600; }
label.wide, form > fieldset, form > details, form > small { grid-column: 1 / -1; }
input, textarea, select { width: 100%; min-width: 0; max-width: 100%; border: 1px solid #b8c8d4;
  border-radius: .4rem; padding: .54rem .6rem; background: white; color: #293c4d; font-size: .88rem; font-weight: 400; }
input:focus-visible, textarea:focus-visible, select:focus-visible, button:focus-visible, summary:focus-visible {
  outline: 2px solid #5794b7; outline-offset: 2px; }
textarea { min-height: 5rem; resize: vertical; }
fieldset { min-width: 0; padding: 1rem; border: 1px solid #d4e0e8; border-radius: .55rem; }
legend { padding: 0 .4rem; color: #3b586c; font-weight: 700; font-size: .85rem; }
.form-section { min-width: 0; border: 1px solid #d4e0e8; border-radius: .55rem; background: #fff; }
.form-section summary { display: flex; align-items: center; gap: .6rem; cursor: pointer;
  padding: .9rem 1rem; color: #304d63; font-size: .87rem; font-weight: 700; list-style: none; }
.form-section summary::-webkit-details-marker { display: none; }
.form-section summary::before { content: '›'; font-size: 1.2rem; line-height: .7; color: #62839c; transition: transform .15s; }
.form-section[open] summary::before { transform: rotate(90deg); }
.form-section summary span { color: #7a8e9d; font-size: .73rem; font-weight: 500; margin-left: auto; }
.form-section[open] summary { border-bottom: 1px solid #e3ebf0; }
.section-content { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .9rem 1rem; padding: 1rem; }
.section-content > fieldset, .section-content > .dates, .section-content > small,
.section-content > button, .section-content > .row, .section-content > .advanced-bounds { grid-column: 1 / -1; }
.section-content > label:has(textarea), .section-content > label:has(input[type='file']) { grid-column: 1 / -1; }
.dates { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .8rem; }
.advanced-bounds { border-top: 1px solid #e3ebf0; padding-top: .7rem; }
.advanced-bounds summary { cursor: pointer; color: #42647b; font-size: .82rem; }
.advanced-bounds .dates { padding-top: .85rem; }
.row { display: flex; align-items: center; flex-wrap: wrap; gap: .5rem; margin: .5rem 0; }
.row select, .row input { flex: 1 1 145px; width: auto; }
.row label { flex: 1 1 170px; }
.member-list { margin-bottom: 1.2rem; }.member-list p { display: flex; justify-content: space-between;
  padding: .6rem .75rem; margin: 0; border-bottom: 1px solid #e2e9ef; }
.member-list span { color: #667f91; }
.modal-actions { flex: none; display: flex; align-items: center; justify-content: flex-end; gap: .65rem;
  padding: .85rem clamp(1.15rem, 3vw, 2rem); border-top: 1px solid #dce5ed; background: white; }
button { padding: .48rem .7rem; border-radius: .4rem; border: 1px solid #91aabd;
  background: #e7eff4; color: #28485f; cursor: pointer; }
.modal-actions button { padding: .57rem .9rem; font-weight: 650; }
.modal-actions .secondary { border-color: transparent; background: transparent; }
.modal-actions .primary { border-color: #355f7a; background: #355f7a; color: #fff; }
.modal-actions .primary:hover { background: #294f68; }
button:disabled { opacity: .5; cursor: default; }
.error { color: #a52b3b; background: #fff0f2; border-radius: .4rem; padding: .65rem .8rem; }
.mobile-section { display: none; }
@media (max-width: 700px) {
  .backdrop { padding: 0; }
  .modal { width: 100%; height: 100%; border-radius: 0; }
  .modal-header { padding: .9rem 1rem; }
  .mobile-section { display: flex; padding: .65rem 1rem; background: #edf3f7; border-bottom: 1px solid #dce5ed; }
  .mobile-section select { margin-top: .25rem; }
  .sections { display: none; }
  .form-scroll { padding: 1.1rem 1rem 2rem; }
  .modal-actions { padding: .75rem 1rem; }
  form, .section-content, .dates { grid-template-columns: 1fr; }
}
</style>
