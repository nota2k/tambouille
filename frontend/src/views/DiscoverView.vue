<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { apiClient } from '@/api/client'
import MixCard from '@/components/MixCard.vue'
import type { Mix, MixListResponse } from '@/types'

const mixes = ref<Mix[]>([])
const search = ref('')
const loading = ref(false)
const page = ref(1)
const totalPages = ref(1)

let searchTimeout: ReturnType<typeof setTimeout> | undefined

async function loadMixes() {
  loading.value = true
  try {
    const { data } = await apiClient.get<MixListResponse>('/mixes', {
      params: { q: search.value || undefined, page: page.value, limit: 20 },
    })
    mixes.value = data.items
    totalPages.value = data.totalPages
  } finally {
    loading.value = false
  }
}

watch(search, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    page.value = 1
    loadMixes()
  }, 300)
})

watch(page, loadMixes)

onMounted(loadMixes)
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

    <div v-if="loading && mixes.length === 0" class="py-16 text-center text-tambouille-muted">Chargement...</div>

    <div v-else-if="mixes.length === 0" class="py-16 text-center text-tambouille-muted">
      Aucun mix trouvé. Sois le premier à en uploader un !
    </div>

    <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      <MixCard v-for="mix in mixes" :key="mix.id" :mix="mix" />
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
  </div>
</template>
