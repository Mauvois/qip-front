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
        <ol v-if="current.actions" class="guide-list">
          <li v-for="action in current.actions" :key="action">{{ action }}</li>
        </ol>
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
    description: 'Qip permet de construire une analyse de la structure de l’historique à différentes échelles de temps.',
    detail: 'Les frises organisent les sources et les informations dans le temps. Chaque fiche permet de retrouver les sources utilisées.' },
  props.hasProject
    ? { title: 'Choisir un projet',
      description: 'Les contenus affichés appartiennent au projet indiqué dans « Projet actif », à gauche.',
      actions: ['Ouvrez le menu « Projet actif » pour passer à un autre projet auquel vous avez accès.',
        'Pour créer un autre projet, cliquez sur + en bas à droite, puis choisissez « Nouveau projet » dans « Gérer ».'],
      detail: 'Chaque projet possède ses propres sources, informations et membres.' }
    : { title: 'Créer un projet',
      description: 'Vous n’avez pas encore de projet. Il faut en créer un pour commencer à enregistrer des contenus.',
      actions: ['Cliquez sur le bouton + en bas à droite : le formulaire « Nouveau projet » s’ouvre.',
        'Saisissez un nom. Vous pouvez ajouter une description ; le fuseau horaire est prérempli.',
        'Cliquez sur « Créer le projet ». Il devient le projet actif et vous pouvez y ajouter des contenus.'],
      detail: 'Si quelqu’un vous invite dans son projet, il apparaîtra aussi dans le menu « Projet actif ».' },
  props.canEdit
    ? { title: 'Ajouter des contenus',
      description: 'Cliquez sur + en bas à droite pour ouvrir les sections de création. Voici un premier parcours :',
      actions: ['Dans « Types », créez un type avec l’usage « Informations ». Il sera demandé pour chaque information.',
        'Dans « Sources », enregistrez un document avec un titre ; sa date historique est facultative.',
        'Dans « Informations », choisissez le niveau « Factoïde », puis le type créé. Ajoutez une citation et sélectionnez la source : au moins une source est requise.'],
      detail: 'Vous pourrez ensuite créer une information qualifiée et y relier les factoïdes examinés.' }
    : !props.hasProject
      ? { title: 'Ajouter des contenus',
        description: 'Une fois votre projet créé, le bouton + ouvrira les sections de création.',
        actions: ['Créez un type avec l’usage « Informations » dans « Types ».',
          'Ajoutez un document dans « Sources ».',
          'Créez un factoïde dans « Informations », avec ce type et au moins une citation liée à la source.'],
        detail: 'Vous pourrez ensuite créer une information qualifiée à partir des factoïdes relevés.' }
      : { title: 'Consulter les contenus',
        description: 'Vous avez accès à ce projet en lecture seule. Vous pouvez consulter ses contenus sans les modifier.',
        actions: ['Cliquez sur un marqueur de la frise pour ouvrir la fiche d’une source ou d’une information.',
          'Dans la fiche, consultez les sources citées et les liens entre les informations.'],
        detail: 'Pour ajouter des contenus à ce projet, il faut disposer des droits d’édition.' },
  { title: 'Frises chronologiques',
    description: 'Les frises montrent les contenus autour de la date de référence, à plusieurs échelles de temps.',
    actions: ['Cliquez sur un marqueur pour ouvrir sa fiche. Si des marqueurs se chevauchent, cliquez sur leur groupe pour voir la liste.',
      'Dans « Repère temporel », cliquez sur la date pour explorer une autre période ; « Maintenant » revient au présent.',
      'Réglez « Amplitude des frises » pour voir une période plus large. Les boutons + aux extrémités ajoutent d’autres échelles.'],
    detail: 'Les filtres « Historique » et « Consignation » distinguent la date des faits ou documents de la date de leur enregistrement dans Qip.' },
  { title: 'Recherche et filtres',
    description: 'La recherche et les filtres agissent sur le projet actif.',
    actions: ['Saisissez un titre dans le champ de recherche à gauche, puis validez. Le bouton avec deux curseurs ouvre la recherche avancée.',
      'Sous « Affichage », sélectionnez une entité ou activez et désactivez les catégories et les axes temporels.',
      'Après une recherche, cliquez sur × dans le bandeau des résultats pour revenir à l’exploration des frises.'],
    detail: 'Sur mobile, ouvrez « Filtres et temps » pour accéder aux filtres. Vous retrouverez ce guide dans le menu du compte.' },
]);
const current = computed(() => steps.value[step.value]);

async function goTo(index) {
  step.value = index;
  await nextTick();
  dialog.value?.scrollTo({ top: 0 });
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
.guide-header { position: sticky; top: 0; z-index: 1; display: flex; align-items: center;
  justify-content: space-between; padding: 1rem 1.7rem; border-bottom: 1px solid #e8eef2; background: #fff; }
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
.guide-list { display: grid; gap: .75rem; margin: 1.45rem 0 0; padding-left: 1.55rem;
  color: #344e61; font-size: .9rem; line-height: 1.55; }
.guide-list li { padding-left: .25rem; }.guide-list li::marker { color: #315e79; font-weight: 700; }
.detail { margin: 1rem 0 0; color: #526d7e; line-height: 1.6; font-size: .9rem; }
.guide-footer { position: sticky; bottom: 0; display: flex; align-items: center; justify-content: flex-end;
  gap: .5rem; border-top: 1px solid #e8eef2; padding: 1rem 1.7rem; background: #fff; }
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
