<template>
  <div class="landing">
    <main class="landing-content">
      <section class="intro" aria-labelledby="intro-title">
        <span class="eyebrow">Plateforme de recherche historique</span>
        <div class="hero-stage">
          <h1 id="intro-title">Des sources aux récits,<br /> <em>gardez le fil.</em></h1>
          <div class="hero-logo"><img src="@/assets/logos/logo_bleu_transparent.png" alt="Qip" /></div>
        </div>
        <p>Visualisez et gérez vos sources et vos informations historiques dans une structure chronologique.</p>
        <div class="timeline-art" aria-hidden="true"><span /><span /><span /><span /></div>
      </section>

      <section class="auth-card" aria-label="Accès à Qip">
        <h2 class="auth-title">{{ activeTab === 'login' ? 'Connectez-vous' : 'Créez votre espace' }}</h2>

        <div class="auth-tabs" role="group" aria-label="Accès au compte">
          <button id="tab-login" type="button" aria-controls="auth-panel"
            :aria-pressed="activeTab === 'login'" :class="{ active: activeTab === 'login' }"
            @click="changeMode('login')">Se connecter</button>
          <button id="tab-signup" type="button" aria-controls="auth-panel"
            :aria-pressed="activeTab === 'signup'" :class="{ active: activeTab === 'signup' }"
            @click="changeMode('signup')">Créer un compte</button>
        </div>

        <form id="auth-panel" :aria-label="activeTab === 'login' ? 'Connexion' : 'Création de compte'" @submit.prevent="submit">
          <label class="sr-only" for="auth-username">Identifiant</label>
          <input id="auth-username" v-model.trim="username" name="username" autocomplete="username"
            maxlength="30" required placeholder="Identifiant" />

          <Transition name="reveal">
            <div v-if="activeTab === 'signup'" class="signup-fields">
              <div class="name-fields">
                <div><label class="sr-only" for="auth-first-name">Prénom</label>
                  <input id="auth-first-name" v-model.trim="firstName" autocomplete="given-name" maxlength="30" required placeholder="Prénom" /></div>
                <div><label class="sr-only" for="auth-last-name">Nom</label>
                  <input id="auth-last-name" v-model.trim="lastName" autocomplete="family-name" maxlength="30" required placeholder="Nom" /></div>
              </div>
              <label class="sr-only" for="auth-email">Adresse e-mail</label>
              <input id="auth-email" v-model.trim="email" type="email" autocomplete="email" maxlength="254" required
                placeholder="Adresse e-mail" />
            </div>
          </Transition>

          <label class="sr-only" for="auth-password">Mot de passe</label>
          <input id="auth-password" v-model="password" name="password" type="password"
            :autocomplete="activeTab === 'login' ? 'current-password' : 'new-password'" required
            placeholder="Mot de passe" />

          <Transition name="reveal">
            <div v-if="activeTab === 'signup'" class="signup-fields after-password">
              <label class="sr-only" for="auth-confirm">Confirmer le mot de passe</label>
              <input id="auth-confirm" v-model="passwordConfirmation" type="password"
                autocomplete="new-password" required placeholder="Confirmer le mot de passe" />
              <p v-if="passwordMismatch" class="field-error" role="alert">Les mots de passe ne correspondent pas.</p>
              <label class="terms-choice" for="accept-terms">
                <input id="accept-terms" v-model="acceptedTerms" type="checkbox" required :disabled="!termsVersion" />
                <span>J’ai lu et j’accepte les
                  <router-link to="/conditions-utilisation" target="_blank" rel="noopener noreferrer">conditions d’utilisation</router-link>.
                </span>
              </label>
              <p v-if="termsError" class="field-error" role="alert">{{ termsError }}
                <button type="button" class="retry" @click="loadTerms">Réessayer</button></p>
            </div>
          </Transition>

          <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
          <button type="submit" class="submit-button" :disabled="isLoading || (activeTab === 'signup' && (!termsVersion || passwordMismatch))">
            {{ isLoading ? (activeTab === 'login' ? 'Connexion…' : 'Création…') :
              (activeTab === 'login' ? 'Se connecter' : 'Créer mon compte') }}
            <span aria-hidden="true">→</span>
          </button>
          <router-link v-if="activeTab === 'login'" to="/password-reset" class="forgot-link">Mot de passe oublié ?</router-link>
        </form>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import axios from '@/axios.js';

const route = useRoute(), router = useRouter(), store = useStore();
const activeTab = ref(route.query.mode === 'signup' ? 'signup' : 'login');
const username = ref(''), password = ref(''), firstName = ref(''), lastName = ref('');
const email = ref(''), passwordConfirmation = ref(''), acceptedTerms = ref(false);
const termsVersion = ref(''), termsError = ref(''), errorMessage = ref(''), isLoading = ref(false);
const passwordMismatch = computed(() => activeTab.value === 'signup' && !!passwordConfirmation.value &&
  password.value !== passwordConfirmation.value);

