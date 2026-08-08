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

    async setUsername(username: string) {
      const { data } = await apiClient.post<AuthUser>('/auth/username', { username })
      this.user = data
    },

    async setPassword(password: string) {
      const { data } = await apiClient.post<AuthUser>('/auth/password', { password })
      this.user = data
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

    logout() {
      this.accessToken = null
      this.user = null
    },
  },

  persist: true,
})
