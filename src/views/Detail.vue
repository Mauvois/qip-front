<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <article class="modal-content" role="dialog" aria-modal="true" :aria-label="item.label">
      <button type="button" class="close-modal" aria-label="Fermer" @click="$emit('close')">×</button>
      <h2>{{ item.label }}</h2>
      <p><strong>Statut :</strong> {{ statuses.find(status => status.id === item.epistemic_status)?.label }}</p>
      <p><strong>Type :</strong> {{ typeName(item.type) }}</p>
      <p v-if="item.description">{{ item.description }}</p>
      <p v-if="item.date_text"><strong>Date selon le média :</strong> {{ item.date_text }}</p>
      <dl class="dates">
        <template v-for="field in dateFields" :key="field.key">
          <div v-if="item[field.key]"><dt>{{ field.label }}</dt><dd>{{ item[field.key] }}</dd></div>
        </template>
      </dl>
      <section v-if="item.entity_participations.length">
        <h3>Entities liées</h3>
        <p v-for="(part, index) in item.entity_participations" :key="index">
          {{ typeName(part.type) }} : {{ entities.find(entity => entity.id === part.entity)?.label || `#${part.entity}` }}
          <span v-if="part.as_written"> — « {{ part.as_written }} »</span>
        </p>
      </section>
      <section v-if="item.item_participations.length">
        <h3>Autres items</h3>
        <p v-for="(part, index) in item.item_participations" :key="index">
          {{ typeName(part.type) }} : {{ items.find(other => other.id === part.participant)?.label || `#${part.participant}` }}
        </p>
      </section>
      <section v-if="item.media_references.length">
        <h3>Media et références</h3>
        <p v-for="(reference, index) in item.media_references" :key="index">
          <span>{{ media.find(entry => entry.id === reference.media)?.title || `#${reference.media}` }}</span>
          <span v-if="reference.locator"> · {{ reference.locator }}</span>
          <span v-if="reference.note"> — {{ reference.note }}</span>
          <button v-if="media.find(entry => entry.id === reference.media)?.has_file" type="button"
            @click="$emit('open-file', media.find(entry => entry.id === reference.media))">Ouvrir le document</button>
        </p>
      </section>
      <button v-if="canEdit" type="button" @click="$emit('edit')">Modifier l’item</button>
    </article>
  </div>
</template>

<script setup>
/* global defineProps, defineEmits */
const props = defineProps({
  item: { type: Object, required: true }, types: { type: Array, required: true },
  entities: { type: Array, required: true }, media: { type: Array, required: true },
  items: { type: Array, required: true }, statuses: { type: Array, required: true },
  canEdit: { type: Boolean, default: false },
});
defineEmits(['close', 'edit', 'open-file']);
const dateFields = [
  { key: 'begin_of_begin', label: 'Début du début' }, { key: 'end_of_begin', label: 'Fin du début' },
  { key: 'begin_of_end', label: 'Début de la fin' }, { key: 'end_of_end', label: 'Fin de la fin' },
];
const typeName = id => props.types.find(type => type.id === id)?.name || `#${id}`;
</script>

<style scoped>
.modal-backdrop { position: fixed; inset: 0; z-index: 1100; background: rgba(29,45,61,.6); display: grid; place-items: center; padding: 1rem; }
.modal-content { position: relative; background: white; color: #283744; padding: 1.5rem; border-radius: .7rem; width: min(670px, 95vw); max-height: 88vh; overflow-y: auto; }
.close-modal { position: absolute; right: 1rem; top: .6rem; border: none; background: transparent; font-size: 1.8rem; cursor: pointer; }
.dates { display: grid; grid-template-columns: repeat(2, 1fr); gap: .3rem; }
.dates div { padding: .2rem; } .dates dt { font-weight: 600; } .dates dd { margin: 0; }
button { margin-left: .5rem; color: #335b7c; border: 1px solid #6c8aa8; border-radius: .3rem; padding: .2rem .5rem; cursor: pointer; }
</style>
