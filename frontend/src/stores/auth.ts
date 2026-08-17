import { defineStore } from 'pinia'
import { apiClient } from '@/api/client'
import type { AuthResponse, AuthUser } from '@/types'

interface AuthState {
  accessToken: string | null
  user: AuthUser | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    accessToken: null,
    user: null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.accessToken,
  },

  actions: {
    async register(payload: { email: string; username: string; password: string; displayName: string }) {
      const { data } = await apiClient.post<AuthResponse>('/auth/register', payload)
      this.setSession(data)
    },

    async login(payload: { emailOrUsername: string; password: string }) {
      const { data } = await apiClient.post<AuthResponse>('/auth/login', payload)
      this.setSession(data)
    },

    async loginWithGoogle(idToken: string) {
      const { data } = await apiClient.post<AuthResponse>('/auth/google', { idToken })
      this.setSession(data)
    },
    /**
     * Attaches a Google account to the session already open. Returns the
     * updated user rather than a session: the caller stays signed in as who
     * they already were, so there is no new token to store.
     */
    async linkGoogle(idToken: string) {
      const { data } = await apiClient.post<AuthUser>('/auth/google/link', { idToken })
      this.user = data
    },

    async loginWithKeycloak(idToken: string) {
      const { data } = await apiClient.post<AuthResponse>('/auth/oidc', { idToken })
      this.setSession(data)
    },
    /**
     * Rattache une carte de membre à la session déjà ouverte. Rend le compte mis
     * à jour et non une session, pour la même raison que `linkGoogle` : l'appelant
     * reste connecté en tant que qui il était, il n'y a pas de nouveau jeton.
     */
    async linkKeycloak(idToken: string) {
      const { data } = await apiClient.post<AuthUser>('/auth/oidc/link', { idToken })
      this.user = data
    },

    async setUsername(username: string) {
      const { data } = await apiClient.post<AuthUser>('/auth/username', { username })
      this.user = data
    },

    async setPassword(password: string) {
      const { data } = await apiClient.post<AuthUser>('/auth/password', { password })
      this.user = data
    },

    /**
     * The two reset calls touch no state on purpose: neither opens a session.
     * They live here because this is where the app's auth calls live, and
     * because a reset ends by signing in normally through `login`.
     *
     * This one resolves the same way whatever the address, and the backend
     * answers 204 whether or not it has an account — so a caller cannot use
     * the outcome to find out who is registered, and neither can this store.
     */
    async requestPasswordReset(email: string) {
      await apiClient.post('/auth/password/forgot', { email })
    },

    async resetPassword(payload: { token: string; password: string }) {
      await apiClient.post('/auth/password/reset', payload)
    },

    async fetchCurrentUser() {
      if (!this.accessToken) return
      const { data } = await apiClient.get<AuthUser>('/auth/me')
      this.user = data
    },

    setSession(data: AuthResponse) {
      this.accessToken = data.accessToken
      this.user = data.user
    },

    async deleteAccount() {
      await apiClient.delete('/users/me')
      this.accessToken = null
      this.user = null
    },

    logout() {
      this.accessToken = null
      this.user = null
    },
  },

  persist: true,
})
