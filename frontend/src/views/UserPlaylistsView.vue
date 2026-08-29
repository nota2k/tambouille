<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { fetchUserPlaylists } from '@/utils/playlists'
import PlaylistCard from '@/components/PlaylistCard.vue'
import type { PlaylistSummary } from '@/types'
import { useSeo } from '@/composables/useSeo'

const route = useRoute()

const playlists = ref<PlaylistSummary[]>([])
const total = ref(0)
const loading = ref(true)

const username = computed(() => String(route.params.username))

async function load() {
  loading.value = true
  try {
    const data = await fetchUserPlaylists(username.value, { limit: 50 })
    playlists.value = data.items
    total.value = data.total
  } finally {
    loading.value = false
  }
}

useSeo(() => ({
  title: `Playlists de ${username.value}`,
  description: `Les playlists de ${username.value} sur Tambouille.`,
}))

onMounted(load)
watch(() => route.params.username, load)
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8">
    <RouterLink
      :to="{ name: 'profile', params: { username } }"
      class="text-sm text-tambouille-muted hover:underline"
    >
      ← Retour au profil
    </RouterLink>

    <h1 class="mb-6 mt-2 text-2xl font-bold">Playlists ({{ total }})</h1>

    <div v-if="loading" class="py-12 text-center text-tambouille-muted">Chargement...</div>
    <div v-else-if="!playlists.length" class="py-12 text-center text-tambouille-muted">
      Aucune playlist pour l’instant.
    </div>
    <div v-else class="flex flex-wrap gap-4">
      <PlaylistCard v-for="playlist in playlists" :key="playlist.id" :playlist="playlist" />
    </div>
  </div>
</template>
