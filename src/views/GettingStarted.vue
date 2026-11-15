<template>
  <div class="guide-backdrop" @click.self="emit('close')" @keydown.esc.stop="emit('close')">
    <section ref="dialog" class="guide" role="dialog" aria-modal="true" aria-labelledby="guide-title"
      aria-describedby="guide-description" @keydown.tab="keepFocus">
      <header class="guide-header">
        <span class="guide-brand">QIP <span aria-hidden="true">/</span> PREMIERS PAS</span>
        <button type="button" class="close" aria-label="Fermer le guide" @click="emit('close')">×</button>
      </header>

      <div class="guide-body">
        <div class="step-label"><span class="step-number">{{ step === 0 ? '00' : `0${step}` }}</span>
          <span>{{ step === 0 ? 'LE PRINCIPE' : `ÉTAPE ${step} SUR 4` }}</span></div>
        <h2 id="guide-title" ref="title" tabindex="-1">{{ current.title }}</h2>
        <p id="guide-description" class="description">{{ current.description }}</p>

        <div v-if="step === 0" class="principle" aria-label="Le parcours d’une recherche dans Qip">
          <div><span class="principle-icon source">01</span><strong>Sources</strong><small>Les documents de départ</small></div>
          <span class="principle-arrow" aria-hidden="true">→</span>
          <div><span class="principle-icon factoid">02</span><strong>Factoïdes</strong><small>Ce qu’ils rapportent</small></div>
          <span class="principle-arrow" aria-hidden="true">→</span>
          <div><span class="principle-icon qualified">03</span><strong>Informations qualifiées</strong><small>Votre analyse</small></div>
        </div>
        <div v-else class="tip">
          <span class="tip-icon" aria-hidden="true">{{ current.icon }}</span>
          <div><strong>{{ current.tipTitle }}</strong><p>{{ current.tip }}</p></div>
        </div>
        <p v-if="step === 0" class="context">Les frises permettent ensuite de situer ces éléments dans le temps et de retrouver leur provenance.</p>
      </div>

      <footer class="guide-footer">
        <div class="progress" aria-label="Progression du guide">
          <span v-for="index in 5" :key="index" :class="{ active: step === index - 1 }"
            :aria-label="`Étape ${index - 1}${step === index - 1 ? ', en cours' : ''}`" />
        </div>
        <div class="actions">
          <button v-if="step > 0" type="button" class="previous" @click="goTo(step - 1)">Précédent</button>
          <button type="button" class="next" @click="step === 4 ? emit('close') : goTo(step + 1)">
            {{ step === 4 ? 'Terminer' : 'Suivant' }} <span v-if="step < 4" aria-hidden="true">→</span>
          </button>
        </div>
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
  { title: 'De la source à l’histoire',
    description: 'Qip aide à organiser une recherche historique : conserver des sources, relever ce qu’elles disent et formuler des informations argumentées.' },
  { title: 'Commencez par un projet',
    description: 'Chaque recherche se déroule dans un projet. Choisissez-le dans la barre de gauche ou créez votre propre espace.',
    icon: '⌄', tipTitle: props.hasProject ? 'Projet actif' : 'Pas encore de projet ?',
    tip: props.hasProject ? 'Le sélecteur « Projet actif » permet de changer de recherche à tout moment.'
      : 'Utilisez le bouton + en bas à droite pour créer un projet, ou rejoignez un projet auquel vous avez été invité.' },
  props.canEdit
    ? { title: 'Construisez votre recherche',
      description: 'Le bouton + ouvre les outils de création. Pour commencer, créez un type d’information, puis une source et un factoïde lié à cette source.',
      icon: '+', tipTitle: 'Un lien avec les documents',
      tip: 'Un factoïde est un relevé : il doit être lié à au moins une source. Une information qualifiée peut ensuite exprimer votre analyse.' }
    : !props.hasProject
      ? { title: 'Donnez vie à votre recherche',
        description: 'Après avoir créé ou rejoint un projet, vous pourrez consulter ses sources, ses relevés et les analyses qui en découlent.',
        icon: '+', tipTitle: 'Pour créer vos propres contenus',
        tip: 'Créez un projet avec le bouton +. Vous pourrez ensuite y ajouter un type d’information, une source et un factoïde lié à cette source.' }
    : { title: 'Explorez les contenus',
      description: 'Dans un projet partagé en lecture seule, ouvrez les fiches pour consulter les sources, les relevés et les analyses de l’équipe.',
      icon: '↗', tipTitle: 'Suivez la provenance',
      tip: 'Les fiches montrent les sources citées et les liens entre les informations. La création dépend de vos droits dans le projet.' },
  { title: 'Lisez les frises',
    description: 'Les marqueurs situent les contenus dans le temps. Cliquez sur un marqueur, ou sur un groupe, pour ouvrir les fiches correspondantes.',
    icon: '◷', tipTitle: 'Deux façons de voir le temps',
    tip: '« Historique » montre la date des faits ou des documents ; « Consignation » montre la date de leur enregistrement dans Qip. Changez la date de référence pour explorer une autre période.' },
  { title: 'Retrouvez ce qui compte',
    description: 'La recherche par titre se trouve dans la barre de gauche. Le bouton à sa droite ouvre une recherche plus précise.',
    icon: '⌕', tipTitle: 'Affinez votre vue',
    tip: 'Les filtres « Affichage » permettent de choisir les contenus et les axes temporels visibles. Vous pouvez relancer ce guide avec « Aide ».' },
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
.guide-brand { font-size: .7rem; font-weight: 750; letter-spacing: .13em; color: #597b91; }
.guide-brand span { color: #b7cbd6; margin: 0 .4rem; }
.close { border: 0; background: transparent; color: #597387; border-radius: .4rem; font-size: 1.65rem;
  line-height: 1; cursor: pointer; padding: .1rem .35rem; }
.close:hover, .previous:hover { background: #edf3f7; }
.guide-body { padding: 2rem 2.3rem 1.8rem; }
.step-label { display: flex; align-items: center; gap: .6rem; font-size: .7rem; font-weight: 700;
  color: #51829e; letter-spacing: .12em; }
.step-number { display: grid; place-items: center; width: 2rem; height: 2rem; border-radius: .55rem;
  background: #e5f0f6; letter-spacing: 0; font-size: .85rem; }
h2 { margin: 1.3rem 0 .65rem; font-size: clamp(1.6rem, 4vw, 2.2rem); letter-spacing: -.04em; line-height: 1.15; }
h2:focus { outline: none; }
.description { margin: 0; color: #526d7e; line-height: 1.65; font-size: .97rem; }
.principle { display: flex; align-items: stretch; gap: .4rem; margin-top: 2rem; }
.principle > div { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: flex-start;
  gap: .3rem; padding: 1rem .7rem; background: #f3f7f9; border: 1px solid #e4edf1; border-radius: .7rem; }
.principle-icon { display: grid; place-items: center; width: 2rem; height: 2rem; margin-bottom: .45rem;
  border-radius: .5rem; color: #fff; font-size: .75rem; font-weight: 700; }
.source { background: #53816a; }.factoid { background: #a58149; }.qualified { background: #866e9f; }
.principle strong { font-size: .8rem; line-height: 1.25; }.principle small { color: #607889; line-height: 1.35; }
.principle-arrow { align-self: center; color: #8ba7b9; }
.context { margin: 1.1rem 0 0; color: #607889; font-size: .85rem; line-height: 1.5; }
.tip { display: flex; gap: 1rem; align-items: flex-start; margin-top: 2rem; padding: 1.15rem;
  border: 1px solid #dce9f0; background: #f3f8fb; border-radius: .75rem; }
.tip-icon { flex: none; display: grid; place-items: center; width: 2.4rem; height: 2.4rem;
  border-radius: .6rem; background: #d9eaf4; color: #315e79; font-size: 1.2rem; }
.tip strong { font-size: .9rem; }.tip p { margin: .35rem 0 0; color: #526d7e; line-height: 1.5; font-size: .85rem; }
.guide-footer { display: flex; align-items: center; justify-content: space-between; gap: 1rem;
  border-top: 1px solid #e8eef2; padding: 1rem 1.7rem; }
.progress { display: flex; gap: .35rem; }.progress span { width: .5rem; height: .5rem;
  border-radius: 50%; background: #ccdae3; }.progress span.active { background: #315e79; width: 1.25rem; border-radius: .5rem; }
.actions { display: flex; gap: .5rem; }.actions button { border-radius: .5rem; padding: .65rem .95rem;
  cursor: pointer; font-weight: 650; font-size: .82rem; }
.previous { border: 0; background: transparent; color: #3f6278; }
.next { border: 1px solid #315e79; background: #315e79; color: #fff; }.next:hover { background: #244a62; }
button:focus-visible { outline: 2px solid #356e91; outline-offset: 2px; }
@media (max-width: 520px) {
  .guide-body { padding: 1.5rem 1.2rem; }.guide-header, .guide-footer { padding: .85rem 1.2rem; }
  .principle { flex-direction: column; gap: .25rem; margin-top: 1.2rem; }
  .principle > div { width: 100%; display: grid; grid-template-columns: 2rem 1fr; column-gap: .7rem;
    padding: .55rem .7rem; align-items: center; }
  .principle-icon { grid-row: span 2; margin: 0; }.principle-arrow { transform: rotate(90deg); }
  .principle strong, .principle small { grid-column: 2; }
  .tip { margin-top: 1.3rem; }
}
</style>
