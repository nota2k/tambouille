<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { apiClient } from '@/api/client'
import { mediaUrl } from '@/utils/media'
import type { AuthorSummary } from '@/types'

const authStore = useAuthStore()
const router = useRouter()
const menuOpen = ref(false)
const headerSearch = ref('')

const searchResults = ref<AuthorSummary[]>([])
const showDropdown = ref(false)
const activeIndex = ref(-1)
const searchContainer = ref<HTMLElement>()

let searchTimeout: ReturnType<typeof setTimeout> | undefined

watch(headerSearch, (q) => {
  clearTimeout(searchTimeout)
  const trimmed = q.trim()
  if (trimmed.length < 2) {
    searchResults.value = []
    showDropdown.value = false
    return
  }
  searchTimeout = setTimeout(async () => {
    try {
      const { data } = await apiClient.get<{ items: AuthorSummary[] }>('/users/search', {
        params: { q: trimmed, limit: 5 },
      })
      searchResults.value = data.items
      showDropdown.value = data.items.length > 0
      activeIndex.value = -1
    } catch {
      searchResults.value = []
      showDropdown.value = false
    }
  }, 300)
})

function onSearch() {
  const q = headerSearch.value.trim()
  if (!q) return
  closeDropdown()
  router.push({ name: 'discover', query: { q } })
  headerSearch.value = ''
}

function goToUser(username: string) {
  closeDropdown()
  headerSearch.value = ''
  router.push({ name: 'profile', params: { username } })
}

function closeDropdown() {
  showDropdown.value = false
  activeIndex.value = -1
}

function onKeydown(e: KeyboardEvent) {
  if (!showDropdown.value) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = Math.min(activeIndex.value + 1, searchResults.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = Math.max(activeIndex.value - 1, -1)
  } else if (e.key === 'Enter' && activeIndex.value >= 0) {
    e.preventDefault()
    goToUser(searchResults.value[activeIndex.value].username)
  } else if (e.key === 'Escape') {
    closeDropdown()
  }
}

function logout() {
  authStore.logout()
  menuOpen.value = false
  router.push({ name: 'discover' })
}

function onClickOutside(e: Event) {
  if (searchContainer.value?.contains(e.target as Node) === false) {
    closeDropdown()
  }
}

import { onMounted, onUnmounted } from 'vue'
onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-tambouille-border bg-tambouille-accent backdrop-blur">
    <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
      <RouterLink to="/" class="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <span class="text-tambouille-white" style="font-family: 'Gulax', sans-serif">Tambouille</span>
      </RouterLink>

      <form class="hidden flex-1 justify-center px-4 sm:flex" @submit.prevent="onSearch">
        <div ref="searchContainer" class="relative w-full max-w-md">
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
            @keydown="onKeydown"
            @focus="showDropdown = searchResults.length > 0"
          />

          <div
            v-if="showDropdown"
            class="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-lg border border-tambouille-border bg-tambouille-surface shadow-xl"
          >
            <div class="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-tambouille-muted">
              Utilisateurs
            </div>
            <RouterLink
              v-for="(user, i) in searchResults"
              :key="user.id"
              :to="{ name: 'profile', params: { username: user.username } }"
              class="flex items-center gap-3 px-3 py-2 transition"
              :class="i === activeIndex ? 'bg-tambouille-surface-hover' : 'hover:bg-tambouille-surface-hover'"
              @click="closeDropdown(); headerSearch = ''"
            >
              <img
                v-if="user.avatarUrl"
                :src="mediaUrl(user.avatarUrl)"
                class="h-8 w-8 rounded-full object-cover"
                alt=""
              />
              <div
                v-else
                class="flex h-8 w-8 items-center justify-center rounded-full bg-tambouille-accent text-xs font-semibold text-white"
              >
                {{ user.displayName?.[0]?.toUpperCase() }}
              </div>
              <div class="min-w-0">
                <div class="truncate text-sm font-medium">{{ user.displayName }}</div>
                <div class="truncate text-xs text-tambouille-muted">@{{ user.username }}</div>
              </div>
            </RouterLink>
          </div>
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
