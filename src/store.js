import { createStore } from 'vuex';
import axios from '@/axios.js';

export default createStore({
  state: {
    user: null,
    isSettingsVisible: false,
    settingsModalContent: null,
    isProfileVisible: false,
    profileModalContent: null,
    isDetailVisible: false,
    detailModalContent: null,
    isAddVisible: false,
    addModalContent: null,
    selectedTags: [],
    selectedItems: [],
    clickedMediaUrl: null,
    itemDetails: null,
  },
  mutations: {
    setClickedMediaUrl(state, url) {
      state.clickedMediaUrl = url;
    },
    setUser(state, user) {
      state.user = user;
    },
    clearUser(state) {
      state.user = null;
    },
    toggleSettingsVisibility(state) {
      state.isSettingsVisible = !state.isSettingsVisible;
    },
    toggleProfileVisibility(state) {
      state.isProfileVisible = !state.isProfileVisible;
    },
    toggleDetailVisibility(state) {
      state.isDetailVisible = !state.isDetailVisible;
    },
    toggleAddVisibility(state) {
      state.isAddVisible = !state.isAddVisible;
    },
    setSelectedTags(state, tags) {
      state.selectedTags = tags;
    },
    setSelectedItem(state, item) {
      state.selectedItem = item;
    },
    addSelectedItem(state, item) {
      state.selectedItems.push(item);
    },
    removeSelectedItem(state, itemId) {
      state.selectedItems = state.selectedItems.filter(item => item.id !== itemId);
    },
    setDetailModalContent(state, content) {
      state.detailModalContent = content;
    },
    setAddModalContent(state, content) {
      state.addModalContent = content;
    },
    setSettingsModalContent(state, content) {
      state.settingsModalContent = content;
    },
    setProfileModalContent(state, content) {
      state.profileModalContent = content;
    },
    setItemDetails(state, itemDetails) {
      state.itemDetails = itemDetails;
    },
  },
  actions: {
    async fetchItemDetails({ commit }, { itemId, itemType }) {
      try {
        const response = await axios.get(`media-detail/${itemId}`);
        commit('setDetailModalContent', response.data);
        commit('toggleDetailVisibility');
      } catch (error) {
        console.error('Error fetching item details:', error);
      }
    },
    async initializeAuthenticationState({ commit }) {
      try {
        const response = await axios.get('/check_session/');
        commit('setUser', response.data.user);
      } catch (error) {
        console.error('Error during session check:', error);
        commit('clearUser');
      }
    },
    async login({ commit }, credentials) {
      try {
        const response = await axios.post(
          '/login/',
          credentials,
          { withCredentials: true }
        );
        commit('setUser', response.data.user);
      } catch (error) {
        console.error('An error occurred during login:', error);
        throw error;
      }
    },
    async signup({ commit, dispatch }, credentials) {
      try {
        await axios.post(
          '/signup/',
          {
            username: credentials.username,
            email: credentials.email,
            password: credentials.password,
            first_name: credentials.first_name,
            last_name: credentials.last_name,
            accept_terms: credentials.accept_terms,
            terms_version: credentials.terms_version
          }
        );
        await dispatch('login', {
          username: credentials.username,
          password: credentials.password
        });
      } catch (error) {
        console.error('An error occurred during signup:', error);
        throw error;
      }
    },
    async logout({ commit }) {
      try {
        await axios.post('/logout/');
        localStorage.removeItem('authToken');
        commit('clearUser');
      } catch (error) {
        console.error('An error occurred during logout:', error);
      }
    },
    async fetchMediaUrl({ commit }, mediaId) {
      try {
        const response = await axios.get(`/media-detail/${mediaId}/`);
        commit('setClickedMediaUrl', response.data.signed_url);
      } catch (error) {
        console.error('Error fetching media URL:', error);
      }
    },
    async requestPasswordReset({ commit }, payload) {
      const response = await axios.post('/password-reset/', payload);
      return response.data;
    },
    async resetPassword({ commit }, payload) {
      const response = await axios.post(`/password-reset-confirm/${payload.uidb64}/${payload.token}/`, payload);
      return response.data;
    },
    async addItem({ commit }, formData) {
      try {
        const response = await axios.post('/items/add/', formData);
        commit('addSelectedItem', response.data);
      } catch (error) {
        console.error('Error adding item:', error);
      }
    }
  },
  getters: {
    isAuthenticated: state => !!state.user,
  }
});
