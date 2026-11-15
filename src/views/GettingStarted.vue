<template>
  <div class="guide-backdrop" @click.self="emit('close')" @keydown.esc.stop="emit('close')">
    <section ref="dialog" class="guide" role="dialog" aria-modal="true" aria-labelledby="guide-title"
      aria-describedby="guide-description" @keydown.tab="keepFocus">
      <header class="guide-header">
        <span class="step-count">{{ step + 1 }} / 5</span>
        <button type="button" class="close" aria-label="Fermer le guide" @click="emit('close')">×</button>
      </header>

      <div class="guide-body">
        <h2 id="guide-title" ref="title" tabindex="-1">{{ current.title }}</h2>
        <p id="guide-description" class="description">{{ current.description }}</p>

        <div v-if="step === 0" class="principle" aria-label="Le parcours d’une recherche dans Qip">
          <div class="source"><strong>Sources</strong><small>Les documents étudiés</small></div>
          <span class="principle-arrow" aria-hidden="true">→</span>
          <div class="factoid"><strong>Factoïdes</strong><small>Ce que disent les sources</small></div>
          <span class="principle-arrow" aria-hidden="true">→</span>
          <div class="qualified"><strong>Informations qualifiées</strong><small>Les informations établies par le chercheur</small></div>
        </div>
        <p v-if="current.detail" class="detail">{{ current.detail }}</p>
      </div>

      <footer class="guide-footer">
        <button v-if="step > 0" type="button" class="previous" @click="goTo(step - 1)">Précédent</button>
        <button type="button" class="next" @click="step === 4 ? emit('close') : goTo(step + 1)">
          {{ step === 4 ? 'Terminer' : 'Suivant' }} <span v-if="step < 4" aria-hidden="true">→</span>
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup>
/* global defineProps, defineEmits */
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';

const props = defineProps({ canEdit: { type: Boolean, default: false }, hasProject: { type: Boolean, default: false } });
const emit = defineEmits(['close']);
const step = ref(0), dialog = ref(null), title = ref(null);
let previousFocus;
const steps = computed(() => [
  { title: 'À quoi sert Qip ?',
    description: 'Qip permet de construire une analyse de l’histoire en organisant des sources et des informations sur des frises à différentes échelles de temps.',
    detail: 'On peut ainsi observer leur répartition dans le temps et retrouver les sources utilisées pour chaque information.' },
  { title: 'Projets',
    description: 'Sélectionnez un projet dans le menu « Projet actif » à gauche. Les données affichées appartiennent au projet choisi.',
    detail: props.hasProject ? '' : 'Pour créer un projet, cliquez sur + en bas à droite. Vous pouvez aussi rejoindre un projet auquel vous avez été invité.' },
  props.canEdit
    ? { title: 'Ajouter des contenus',
      description: 'Cliquez sur + en bas à droite. Créez d’abord un type d’information, puis une source et un factoïde.',
      detail: 'Dans le formulaire du factoïde, ajoutez au moins une citation et sélectionnez la source correspondante.' }
    : !props.hasProject
      ? { title: 'Ajouter des contenus',
        description: 'Créez d’abord un projet avec le bouton +. Vous pourrez ensuite y ajouter un type d’information, une source et un factoïde.',
        detail: 'Un factoïde doit citer au moins une source.' }
      : { title: 'Consulter les contenus',
        description: 'Dans ce projet, vous avez accès à la lecture. Cliquez sur un marqueur de la frise pour ouvrir la fiche correspondante.',
        detail: 'La fiche indique notamment les sources citées. La création de contenus dépend de vos droits dans le projet.' },
  { title: 'Frises chronologiques',
    description: 'Cliquez sur un marqueur pour ouvrir une fiche. Si plusieurs marqueurs sont regroupés, cliquez sur le groupe pour voir la liste.',
    detail: 'À gauche, « Historique » affiche les dates des faits ou des documents ; « Consignation » affiche leur date d’enregistrement dans Qip. Vous pouvez changer la date de référence.' },
  { title: 'Recherche et filtres',
    description: 'Dans la barre de gauche, saisissez un titre pour rechercher une fiche. Le bouton à droite du champ ouvre la recherche avancée.',
    detail: 'Sous « Affichage », choisissez les contenus et les dates visibles sur les frises. Le guide reste accessible depuis le menu du compte, en haut à gauche.' },
]);
const current = computed(() => steps.value[step.value]);

