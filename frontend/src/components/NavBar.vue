<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { mediaUrl } from '@/utils/media'

const authStore = useAuthStore()
const router = useRouter()
const menuOpen = ref(false)
const headerSearch = ref('')

function onSearch() {
  const q = headerSearch.value.trim()
  if (!q) return
  router.push({ name: 'discover', query: { q } })
  headerSearch.value = ''
}

function logout() {
  authStore.logout()
  menuOpen.value = false
  router.push({ name: 'discover' })
}
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-tambouille-border bg-tambouille-accent backdrop-blur">
    <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
      <RouterLink to="/" class="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <span class="text-tambouille-white" style="font-family: 'Gulax', sans-serif">Tambouille</span>
      </RouterLink>

      <form class="hidden flex-1 justify-center px-4 sm:flex" @submit.prevent="onSearch">
        <div class="relative w-full max-w-md">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            v-model="headerSearch"
            type="search"
            placeholder="Rechercher..."
            class="w-full rounded-full bg-white/15 py-1.5 pl-9 pr-4 text-sm text-white placeholder-white/60 outline-none focus:bg-white/25"
          />
        </div>
      </form>

      <nav class="flex items-center gap-4">
        <RouterLink
          to="/"
          class="text-sm font-medium text-tambouille-white hover:text-tambouille-white"
          active-class="!text-tambouille-white"
        >
          Découvrir
        </RouterLink>

        <template v-if="authStore.isAuthenticated">
          <RouterLink
            to="/upload"
            class="rounded-full border px-4 py-2 text-sm font-semibold text-white hover:bg-tambouille-accent-hover"
          >
            Uploader
          </RouterLink>

          <div class="relative">
            <button
              class="flex items-center gap-2 rounded-full border border-tambouille-border hover:bg-tambouille-surface-hover"
              @click="menuOpen = !menuOpen"
            >
              <img
                v-if="authStore.user?.avatarUrl"
                :src="mediaUrl(authStore.user.avatarUrl)"
                class="h-7 w-7 rounded-full object-cover"
                alt=""
              />
              <div
                v-else
                class="flex h-7 w-7 items-center justify-center rounded-full bg-tambouille-surface-hover text-xs font-semibold"
              >
                {{ authStore.user?.displayName?.[0]?.toUpperCase() }}
              </div>
            </button>

            <div
              v-if="menuOpen"
              class="absolute right-0 mt-2 w-48 rounded-lg border border-tambouille-border bg-tambouille-surface py-1 shadow-xl"
              @mouseleave="menuOpen = false"
            >
              <RouterLink
                v-if="authStore.user"
                :to="{ name: 'profile', params: { username: authStore.user.username } }"
                class="block px-4 py-2 text-sm hover:bg-tambouille-surface-hover"
                @click="menuOpen = false"
              >
                Mon profil
              </RouterLink>
              <button
                class="block w-full px-4 py-2 text-left text-sm hover:bg-tambouille-surface-hover"
                @click="logout"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </template>

        <template v-else>
          <RouterLink to="/login" class="text-sm font-medium text-tambouille-muted hover:text-tambouille-text">
            Connexion
          </RouterLink>
          <RouterLink
            to="/register"
            class="rounded-full bg-tambouille-accent px-4 py-2 text-sm font-semibold text-white hover:bg-tambouille-accent-hover"
          >
            S'inscrire
          </RouterLink>
        </template>
      </nav>
    </div>
  </header>
</template>
