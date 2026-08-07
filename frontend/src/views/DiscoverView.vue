<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import MixListItem from '@/components/MixListItem.vue'
import MixSlider from '@/components/MixSlider.vue'
import type { Mix, MixListResponse } from '@/types'

const authStore = useAuthStore()

const search = ref('')
const loading = ref(false)
const isSearching = computed(() => search.value.trim().length > 0)

// Curated sections (shown when not searching)
const latestMixes = ref<Mix[]>([])
const followingTopMixes = ref<Mix[]>([])
const recentlyPlayedMixes = ref<Mix[]>([])

// Flat search results (shown while searching)
const searchResults = ref<Mix[]>([])
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
    const { data } = await apiClient.get<MixListResponse>('/mixes', {
      params: { q: search.value, page: page.value, limit: 20 },
    })
    searchResults.value = data.items
    totalPages.value = data.totalPages
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
      loadSections()
    }
  }, 300)
})

watch(page, () => {
  if (isSearching.value) loadSearchResults()
})

onMounted(loadSections)
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8">
    <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-2xl font-bold">Découvrir des mixs</h1>
      <input
        v-model="search"
        type="search"
        placeholder="Rechercher un mix, un style..."
        class="w-full rounded-full border border-tambouille-border bg-tambouille-surface px-4 py-2 outline-none focus:border-tambouille-accent sm:w-72"
      />
    </div>

    <div v-if="loading && !latestMixes.length && !searchResults.length" class="py-16 text-center text-tambouille-muted">
      Chargement...
    </div>

    <template v-else-if="isSearching">
      <div v-if="searchResults.length === 0" class="py-16 text-center text-tambouille-muted">Aucun mix trouvé.</div>

      <div v-else class="space-y-3">
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
      <section class="mb-10">
        <h2 class="mb-4 text-lg font-semibold">Derniers uploads</h2>
        <div v-if="latestMixes.length === 0" class="py-8 text-center text-tambouille-muted">
          Aucun mix trouvé. Sois le premier à en uploader un !
        </div>
        <MixSlider v-else :mixes="latestMixes" />
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
        <div v-else class="space-y-3">
          <MixListItem v-for="mix in recentlyPlayedMixes" :key="mix.id" :mix="mix" />
        </div>
      </section>
    </template>
  </div>
</template>
