<script setup lang="ts">
import { useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { useAuthStore } from '@/stores/auth'
import { mediaUrl } from '@/utils/media'
import { formatDate } from '@/utils/date'
import { toggleMixFavorite } from '@/utils/favorites'
import type { Mix } from '@/types'

const props = defineProps<{ mix: Mix }>()
const playerStore = usePlayerStore()
const authStore = useAuthStore()
const router = useRouter()

function play(event: Event) {
  event.preventDefault()
  event.stopPropagation()
  playerStore.play(props.mix)
}

function toggleFavorite(event: Event) {
  event.preventDefault()
  event.stopPropagation()
  if (!authStore.isAuthenticated) {
    router.push({ name: 'login' })
    return
  }
  toggleMixFavorite(props.mix).catch(() => {})
}
</script>

<template>
  <RouterLink
    :to="{ name: 'mix-detail', params: { id: mix.id } }"
    class="group flex items-center gap-4 rounded-xl border border-tambouille-border bg-tambouille-surface p-3 transition hover:border-tambouille-accent"
  >
    <div class="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-tambouille-surface-hover">
      <img v-if="mix.coverUrl" :src="mediaUrl(mix.coverUrl)" class="h-full w-full object-cover" alt="" />
      <div v-else class="flex h-full w-full items-center justify-center text-tambouille-muted">
        <svg viewBox="0 0 24 24" class="h-7 w-7 fill-current opacity-40">
          <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
        </svg>
      </div>

      <button
        class="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition group-hover:opacity-100"
        @click="play"
      >
        <svg viewBox="0 0 24 24" class="ml-0.5 h-6 w-6 fill-current">
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>
    </div>

    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-semibold">{{ mix.title }}</p>
      <p class="truncate text-xs text-tambouille-muted">{{ mix.user.displayName }}</p>

      <div v-if="mix.tags.length" class="mt-1.5 flex flex-wrap gap-1.5">
        <span
          v-for="tag in mix.tags"
          :key="tag"
          class="rounded-full bg-tambouille-surface-hover px-2 py-0.5 text-[11px] text-tambouille-muted"
        >
          #{{ tag }}
        </span>
      </div>
    </div>

    <div class="flex shrink-0 items-center gap-3">
      <div class="hidden flex-col items-end gap-1 text-xs text-tambouille-muted sm:flex">
        <span>{{ mix.playsCount }} écoutes</span>
        <span>{{ formatDate(mix.createdAt) }}</span>
      </div>

      <button
        class="flex items-center gap-1 rounded-full p-1.5 text-tambouille-accent hover:bg-tambouille-surface-hover"
        :class="{ 'text-tambouille-accent': mix.isFavorited }"
        :title="mix.isFavorited ? 'Retirer des favoris' : 'Ajouter aux favoris'"
        @click="toggleFavorite"
      >
        <svg v-if="mix.isFavorited" viewBox="0 0 24 24" class="h-5 w-5 fill-current">
          <path
            d="M12 21s-6.716-4.35-9.428-8.108C.688 10.09 1.2 6.6 4.05 5.02c2.19-1.213 4.766-.62 6.2 1.02l1.75 2 1.75-2c1.434-1.64 4.01-2.233 6.2-1.02 2.85 1.58 3.362 5.07 1.478 7.872C18.716 16.65 12 21 12 21z"
          />
        </svg>
        <svg v-else viewBox="0 0 24 24" class="h-5 w-5 fill-none stroke-current stroke-2">
          <path
            d="M12 21s-6.716-4.35-9.428-8.108C.688 10.09 1.2 6.6 4.05 5.02c2.19-1.213 4.766-.62 6.2 1.02l1.75 2 1.75-2c1.434-1.64 4.01-2.233 6.2-1.02 2.85 1.58 3.362 5.07 1.478 7.872C18.716 16.65 12 21 12 21z"
          />
        </svg>
        <span class="text-xs">{{ mix.favoritesCount }}</span>
      </button>
    </div>
  </RouterLink>
</template>
