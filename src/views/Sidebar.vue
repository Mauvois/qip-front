<template>
  <aside class="sidebar-container" aria-label="Navigation du projet">
    <div class="sidebar-top">
      <div class="brand-row">
        <img src="@/assets/logos/logo_bleu_clair_transparent.png" alt="Qip" class="logo" />
        <div v-if="user" class="user-interaction" @keydown.esc="showMenu = false">
          <button ref="menuButton" type="button" class="account-button" :aria-expanded="showMenu"
            aria-haspopup="true" :aria-label="`Menu du compte ${user.username}`" @click="showMenu = !showMenu">
            <span class="avatar" aria-hidden="true">{{ user.username?.slice(0, 1).toUpperCase() }}</span>
            <span class="account-dots" aria-hidden="true">···</span>
          </button>
          <div v-if="showMenu" ref="menu" class="menu-dropdown">
            <span class="menu-username">{{ user.username }}</span>
            <button type="button" @click="openMenu = 'profile'; showMenu = false">Profil</button>
            <button type="button" @click="openMenu = 'settings'; showMenu = false">Réglages</button>
            <button type="button" @click="logout">Déconnexion</button>
          </div>
        </div>
      </div>
      <slot name="project" />
      <slot name="search" />
      <button type="button" class="help-button" @click="$emit('help')">
        <span class="help-symbol" aria-hidden="true">?</span> Aide · Premiers pas
      </button>
      <button type="button" class="mobile-toggle" :aria-expanded="mobileExpanded" aria-controls="sidebar-panel"
        @click="mobileExpanded = !mobileExpanded">
        Filtres et temps <span aria-hidden="true">{{ mobileExpanded ? '⌃' : '⌄' }}</span>
      </button>
    </div>
    <div id="sidebar-panel" class="sidebar-panel" :class="{ 'mobile-collapsed': !mobileExpanded }">
      <div class="sidebar-filters"><slot name="filters" /></div>
      <div class="sidebar-time"><slot name="time" /></div>
    </div>
  </aside>
  <Settings v-if="openMenu === 'settings'" @close="openMenu = null" />
  <Profile v-if="openMenu === 'profile'" :username="user?.username" :bio="user?.bio" @close="openMenu = null" />
</template>

<script>
import { mapState } from 'vuex';
import Settings from './Settings.vue';
import Profile from './Profile.vue';

export default {
  name: 'Sidebar',
  components: { Settings, Profile },
  emits: ['help'],
  computed: { ...mapState(['user']) },
  data() { return { showMenu: false, openMenu: null, mobileExpanded: false }; },
  mounted() { document.addEventListener('click', this.handleClickOutside); },
  beforeUnmount() { document.removeEventListener('click', this.handleClickOutside); },
  methods: {
    handleClickOutside(event) {
      if (this.$refs.menuButton && !this.$refs.menuButton.contains(event.target) &&
        (!this.$refs.menu || !this.$refs.menu.contains(event.target))) this.showMenu = false;
    },
    async logout() {
      try {
        await this.$store.dispatch('logout');
        this.$router.push('/');
      } catch (error) {
        console.error('An error occurred during logout:', error);
      }
    },
  },
};
</script>

<style scoped>
.sidebar-container { --line: #ffffff20; width: clamp(218px, 18.5vw, 284px); flex: none; min-width: 0;
  height: 100%; z-index: 20; display: flex; flex-direction: column; background: #263b50;
  color: #e6edf5; box-shadow: 2px 0 14px #162a3921; }
.sidebar-top { padding: 1.2rem 1.15rem 1rem; flex: none; }
.brand-row { display: flex; align-items: center; justify-content: space-between; gap: .5rem; min-height: 2.7rem; }
.logo { display: block; width: 75px; max-height: 46px; object-fit: contain; object-position: left center; }
.user-interaction { position: relative; }
.account-button { display: flex; align-items: center; gap: .2rem; padding: .15rem; background: none;
  border: 0; border-radius: .55rem; color: #e6edf5; cursor: pointer; }
.account-button:hover, .account-button[aria-expanded='true'] { background: #ffffff17; }
.avatar { display: grid; place-items: center; width: 2rem; height: 2rem; border-radius: 50%;
  background: #68839b; color: #fff; font-size: .8rem; font-weight: 700; }
.account-dots { font-size: 1.3rem; letter-spacing: -.15em; line-height: 1; padding-right: .3rem; }
.menu-dropdown { position: absolute; z-index: 1010; right: 0; top: calc(100% + .45rem);
  min-width: 165px; padding: .35rem; border-radius: .65rem; border: 1px solid #c7d5e0;
  background: #fff; color: #263b50; box-shadow: 0 14px 35px #15273942; }
.menu-username { display: block; padding: .35rem .6rem .5rem; color: #5a7082; font-size: .76rem;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border-bottom: 1px solid #e3eaf0; }
.menu-dropdown button { display: block; width: 100%; text-align: left; border: 0; background: none;
  color: inherit; padding: .55rem .6rem; border-radius: .35rem; cursor: pointer; }
.menu-dropdown button:hover, .menu-dropdown button:focus-visible { background: #edf3f8; }
.sidebar-panel { display: flex; flex-direction: column; flex: 1; min-height: 0; overflow-y: auto; }
.help-button { display: flex; align-items: center; gap: .6rem; width: 100%; margin-top: 1rem;
  padding: .55rem .65rem; border: 1px solid #ffffff30; border-radius: .55rem;
  background: #ffffff0e; color: #e6edf5; font-size: .78rem; text-align: left; cursor: pointer; }
.help-button:hover { background: #ffffff22; }
.help-symbol { display: grid; place-items: center; width: 1.25rem; height: 1.25rem;
  border: 1px solid #a8c9de; border-radius: 50%; color: #cce5f2; font-weight: 700; }
.sidebar-filters { padding: .4rem 1.15rem 1.5rem; }
.sidebar-time { padding: 1.5rem 1.15rem 1.6rem; border-top: 1px solid var(--line); margin-top: auto; }
.mobile-toggle { display: none; }
.account-button:focus-visible, .mobile-toggle:focus-visible, .help-button:focus-visible { outline: 2px solid #b2d9f5; outline-offset: 2px; }
@media (max-width: 600px) {
  .sidebar-container { width: 100%; height: auto; max-height: min(65vh, 520px); box-shadow: 0 2px 12px #162a392b; }
  .sidebar-top { padding: .6rem 1rem .5rem; }
  .brand-row { min-height: 2.25rem; }
  .logo { width: 62px; max-height: 36px; }
  .help-button { margin-top: .6rem; }
  .sidebar-panel { overflow-y: auto; }
  .sidebar-panel.mobile-collapsed { display: none; }
  .sidebar-filters { padding: .5rem 1rem 1rem; }
  .sidebar-time { margin-top: 0; padding: 1.1rem 1rem 1.25rem; }
  .mobile-toggle { display: flex; justify-content: space-between; align-items: center; width: 100%;
    padding: .65rem 0 .15rem; background: none; border: 0; color: #bed0e0; font-size: .76rem; cursor: pointer; }
}
</style>
