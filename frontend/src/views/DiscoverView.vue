<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { mediaUrl } from '@/utils/media'
import MixListItem from '@/components/MixListItem.vue'
import MixCard from '@/components/MixCard.vue'
import TagsOverlay from '@/components/TagsOverlay.vue'
import type { Mix, MixListResponse, AuthorSummary } from '@/types'

const authStore = useAuthStore()
const route = useRoute()

const search = ref(typeof route.query.q === 'string' ? route.query.q : '')
const sortBy = ref<'recent' | 'plays'>('recent')
const loading = ref(false)
const showTagsOverlay = ref(false)
const selectedTags = ref<string[]>([])
const isSearching = computed(() => search.value.trim().length > 0 || selectedTags.value.length > 0 || sortBy.value !== 'recent')

function toggleTag(tag: string) {
  const idx = selectedTags.value.indexOf(tag)
  if (idx >= 0) {
    selectedTags.value.splice(idx, 1)
  } else {
    selectedTags.value.push(tag)
  }
  page.value = 1
  loadSearchResults()
}

// Curated sections (shown when not searching)
const latestMixes = ref<Mix[]>([])
const followingTopMixes = ref<Mix[]>([])
const recentlyPlayedMixes = ref<Mix[]>([])

// Flat search results (shown while searching)
const searchResults = ref<Mix[]>([])
const userResults = ref<AuthorSummary[]>([])
const page = ref(1)
const totalPages = ref(1)

let searchTimeout: ReturnType<typeof setTimeout> | undefined

async function loadSections() {
  loading.value = true
  try {
    const requests: [Promise<{ data: MixListResponse }>, Promise<{ data: MixListResponse }>?, Promise<{ data: MixListResponse }>?] = [
      apiClient.get<MixListResponse>('/mixes', { params: { limit: 10 } }),
    ]
    if (authStore.isAuthenticated) {
      requests.push(apiClient.get<MixListResponse>('/mixes/feed/following', { params: { limit: 10 } }))
      requests.push(apiClient.get<MixListResponse>('/mixes/me/recent', { params: { limit: 10 } }))
    }
    const [latest, followingTop, recentlyPlayed] = await Promise.all(requests)
    latestMixes.value = latest.data.items
    followingTopMixes.value = followingTop?.data.items ?? []
    recentlyPlayedMixes.value = recentlyPlayed?.data.items ?? []
  } finally {
    loading.value = false
  }
}

async function loadSearchResults() {
  loading.value = true
  try {
    const mixesPromise = apiClient.get<MixListResponse>('/mixes', {
      params: {
        q: search.value || undefined,
        tags: selectedTags.value.length ? selectedTags.value.join(',') : undefined,
        sort: sortBy.value,
        page: page.value,
        limit: 20,
      },
    })

    const q = search.value.trim()
    const usersPromise = q.length >= 2
      ? apiClient.get<{ items: AuthorSummary[] }>('/users/search', { params: { q, limit: 5 } })
      : Promise.resolve(null)

    const [mixesRes, usersRes] = await Promise.all([mixesPromise, usersPromise])
    searchResults.value = mixesRes.data.items
    totalPages.value = mixesRes.data.totalPages
    userResults.value = usersRes?.data.items ?? []
  } finally {
    loading.value = false
  }
}

watch(search, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    page.value = 1
    if (isSearching.value) {
      loadSearchResults()
    } else {
      userResults.value = []
      loadSections()
    }
  }, 300)
})

watch(() => route.query.q, (q) => {
  search.value = typeof q === 'string' ? q : ''
})

watch(sortBy, () => {
  page.value = 1
  loadSearchResults()
})

watch(page, () => {
  if (isSearching.value) loadSearchResults()
})

