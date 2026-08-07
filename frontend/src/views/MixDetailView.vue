<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiClient } from '@/api/client'
import { usePlayerStore } from '@/stores/player'
import { useAuthStore } from '@/stores/auth'
import { mediaUrl } from '@/utils/media'
import { formatTime } from '@/utils/time'
import { formatDate } from '@/utils/date'
import { toggleMixFavorite } from '@/utils/favorites'
import type { Mix, TracklistEntry } from '@/types'

const route = useRoute()
const router = useRouter()
const playerStore = usePlayerStore()
const authStore = useAuthStore()

const mix = ref<Mix | null>(null)
const loading = ref(true)
const deleting = ref(false)

async function loadMix() {
  loading.value = true
  try {
    const { data } = await apiClient.get<Mix>(`/mixes/${route.params.id}`)
    mix.value = data
  } finally {
    loading.value = false
  }
}

function play() {
  if (mix.value) playerStore.play(mix.value)
}

function playFromTrack(entry: TracklistEntry) {
  if (mix.value) playerStore.playAt(mix.value, entry.timecodeSec)
}

function toggleFavorite() {
  if (!mix.value) return
  if (!authStore.isAuthenticated) {
    router.push({ name: 'login' })
    return
  }
  toggleMixFavorite(mix.value).catch(() => {})
}

async function removeMix() {
  if (!mix.value) return
  if (!confirm('Supprimer définitivement ce mix ?')) return
  deleting.value = true
  try {
    await apiClient.delete(`/mixes/${mix.value.id}`)
    router.push('/')
  } finally {
    deleting.value = false
  }
}

onMounted(loadMix)
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8">
    <div v-if="loading" class="py-16 text-center text-tambouille-muted">Chargement...</div>

    <div v-else-if="mix" class="flex flex-col gap-6 sm:flex-row">
      <div class="mx-auto w-48 shrink-0 sm:mx-0">
        <div class="aspect-square w-full overflow-hidden rounded-xl bg-tambouille-surface-hover">
          <img v-if="mix.coverUrl" :src="mediaUrl(mix.coverUrl)" class="h-full w-full object-cover" alt="" />
          <div v-else class="flex h-full w-full items-center justify-center text-tambouille-muted">
            <svg viewBox="0 0 24 24" class="h-16 w-16 fill-current opacity-40">
              <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="min-w-0 flex-1">
        <h1 class="text-2xl font-bold">{{ mix.title }}</h1>
        <RouterLink
          :to="{ name: 'profile', params: { username: mix.user.username } }"
          class="text-tambouille-muted hover:underline"
        >
          {{ mix.user.displayName }}
        </RouterLink>

        <div class="mt-4 flex items-center gap-3">
          <button
            class="flex items-center gap-2 rounded-full bg-tambouille-accent px-5 py-2 font-semibold text-white hover:bg-tambouille-accent-hover"
            @click="play"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5 fill-current">
              <path d="M8 5v14l11-7z" />
            </svg>
            Écouter
          </button>
          <span class="text-sm text-tambouille-muted">{{ mix.playsCount }} écoutes</span>

          <button
            class="flex items-center gap-1.5 rounded-full border border-tambouille-border px-3 py-2 text-sm hover:bg-tambouille-surface-hover"
            :class="{ 'border-tambouille-accent text-tambouille-accent': mix.isFavorited }"
            @click="toggleFavorite"
          >
            <svg v-if="mix.isFavorited" viewBox="0 0 24 24" class="h-4 w-4 fill-current">
              <path
                d="M12 21s-6.716-4.35-9.428-8.108C.688 10.09 1.2 6.6 4.05 5.02c2.19-1.213 4.766-.62 6.2 1.02l1.75 2 1.75-2c1.434-1.64 4.01-2.233 6.2-1.02 2.85 1.58 3.362 5.07 1.478 7.872C18.716 16.65 12 21 12 21z"
              />
            </svg>
            <svg v-else viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current stroke-2">
              <path
                d="M12 21s-6.716-4.35-9.428-8.108C.688 10.09 1.2 6.6 4.05 5.02c2.19-1.213 4.766-.62 6.2 1.02l1.75 2 1.75-2c1.434-1.64 4.01-2.233 6.2-1.02 2.85 1.58 3.362 5.07 1.478 7.872C18.716 16.65 12 21 12 21z"
              />
            </svg>
            {{ mix.isFavorited ? 'Favori' : 'Ajouter aux favoris' }}
          </button>
        </div>

        <p v-if="mix.description" class="mt-4 whitespace-pre-line text-sm text-tambouille-text/90">
          {{ mix.description }}
        </p>

        <div v-if="mix.tags.length" class="mt-4 flex flex-wrap gap-2">
          <span
            v-for="tag in mix.tags"
            :key="tag"
            class="rounded-full bg-tambouille-surface-hover px-3 py-1 text-xs text-tambouille-muted"
          >
            #{{ tag }}
          </span>
        </div>

        <p class="mt-4 text-xs text-tambouille-muted">Publié le {{ formatDate(mix.createdAt) }}</p>

        <div v-if="authStore.user?.id === mix.userId" class="mt-6 flex items-center gap-4">
          <RouterLink :to="{ name: 'mix-edit', params: { id: mix.id } }" class="text-sm text-tambouille-muted hover:underline">
            Modifier ce mix
          </RouterLink>
          <button :disabled="deleting" class="text-sm text-red-400 hover:underline disabled:opacity-50" @click="removeMix">
            Supprimer ce mix
          </button>
        </div>
      </div>
    </div>

    <div v-if="mix && mix.tracklist.length > 0" class="mt-10">
      <h2 class="mb-3 text-lg font-semibold">Tracklist</h2>
      <ol class="divide-y divide-tambouille-border overflow-hidden rounded-xl border border-tambouille-border">
        <li v-for="(entry, index) in mix.tracklist" :key="entry.id">
          <button
            class="flex w-full items-center gap-4 px-4 py-3 text-left transition hover:bg-tambouille-surface-hover"
            @click="playFromTrack(entry)"
          >
            <span class="w-6 shrink-0 text-right text-sm text-tambouille-muted">{{ index + 1 }}</span>
            <span class="shrink-0 rounded bg-tambouille-surface-hover px-2 py-0.5 font-mono text-xs text-tambouille-muted">
              {{ formatTime(entry.timecodeSec) }}
            </span>
            <span class="min-w-0 flex-1 truncate text-sm">
              <span class="font-medium">{{ entry.artist }}</span>
              <span class="text-tambouille-muted"> – {{ entry.title }}</span>
            </span>
          </button>
        </li>
      </ol>
    </div>
  </div>
</template>
