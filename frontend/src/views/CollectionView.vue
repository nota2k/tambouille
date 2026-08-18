<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { fetchUserPlaylists } from '@/utils/playlists'
import MixListItem from '@/components/MixListItem.vue'
import PlaylistCard from '@/components/PlaylistCard.vue'
import type { Mix, PlaylistSummary } from '@/types'

type Tab = 'mixes' | 'favorites' | 'playlists'
type SortOrder = 'recent' | 'oldest'

const authStore = useAuthStore()

const mixes = ref<Mix[]>([])
const favorites = ref<Mix[]>([])
const playlists = ref<PlaylistSummary[]>([])
const activeTab = ref<Tab>('mixes')
const loading = ref(true)

const search = ref('')
const selectedTag = ref('')
const sortOrder = ref<SortOrder>('recent')

const allTags = computed(() => {
  const source = activeTab.value === 'favorites' ? favorites.value : mixes.value
  const set = new Set<string>()
  for (const mix of source) {
    for (const tag of mix.tags) set.add(tag)
  }
  return [...set].sort()
})

const filteredMixes = computed(() => {
  const source = activeTab.value === 'favorites' ? favorites.value : mixes.value
  let result = source

  const q = search.value.trim().toLowerCase()
  if (q) {
    result = result.filter(
      (mix) =>
        mix.title.toLowerCase().includes(q) || mix.tags.some((t) => t.toLowerCase().includes(q)),
    )
  }

  if (selectedTag.value) {
    result = result.filter((mix) => mix.tags.includes(selectedTag.value))
  }

  if (sortOrder.value === 'oldest') {
    result = [...result].reverse()
  }

  return result
})

async function loadCollection() {
  loading.value = true
  try {
    const username = authStore.user!.username!
    const [{ data: mixesData }, { data: favoritesData }, playlistsData] = await Promise.all([
      apiClient.get<{ items: Mix[] }>('/mixes', { params: { username, limit: 50 } }),
      apiClient.get<{ items: Mix[] }>('/mixes/me/favorites', { params: { limit: 50 } }),
      fetchUserPlaylists(username, { limit: 50 }),
    ])
    mixes.value = mixesData.items
    favorites.value = favoritesData.items
    playlists.value = playlistsData.items
  } finally {
    loading.value = false
  }
}

function clearFilters() {
  search.value = ''
  selectedTag.value = ''
  sortOrder.value = 'recent'
}

onMounted(loadCollection)
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-10">
    <h1 class="text-2xl font-bold">Collection</h1>

    <div v-if="loading" class="py-16 text-center text-tambouille-muted">Chargement...</div>

    <template v-else>
      <div class="flex flex-wrap items-baseline gap-7 pt-6 text-[15px] text-tambouille-muted">
        <button
          class="pb-3 transition"
          :class="
            activeTab === 'mixes'
              ? 'border-b-[3px] border-tambouille-accent font-bold text-tambouille-text'
              : 'hover:text-tambouille-text'
          "
          @click="activeTab = 'mixes'"
        >
          Mix ({{ mixes.length }})
        </button>
        <button
          class="pb-3 transition"
          :class="
            activeTab === 'favorites'
              ? 'border-b-[3px] border-tambouille-accent font-bold text-tambouille-text'
              : 'hover:text-tambouille-text'
          "
          @click="activeTab = 'favorites'"
        >
          Favoris ({{ favorites.length }})
        </button>
        <button
          class="pb-3 transition"
          :class="
            activeTab === 'playlists'
              ? 'border-b-[3px] border-tambouille-accent font-bold text-tambouille-text'
              : 'hover:text-tambouille-text'
          "
          @click="activeTab = 'playlists'"
        >
          Playlists ({{ playlists.length }})
        </button>
      </div>

      <template v-if="activeTab !== 'playlists'">
        <div class="flex flex-wrap items-end gap-3 pt-5">
          <div class="min-w-0 flex-1">
            <label class="mb-1 block text-xs text-tambouille-muted">Rechercher</label>
            <input
              v-model="search"
              type="search"
              placeholder="Titre, tag…"
              class="tb-field w-full"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs text-tambouille-muted">Tag</label>
            <select v-model="selectedTag" class="tb-field">
              <option value="">Tous</option>
              <option v-for="tag in allTags" :key="tag" :value="tag">{{ tag }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs text-tambouille-muted">Tri</label>
            <select v-model="sortOrder" class="tb-field">
              <option value="recent">Plus récent</option>
              <option value="oldest">Plus ancien</option>
            </select>
          </div>
          <button
            v-if="search || selectedTag || sortOrder !== 'recent'"
            class="pb-[9px] text-xs text-tambouille-accent hover:underline"
            @click="clearFilters"
          >
            Réinitialiser
          </button>
        </div>

        <div class="pt-6">
          <p v-if="filteredMixes.length === 0" class="py-10 text-center text-tambouille-muted">
            {{ search || selectedTag ? 'Aucun résultat.' : "Aucun mix pour l'instant." }}
          </p>
          <MixListItem v-for="mix in filteredMixes" v-else :key="mix.id" :mix="mix" />
        </div>
      </template>

      <template v-else>
        <div class="pt-6">
          <p v-if="playlists.length === 0" class="py-10 text-center text-tambouille-muted">
            Aucune playlist pour l'instant.
          </p>
          <div v-else class="flex flex-wrap gap-4">
            <PlaylistCard v-for="playlist in playlists" :key="playlist.id" :playlist="playlist" />
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