onMounted(loadSections)
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8">
    <div class="flex flex-col flex-wrap gap-4 sm:flex-row sm:items-center sm:justify-between min-h-[40vh]">
      <h1 class="text-tambouille-clamp-big leading-none font-bold w-full">Découvrir des mixs</h1>
      <div class="flex items-center gap-2">
        <button
          class="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-sm transition"
          :class="
            selectedTags.length
              ? 'border-tambouille-accent bg-tambouille-accent text-white'
              : 'border-tambouille-border hover:border-tambouille-accent'
          "
          @click="showTagsOverlay = true"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
            <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
          </svg>
          Tags
          <span v-if="selectedTags.length" class="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-xs">
            {{ selectedTags.length }}
          </span>
        </button>
        <select
          v-model="sortBy"
          class="rounded-full border border-tambouille-border bg-tambouille-surface px-3 py-2 text-sm outline-none focus:border-tambouille-accent"
        >
          <option value="recent">Plus récents</option>
          <option value="plays">Plus écoutés</option>
        </select>
      </div>
    </div>

    <div v-if="selectedTags.length" class="mb-4 flex flex-wrap items-center gap-2">
      <button
        v-for="tag in selectedTags"
        :key="tag"
        class="flex items-center gap-1 rounded-full bg-tambouille-accent px-3 py-1 text-sm text-white transition hover:bg-tambouille-accent-hover"
        @click="toggleTag(tag)"
      >
        #{{ tag }}
        <svg viewBox="0 0 24 24" class="h-3.5 w-3.5 fill-current">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      </button>
    </div>

    <TagsOverlay
      v-if="showTagsOverlay"
      :selected="selectedTags"
      @toggle="toggleTag"
      @close="showTagsOverlay = false"
    />

    <div v-if="loading && !latestMixes.length && !searchResults.length" class="py-16 text-center text-tambouille-muted">
      Chargement...
    </div>

    <template v-else-if="isSearching">
      <section v-if="userResults.length > 0" class="mb-8">
        <h2 class="mb-4 text-lg font-semibold">Utilisateurs</h2>
        <div class="flex flex-wrap gap-4">
          <RouterLink
            v-for="user in userResults"
            :key="user.id"
            :to="{ name: 'profile', params: { username: user.username } }"
            class="flex items-center gap-3 rounded-xl border border-tambouille-border bg-tambouille-surface px-4 py-3 transition hover:border-tambouille-accent"
          >
            <img
              v-if="user.avatarUrl"
              :src="mediaUrl(user.avatarUrl)"
              class="h-10 w-10 rounded-full object-cover"
              alt=""
            />
            <div
              v-else
              class="flex h-10 w-10 items-center justify-center rounded-full bg-tambouille-accent text-sm font-semibold text-white"
            >
              {{ user.displayName?.[0]?.toUpperCase() }}
            </div>
            <div class="min-w-0">
              <div class="truncate text-sm font-medium">{{ user.displayName }}</div>
              <div class="truncate text-xs text-tambouille-muted">@{{ user.username }}</div>
            </div>
          </RouterLink>
        </div>
      </section>

      <div v-if="searchResults.length === 0 && userResults.length === 0" class="py-16 text-center text-tambouille-muted">Aucun résultat trouvé.</div>

      <div v-if="searchResults.length > 0" class="space-y-3">
        <MixListItem v-for="mix in searchResults" :key="mix.id" :mix="mix" />
      </div>

      <div v-if="totalPages > 1" class="mt-8 flex items-center justify-center gap-4">
        <button
          class="rounded-full border border-tambouille-border px-4 py-2 text-sm disabled:opacity-40"
          :disabled="page <= 1"
          @click="page--"
        >
          Précédent
        </button>
        <span class="text-sm text-tambouille-muted">Page {{ page }} / {{ totalPages }}</span>
        <button
          class="rounded-full border border-tambouille-border px-4 py-2 text-sm disabled:opacity-40"
          :disabled="page >= totalPages"
          @click="page++"
        >
          Suivant
        </button>
      </div>
    </template>

    <template v-else>
      <section class="mb-10 bg-tambouille-action py-6 px-12">
        <h2 class="mb-4 text-tambouille-clamp-big text-tambouille-white font-semibold">Derniers uploads</h2>
        <div v-if="latestMixes.length === 0" class="py-8 text-center text-tambouille-muted">
          Aucun mix trouvé. Sois le premier à en uploader un !
        </div>
        <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MixCard v-for="mix in latestMixes.slice(0, 3)" :key="mix.id" :mix="mix" landscape />
        </div>
      </section>

      <section v-if="authStore.isAuthenticated" class="mb-10">
        <h2 class="mb-4 text-lg font-semibold">Les plus écoutés de vos abonnements</h2>
        <div v-if="followingTopMixes.length === 0" class="py-8 text-center text-tambouille-muted">
          Suivez d'autres utilisateurs pour voir leurs mixs les plus populaires ici.
        </div>
        <div v-else class="space-y-3">
          <MixListItem v-for="mix in followingTopMixes" :key="mix.id" :mix="mix" />
        </div>
      </section>

      <section v-if="authStore.isAuthenticated">
        <h2 class="mb-4 text-lg font-semibold">Vos derniers mixs écoutés</h2>
        <div v-if="recentlyPlayedMixes.length === 0" class="py-8 text-center text-tambouille-muted">
          Les mixs que vous écoutez apparaîtront ici.
        </div>
        <div v-else class="space-y-3 flex flex-col gap-8">
          <MixListItem v-for="mix in recentlyPlayedMixes" :key="mix.id" :mix="mix" />
        </div>
      </section>
    </template>
  </div>
</template>
