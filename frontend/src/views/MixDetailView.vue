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
import UploaderCard from '@/components/UploaderCard.vue'
import CommentsSection from '@/components/CommentsSection.vue'
import ShareButton from '@/components/ShareButton.vue'
import AddToPlaylistButton from '@/components/AddToPlaylistButton.vue'
import { mixShareUrl } from '@/utils/share'
import type { Mix, TracklistEntry, UserProfile } from '@/types'

const route = useRoute()
const router = useRouter()
const playerStore = usePlayerStore()
const authStore = useAuthStore()

const mix = ref<Mix | null>(null)
const uploaderProfile = ref<UserProfile | null>(null)
const loading = ref(true)
const deleting = ref(false)

async function loadMix() {
  loading.value = true
  try {
    const { data } = await apiClient.get<Mix>(`/mixes/${route.params.id}`)
    mix.value = data
    const { data: profileData } = await apiClient.get<UserProfile>(`/users/${data.user.username}`)
    uploaderProfile.value = profileData
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
  <div class="mx-auto max-w-6xl px-4 py-8">
    <div v-if="loading" class="py-16 text-center text-tambouille-muted">Chargement...</div>

    <div v-else-if="mix" class="flex flex-col gap-6 sm:flex-row">
      <div class="mx-auto w-78 shrink-0 sm:mx-0">
        <div class="aspect-square w-full overflow-hidden bg-tambouille-surface-hover">
          <img v-if="mix.coverUrl" :src="mediaUrl(mix.coverUrl)" class="h-full w-full object-cover" alt="" />
          <div v-else class="flex h-full w-full items-center justify-center text-tambouille-muted">
            <svg viewBox="0 0 24 24" class="h-16 w-16 fill-current opacity-40">
              <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
            </svg>
          </div>
        </div>
      </div>

      <div class="min-w-0 flex-1">
        <h1 class="text-tambouille-title-big font-bold pb-2 leading-tight mb-6 border-b border-tambouille-accent">{{ mix.title }}</h1>
        <RouterLink
          :to="{ name: 'profile', params: { username: mix.user.username } }"
          class="text-tambouille-muted hover:underline"
        >
          {{ mix.user.displayName }}
        </RouterLink>

        <div class="mt-4 flex flex-wrap items-center gap-3">
          <button
            class="flex items-center w-full gap-2 rounded-full bg-tambouille-action px-5 py-2 font-semibold text-tambouille-text-black hover:bg-tambouille-action-hover"
            @click="play"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5 fill-current">
              <path d="M8 5v14l11-7z" />
            </svg>
            Écouter
          </button>
          <span v-if="mix.audioUrl" class="text-sm text-tambouille-muted">{{ mix.playsCount }} écoutes</span>
          <span class="text-sm text-tambouille-muted">{{ mix.commentsCount }} commentaires</span>

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

          <AddToPlaylistButton :mix-id="mix.id" />

          <ShareButton :url="mixShareUrl(mix.id)" />
        </div>

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
    <hr class="color-tambouille-accent my-6 border-2">
    <div class="mt-8">
    <p v-if="mix?.description" class="mt-8 whitespace-pre-line text-lg text-tambouille-text/90">
      {{ mix.description }}
    </p>
    </div>

    <div class="mt-8 grid items-start gap-6 lg:grid-cols-3">
      <div v-if="mix && mix.tracklist.length > 0" class="lg:col-span-2">
        <h2 class="mb-3 text-lg font-semibold">Tracklist</h2>
        <div class="overflow-hidden bg-tambouille-accent">
          <!-- Same grid template as the rows below, so headers stay aligned with their columns. -->
          <div
            class="grid grid-cols-[1.5rem_4rem_1fr_1fr] items-center gap-4 border-b border-tambouille-white/25 px-4 py-2 text-xs uppercase tracking-wide text-tambouille-white/70"
          >
            <span class="text-right">#</span>
            <span>Time</span>
            <span>Artist</span>
            <span>Title</span>
          </div>

          <ol class="divide-y divide-tambouille-white/15">
            <li v-for="(entry, index) in mix.tracklist" :key="entry.id">
              <button
                class="grid w-full cursor-pointer grid-cols-[1.5rem_4rem_1fr_1fr] items-center gap-4 px-4 py-3 text-left transition hover:bg-tambouille-accent-hover"
                @click="playFromTrack(entry)"
              >
                <span class="text-right text-sm text-tambouille-white">{{ index + 1 }}</span>
                <span class="font-mono text-xs text-tambouille-white/80">
                  {{ formatTime(entry.timecodeSec) }}
                </span>
                <span class="min-w-0 truncate text-sm font-medium text-tambouille-white">{{ entry.artist }}</span>
                <span class="min-w-0 truncate text-sm text-tambouille-white">{{ entry.title }}</span>
              </button>
            </li>
          </ol>
        </div>
      </div>

      <!-- Wrapper : UploaderCard rend plusieurs nœuds racines, la classe ne peut pas lui être passée directement. -->
      <div v-if="uploaderProfile" :class="mix && mix.tracklist.length > 0 ? 'lg:col-span-1' : 'lg:col-span-1'">
        <UploaderCard :profile="uploaderProfile" />
      </div>
    </div>

    <CommentsSection v-if="mix" :mix="mix" />
  </div>
</template>