async function goTo(index) {
  step.value = index;
  await nextTick();
  title.value?.focus();
}
function keepFocus(event) {
  const focusable = [...dialog.value.querySelectorAll('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
  if (!focusable.length) return;
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (document.activeElement === title.value) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
  else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}
onMounted(() => { previousFocus = document.activeElement; title.value?.focus(); });
onUnmounted(() => { if (previousFocus?.isConnected) previousFocus.focus(); });
</script>

<style scoped>
.guide-backdrop { position: fixed; inset: 0; z-index: 1100; display: grid; place-items: center; padding: 1rem;
  background: #14293bbb; }
.guide { width: min(100%, 620px); max-height: min(90vh, 760px); max-height: min(90dvh, 760px);
  overflow-y: auto; border: 1px solid #d8e4ec; border-radius: 1.15rem; background: #fff;
  color: #263b50; box-shadow: 0 28px 90px #0c203d59; }
.guide-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.7rem;
  border-bottom: 1px solid #e8eef2; }
.step-count { color: #597b91; font-size: .8rem; font-weight: 650; font-variant-numeric: tabular-nums; }
.close { border: 0; background: transparent; color: #597387; border-radius: .4rem; font-size: 1.65rem;
  line-height: 1; cursor: pointer; padding: .1rem .35rem; }
.close:hover, .previous:hover { background: #edf3f7; }
.guide-body { padding: 1.7rem 2.3rem 1.8rem; }
h2 { margin: 0 0 .85rem; font-size: clamp(1.6rem, 4vw, 2rem); letter-spacing: -.04em; line-height: 1.15; }
h2:focus { outline: none; }
.description { margin: 0; color: #526d7e; line-height: 1.65; font-size: .97rem; }
.principle { display: flex; align-items: stretch; gap: .4rem; margin-top: 1.5rem; }
.principle > div { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: flex-start;
  gap: .3rem; padding: .9rem .7rem; background: #f3f7f9; border: 1px solid #e4edf1;
  border-top: 3px solid; border-radius: .55rem; }
.principle .source { border-top-color: #53816a; }.principle .factoid { border-top-color: #a58149; }
.principle .qualified { border-top-color: #866e9f; }
.principle strong { font-size: .8rem; line-height: 1.25; }.principle small { color: #607889; line-height: 1.35; }
.principle-arrow { align-self: center; color: #8ba7b9; }
.detail { margin: 1rem 0 0; color: #526d7e; line-height: 1.6; font-size: .9rem; }
.guide-footer { display: flex; align-items: center; justify-content: flex-end; gap: .5rem;
  border-top: 1px solid #e8eef2; padding: 1rem 1.7rem; }
.guide-footer button { border-radius: .5rem; padding: .65rem .95rem;
  cursor: pointer; font-weight: 650; font-size: .82rem; }
.previous { border: 0; background: transparent; color: #3f6278; }
.next { border: 1px solid #315e79; background: #315e79; color: #fff; }.next:hover { background: #244a62; }
button:focus-visible { outline: 2px solid #356e91; outline-offset: 2px; }
@media (max-width: 520px) {
  .guide-body { padding: 1.5rem 1.2rem; }.guide-header, .guide-footer { padding: .85rem 1.2rem; }
  .principle { flex-direction: column; gap: .25rem; margin-top: 1.2rem; }
  .principle > div { width: 100%; padding: .55rem .7rem; }
  .principle-arrow { transform: rotate(90deg); }
}
</style>