async function loadTerms() {
  termsError.value = '';
  try { termsVersion.value = (await axios.get('/api/terms/')).data.version; }
  catch { termsVersion.value = ''; termsError.value = 'Impossible de charger les conditions d’utilisation.'; }
}
onMounted(loadTerms);

function changeMode(mode) {
  if (activeTab.value === mode || isLoading.value) return;
  activeTab.value = mode;
  password.value = '';
  passwordConfirmation.value = '';
  errorMessage.value = '';
}

function signupError(error) {
  const detail = error.response?.data;
  if (detail?.accept_terms) return 'Veuillez accepter la version actuelle des conditions d’utilisation.';
  if (detail?.error === 'Username already exists') return 'Cet identifiant est déjà utilisé.';
  if (detail?.error === 'Email already exists') return 'Cette adresse e-mail est déjà utilisée.';
  return 'Impossible de créer le compte. Vérifiez les informations saisies.';
}

async function submit() {
  if (isLoading.value) return;
  errorMessage.value = '';
  if (activeTab.value === 'signup' && (!acceptedTerms.value || !termsVersion.value || passwordMismatch.value)) {
    errorMessage.value = 'Vérifiez les mots de passe et acceptez les conditions d’utilisation.';
    return;
  }
  isLoading.value = true;
  try {
    if (activeTab.value === 'login') await store.dispatch('login', { username: username.value, password: password.value });
    else await store.dispatch('signup', { username: username.value, password: password.value,
      first_name: firstName.value, last_name: lastName.value, email: email.value,
      accept_terms: acceptedTerms.value, terms_version: termsVersion.value });
    await router.push('/dashboard');
  } catch (error) {
    if (activeTab.value === 'signup' && error.response?.data?.accept_terms) {
      acceptedTerms.value = false;
      await loadTerms();
    }
    errorMessage.value = activeTab.value === 'login' ? 'Identifiant ou mot de passe incorrect.' : signupError(error);
  } finally { isLoading.value = false; }
}
</script>

