<template>
  <div class="terms-page">
    <header class="terms-header">
      <router-link to="/" class="brand" aria-label="Retour à Qip">
        <img src="@/assets/logos/logo_bleu_transparent.png" alt="Qip" />
      </router-link>
      <router-link to="/" class="back-link">← Retour à l'accueil</router-link>
    </header>
    <main class="terms-content">
      <p class="eyebrow">Compte Qip</p>
      <h1>Conditions d’utilisation</h1>
      <p v-if="terms" class="version">Version du {{ displayVersion(terms.version) }}</p>
      <p v-if="loading" role="status">Chargement des conditions…</p>
      <div v-else-if="error" role="alert"><p>{{ error }}</p>
        <button type="button" @click="loadTerms">Réessayer</button></div>
      <template v-else-if="terms">
        <section v-for="section in terms.sections" :key="section.heading">
          <h2>{{ section.heading }}</h2>
          <p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import axios from '@/axios.js';

const terms = ref(null), loading = ref(true), error = ref('');
const displayVersion = value => value ? value.split('-').reverse().join('/') : '';
async function loadTerms() {
  loading.value = true; error.value = '';
  try { terms.value = (await axios.get('/api/terms/')).data; }
  catch { error.value = 'Les conditions ne sont pas disponibles pour le moment.'; }
  finally { loading.value = false; }
}
onMounted(loadTerms);
</script>

<style scoped>
.terms-page { min-height: 100vh; background: #f2f6f9; color: #273c50; }
.terms-header { max-width: 1080px; margin: auto; padding: 1.3rem 1.5rem; display: flex;
  align-items: center; justify-content: space-between; gap: 1rem; }
.brand img { display: block; width: 120px; height: 50px; object-fit: contain; }
.back-link { color: #345f7b; font-size: .88rem; text-decoration: none; }
.back-link:hover, .back-link:focus-visible { text-decoration: underline; }
.terms-content { max-width: 760px; margin: 2rem auto 0; padding: 1.75rem 2rem 4rem;
  background: white; border: 1px solid #dce7ed; border-radius: 1rem; }
.eyebrow { color: #5a8199; text-transform: uppercase; letter-spacing: .14em; font-size: .7rem; font-weight: 700; }
h1 { font-size: clamp(1.85rem, 4vw, 2.5rem); margin: .5rem 0 0; letter-spacing: -.035em; }
.version { color: #6b8191; font-size: .88rem; margin: .7rem 0 2rem; }
section { border-top: 1px solid #e3ebf0; padding: 1.3rem 0 .2rem; }
h2 { font-size: 1.1rem; margin: 0 0 .7rem; }
section p { line-height: 1.7; color: #476074; }
button { border: 1px solid #8caabe; background: white; padding: .45rem .8rem; border-radius: .4rem; cursor: pointer; }
@media (max-width: 700px) { .terms-header { padding: .8rem 1rem; }
  .terms-content { margin: .5rem 1rem 0; padding: 1.5rem 1.1rem 3rem; } }
</style>
