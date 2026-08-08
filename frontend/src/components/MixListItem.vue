<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { mediaUrl } from '@/utils/media'
import { formatDate } from '@/utils/date'
import { toggleMixFavorite } from '@/utils/favorites'
import WaveformPlayer from '@/components/WaveformPlayer.vue'
import ShareButton from '@/components/ShareButton.vue'
import type { Mix } from '@/types'

const props = defineProps<{ mix: Mix }>()
const authStore = useAuthStore()
const router = useRouter()

function toggleFavorite(event: Event) {
  event.preventDefault()
  event.stopPropagation()
  if (!authStore.isAuthenticated) {
    router.push({ name: 'login' })
    return
  }
  toggleMixFavorite(props.mix).catch(() => { })
}
</script>

<template>
  <RouterLink :to="{ name: 'mix-detail', params: { id: mix.id } }"
    class="group flex gap-[10px] min-[400px]:gap-4 lg:gap-8 bg-tambouille-surface transition hover:border-tambouille-accent">
    <div class="relative rounded-xl aspect-square overflow-hidden bg-tambouille-surface-hover shrink-0 self-start w-[clamp(60px,25vw,200px)]">
      <img v-if="mix.coverUrl" :src="mediaUrl(mix.coverUrl)" class="aspect-square w-full object-cover" alt="" />
      <div v-else class="flex h-full w-full items-center justify-center text-tambouille-muted">
        <svg viewBox="0 0 24 24" class="h-7 w-7 fill-current opacity-40">
          <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
        </svg>
      </div>

    </div>

    <div class="info-mix flex flex-1 min-w-0 flex-col gap-4 py-4">
      <div class="min-w-0 flex-1">
        <div class="flex flex-row w-full gap-2 items-center font-[600]">
          <p class="truncate text-xs text-tambouille-muted">{{ mix.user.displayName }}</p>
          •
          <span class="truncate text-xs text-tambouille-muted">{{ formatDate(mix.createdAt) }}</span>

        </div>

        <p class="truncate text-2xl font-semibold mb-4">{{ mix.title }}</p>

        <div v-if="mix.tags.length" class="mt-1.5 flex flex-wrap gap-1.5">
          <span v-for="tag in mix.tags" :key="tag"
            class="rounded-full bg-tambouille-surface-hover px-2 py-0.5 text-[11px] text-tambouille-muted">
            #{{ tag }}
          </span>
        </div>
      </div>

      <WaveformPlayer :mix="mix" />

      <div class="flex flex-1 shrink-0 items-center gap-3 w-full">
        <div class="hidden gap-1 text-xs text-tambouille-muted sm:flex">
          <div class="flex gap-2">
            <span class="flex items-center px-2 rounded-sm gap-2 border border-tambouille-muted leading-none shrink w-auto"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                class="lucide lucide-play-icon lucide-play">
                <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
              </svg>
              {{ mix.playsCount }}</span>
            <span class="flex items-center px-2 rounded-sm gap-2 border border-tambouille-muted leading-none shrink w-auto"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-circle-icon lucide-message-circle"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/></svg>{{ mix.commentsCount }}
              </span>
          </div>
          <button
            class="flex items-center rounded-sm gap-2 border border-tambouille-muted gap-1 rounded-full px-1 text-tambouille-accent hover:bg-tambouille-surface-hover text-tambouille-accent leading-none"
            :class="{ 'text-tambouille-accent': mix.isFavorited }"
            :title="mix.isFavorited ? 'Retirer des favoris' : 'Ajouter aux favoris'" @click="toggleFavorite">
            <svg v-if="mix.isFavorited" viewBox="0 0 24 24" class="h-5 w-5 fill-current">
              <path
                d="M12 21s-6.716-4.35-9.428-8.108C.688 10.09 1.2 6.6 4.05 5.02c2.19-1.213 4.766-.62 6.2 1.02l1.75 2 1.75-2c1.434-1.64 4.01-2.233 6.2-1.02 2.85 1.58 3.362 5.07 1.478 7.872C18.716 16.65 12 21 12 21z" />
            </svg>
            <svg v-else viewBox="0 0 24 24" class="h-5 w-5 fill-none stroke-current stroke-2">
              <path
                d="M12 21s-6.716-4.35-9.428-8.108C.688 10.09 1.2 6.6 4.05 5.02c2.19-1.213 4.766-.62 6.2 1.02l1.75 2 1.75-2c1.434-1.64 4.01-2.233 6.2-1.02 2.85 1.58 3.362 5.07 1.478 7.872C18.716 16.65 12 21 12 21z" />
            </svg>
            <span class="text-xs">{{ mix.favoritesCount }}</span>
          </button>
          <ShareButton :url="`/mixes/${mix.id}`" variant="pill" />
        </div>


      </div>
    </div>
  </RouterLink>
</template>