<style scoped>
.landing { min-height: 100vh; min-height: 100dvh; color: #263b50; background:
  radial-gradient(circle at 18% 12%, #d8e6ed 0, transparent 40%),
  linear-gradient(145deg, #f5f8fa 10%, #e9f0f4 100%); }
.forgot-link:hover, .forgot-link:focus-visible { text-decoration: underline; }
.landing-content { max-width: 1160px; min-height: 100vh; min-height: 100dvh; margin: auto; padding: 2rem 2rem 3rem;
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(360px, 450px); align-items: center; gap: clamp(2rem, 6vw, 7rem); }
.intro { position: relative; align-self: center; display: flex; flex-direction: column;
  align-items: center; text-align: center; }
.eyebrow { color: #52819a; text-transform: uppercase; letter-spacing: .14em; font-size: .69rem; font-weight: 750; }
.hero-stage { display: grid; align-items: center; justify-items: center; width: 100%;
  height: clamp(225px, 22vw, 265px); margin: .8rem 0 1.3rem; }
.intro h1, .hero-logo { grid-area: 1 / 1; }
.intro h1 { margin: 0; font-size: clamp(2.6rem, 4.5vw, 4.6rem); line-height: 1.09;
  letter-spacing: -.055em; font-weight: 720; }
.intro h1 em { font-style: normal; color: #3f7894; }
.hero-logo { position: relative; width: min(100%, 310px); aspect-ratio: 1315 / 1081;
  overflow: hidden; opacity: 0; animation: logo-cycle 10s ease-in-out infinite; }
.hero-logo img { position: absolute; width: 202.81%; max-width: none; left: -49.89%; top: -47.27%; }
.intro h1 { animation: title-cycle 10s ease-in-out infinite; }
@keyframes title-cycle { 0%, 40%, 100% { opacity: 1; } 50%, 90% { opacity: 0; } }
@keyframes logo-cycle { 0%, 40%, 100% { opacity: 0; } 50%, 90% { opacity: 1; } }
.intro p { max-width: 32rem; margin: 0; font-size: 1.04rem; line-height: 1.65; color: #557084; }
.timeline-art { display: flex; gap: 1.3rem; height: 7.5rem; width: min(320px, 75%); margin-top: 2rem; opacity: .65; }
.timeline-art span { position: relative; flex: 1; border-left: 1px solid #91acbc; border-top: 1px solid #aac1ce; }
.timeline-art span::before, .timeline-art span::after { content: ''; display: block; position: absolute;
  left: -4px; width: 7px; height: 7px; border-radius: 50%; background: #5e91a9; }
.timeline-art span::before { top: 26%; }.timeline-art span::after { top: 65%; }
.timeline-art span:nth-child(2)::before { top: 48%; }.timeline-art span:nth-child(3)::after { top: 35%; }
.auth-card { padding: clamp(1.4rem, 3vw, 2.25rem); border: 1px solid #dce6ec; border-radius: 1rem;
  background: #fff; box-shadow: 0 24px 70px #253c5217, 0 2px 8px #253c520b; }
.auth-title { margin: 0 0 1.35rem; font-size: 1.55rem; line-height: 1.25; letter-spacing: -.025em; }
.auth-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: .25rem; padding: .25rem;
  margin-bottom: 1.35rem; background: #edf3f7; border-radius: .62rem; }
.auth-tabs button { border: 0; border-radius: .45rem; background: transparent; color: #5c7587;
  padding: .66rem .4rem; font-size: .84rem; font-weight: 650; cursor: pointer; }
.auth-tabs button.active { background: #fff; color: #264963; box-shadow: 0 2px 8px #1b3b501b; }
form { display: flex; flex-direction: column; }
form .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
form input:not([type='checkbox']) { width: 100%; min-width: 0; padding: .75rem .8rem; margin-bottom: .9rem;
  border: 1px solid #bcced9; border-radius: .48rem; background: #fbfdfe; color: #263b50; outline: none; }
form input:not([type='checkbox']):focus-visible { border-color: #5285a3; box-shadow: 0 0 0 3px #6dacc33a; }
form input::placeholder { color: #94a7b4; }
.signup-fields { display: flex; flex-direction: column; }
.name-fields { display: grid; grid-template-columns: 1fr 1fr; gap: .7rem; }
.name-fields > div { min-width: 0; display: flex; flex-direction: column; }
.terms-choice { display: flex; align-items: flex-start; gap: .6rem; margin: .2rem 0 1.1rem;
  color: #506b7e; font-size: .78rem; line-height: 1.5; cursor: pointer; }
.terms-choice input { flex: none; width: 1rem; height: 1rem; margin-top: .08rem; accent-color: #315e79; cursor: pointer; }
.terms-choice a, .forgot-link { color: #315e79; text-underline-offset: 2px; }
.field-error { color: #a13b46; font-size: .78rem; margin: -.55rem 0 .9rem; }
.form-error { margin: 0 0 .85rem; padding: .6rem .7rem; color: #90343e; background: #fff1f2;
  border-radius: .35rem; font-size: .82rem; }
.retry { background: none; border: 0; text-decoration: underline; color: #315e79; cursor: pointer; }
.submit-button { width: 100%; display: flex; align-items: center; justify-content: center; gap: .6rem;
  min-height: 2.8rem; background: #305d78; border: 1px solid #305d78; border-radius: .48rem;
  color: #fff; font-weight: 700; cursor: pointer; transition: background .16s, transform .16s; }
.submit-button:hover:not(:disabled) { background: #244c65; transform: translateY(-1px); }
.submit-button:disabled { opacity: .55; cursor: not-allowed; }
.forgot-link { align-self: center; margin-top: 1rem; font-size: .81rem; text-decoration: none; }
.auth-tabs button:focus-visible, .submit-button:focus-visible, .retry:focus-visible,
.terms-choice a:focus-visible { outline: 2px solid #356e91; outline-offset: 2px; }
.reveal-enter-active { transition: opacity .22s ease, transform .22s ease; }
.reveal-enter-from { opacity: 0; transform: translateY(-6px); }
@media (max-width: 820px) { .landing-content { grid-template-columns: 1fr; max-width: 530px;
    min-height: 100vh; gap: 1.2rem; padding: 1.5rem 1.25rem 3rem; }
  .hero-stage { height: clamp(130px, 26vw, 175px); margin: .6rem 0 1rem; }
  .intro h1 { font-size: clamp(2.1rem, 7vw, 3.2rem); }
  .hero-logo { width: min(100%, 190px); }
  .intro p { font-size: .9rem; }.timeline-art { display: none; }
}
@media (max-width: 480px) { .intro h1 { font-size: 2.15rem; }
  .hero-logo { width: 155px; }
  .intro h1 br { display: none; }.auth-card { padding: 1.3rem 1.15rem; }
  .name-fields { gap: .5rem; } }
@media (prefers-reduced-motion: reduce) { .reveal-enter-active, .submit-button { transition: none; }
  .hero-stage { display: flex; flex-direction: column; align-items: center; gap: .5rem; height: auto; }
  .hero-logo { order: -1; opacity: 1; animation: none; width: min(65%, 155px); }
  .intro h1 { animation: none; }
}
</style>
