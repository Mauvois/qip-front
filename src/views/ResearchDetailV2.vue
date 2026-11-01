<template>
  <div class="backdrop" @click.self="$emit('close')">
    <article class="modal" role="dialog" aria-modal="true" :aria-label="record?.title || record?.label || 'Détail'">
      <button type="button" class="close" aria-label="Fermer" @click="$emit('close')">×</button>
      <h2>{{ record?.title || record?.label }}</h2>
      <p><strong>{{ entry.resource_kind === 'source' ? 'Source' : entry.resource_kind === 'factoid' ? 'Factoïde' : 'Information qualifiée' }}</strong>
        · {{ entry.time_axis === 'historical' ? 'Temps historique' : 'Consignation dans Qip' }}</p>
      <p><strong>Consignée le :</strong> {{ format(record?.created_at) }}</p>
      <p v-if="record?.updated_at"><strong>Dernière modification :</strong> {{ format(record.updated_at) }}</p>
      <p v-if="record?.description">{{ record.description }}</p>
      <template v-if="entry.resource_kind === 'source'">
        <p v-if="record?.reference"><strong>Référence :</strong> {{ record.reference }}</p>
        <p v-if="record?.author_label"><strong>Auteur / organisme :</strong> {{ record.author_label }}</p>
        <p v-if="record?.locator"><strong>Repère :</strong> {{ record.locator }}</p>
        <section v-if="record?.bibliography"><h3>Référence bibliographique</h3>
          <p v-if="record.bibliography.type"><strong>Type CSL :</strong> {{ record.bibliography.type }}</p>
          <p v-if="record.bibliography['container-title']"><strong>Revue / ouvrage :</strong> {{ record.bibliography['container-title'] }}</p>
          <p v-if="record.bibliography.publisher"><strong>Éditeur :</strong> {{ record.bibliography.publisher }}</p>
          <p v-if="record.bibliography.volume || record.bibliography.issue || record.bibliography.page">
            <strong>Volume / numéro / pages :</strong> {{ [record.bibliography.volume, record.bibliography.issue, record.bibliography.page].filter(Boolean).join(' · ') }}</p>
          <p v-if="record.bibliography.DOI"><strong>DOI :</strong> {{ record.bibliography.DOI }}</p>
          <p v-if="record.bibliography.ISBN"><strong>ISBN :</strong> {{ record.bibliography.ISBN }}</p>
          <p v-if="record.bibliography.ISSN"><strong>ISSN :</strong> {{ record.bibliography.ISSN }}</p>
          <p v-if="record.bibliography.accessed"><strong>Consulté le :</strong> {{ bibliographicDate(record.bibliography.accessed) }}</p>
          <p v-if="record.bibliography.URL"><a :href="record.bibliography.URL" target="_blank" rel="noopener noreferrer">Ouvrir l'URL de la référence</a></p>
          <p v-if="record.bibliography.abstract">{{ record.bibliography.abstract }}</p>
          <details><summary>Toutes les métadonnées CSL</summary><pre>{{ JSON.stringify(record.bibliography, null, 2) }}</pre></details>
        </section>
        <p v-for="dating in record?.datings || []" :key="dating.id"><strong>{{ dateKinds[dating.date_kind] }} :</strong>
          {{ dating.date_text }} <span v-if="span(dating)">{{ span(dating) }}</span>{{ dating.is_primary ? ' · date principale' : '' }}</p>
        <button v-if="record?.has_file" type="button" @click="$emit('open-file', record)">Ouvrir le document</button>
      </template>
      <template v-else>
        <p v-if="record?.date_text"><strong>Date historique :</strong> {{ record.date_text }}</p>
        <p v-if="span(record)"><strong>Bornes :</strong> {{ span(record) }}</p>
        <section v-if="record?.citations?.length"><h3>Sources</h3>
          <p v-for="(citation, index) in record.citations" :key="index">
            {{ sources.find(s => s.id === citation.source)?.title || `#${citation.source}` }} · {{ citation.locator }}
            <span v-if="citation.quotation">« {{ citation.quotation }} »</span>
            <button v-if="sources.find(s => s.id === citation.source)?.has_file" type="button"
              @click="$emit('open-file', sources.find(s => s.id === citation.source))">Ouvrir</button>
          </p></section>
        <section v-if="record?.entities?.length"><h3>Entités concernées</h3><p v-for="(row, index) in record.entities" :key="index">
          {{ entities.find(e => e.id === row.entity)?.label || `#${row.entity}` }} · {{ types.find(t => t.id === row.type)?.name }}</p></section>
        <section v-if="record?.evidence?.length"><h3>Factoïdes examinés</h3><p v-for="(row, index) in record.evidence" :key="index">
          {{ row.relation }} · {{ informations.find(i => i.id === row.factoid_information)?.label || `#${row.factoid_information}` }} {{ row.note }}</p></section>
      </template>
      <button v-if="canEdit" type="button" @click="$emit('edit')">Modifier</button>
    </article>
  </div>
</template>

<script setup>
/* global defineProps, defineEmits */
import { computed } from 'vue';
const props = defineProps({ entry: { type: Object, required: true }, sources: { type: Array, required: true },
  informations: { type: Array, required: true }, entities: { type: Array, required: true },
  types: { type: Array, required: true }, canEdit: { type: Boolean, default: false } });
defineEmits(['close', 'edit', 'open-file']);
const record = computed(() => props.entry.resource_kind === 'source'
  ? props.sources.find(s => s.id === props.entry.resource_id)
  : props.informations.find(i => i.id === props.entry.resource_id));
const dateKinds = { production: 'Production', issue: 'Émission', publication: 'Publication' };
const format = value => value ? new Date(value).toLocaleString('fr-FR') : '';
const bibliographicDate = value => value?.raw || (value?.['date-parts']?.[0] || [])
  .map((part, index) => index ? String(part).padStart(2, '0') : part).join('-');
const span = value => value ? ['begin_of_begin', 'end_of_begin', 'begin_of_end', 'end_of_end']
  .filter(key => value[key]).map(key => `${value[key]}${value[`${key}_time`] ? ` ${value[`${key}_time`].slice(0, 5)}` : ''}`)
  .join(' → ') : '';
</script>

<style scoped>
.backdrop { position: fixed; inset: 0; z-index: 1100; background: rgba(29,45,61,.6); display: grid; place-items: center; padding: 1rem; }
.modal { position: relative; background: white; color: #283744; padding: 1.5rem; border-radius: .7rem; width: min(670px, 95vw); max-height: 88vh; overflow-y: auto; }
.close { position: absolute; right: 1rem; top: .6rem; border: none; background: transparent; font-size: 1.8rem; }
button { margin-left: .5rem; color: #335b7c; border: 1px solid #6c8aa8; border-radius: .3rem; padding: .2rem .5rem; cursor: pointer; }
pre { overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
