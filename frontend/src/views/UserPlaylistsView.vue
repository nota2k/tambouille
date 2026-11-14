<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { fetchUserPlaylists } from '@/utils/playlists'
import PlaylistCard from '@/components/PlaylistCard.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import { PAR_PAGE } from '@/utils/pagination'
import type { PlaylistSummary } from '@/types'
import { useSeo } from '@/composables/useSeo'
import { poserLaPage } from '@/composables/useSmoothScroll'

const route = useRoute()

const playlists = ref<PlaylistSummary[]>([])
const total = ref(0)
const page = ref(1)
const totalPages = ref(1)
const loading = ref(true)

const username = computed(() => String(route.params.username))

async function load() {
  loading.value = true
  try {
    const data = await fetchUserPlaylists(username.value, {
      page: page.value,
      limit: PAR_PAGE,
    })
    playlists.value = data.items
    total.value = data.total
    totalPages.value = data.totalPages
  } finally {
    loading.value = false
  }
}

/**
 * Changer de page recharge, et remonte en haut de la liste.
 *
 * Sans la remontée, on arrive au bas de la page suivante — là où l'on venait de
 * cliquer — devant sa fin plutôt que son début.
 */
function allerA(cible: number) {
  page.value = cible
  poserLaPage(0)
  void load()
}

useSeo(() => ({
  title: `Playlists de ${username.value}`,
  description: `Les playlists de ${username.value} sur Tambouille.`,
}))

onMounted(load)
// Changer de compte repart de la première page : la cinquième du précédent
// n'existe peut-être pas ici, et la liste serait vide sans rien dire.
watch(
  () => route.params.username,
  () => allerA(1),
)
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

    <PaginationBar
      :page="page"
      :total-pages="totalPages"
      :disabled="loading"
      @update:page="allerA"
    />
  </div>
</template>
