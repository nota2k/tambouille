<script setup lang="ts">
import { usePlayerStore } from '@/stores/player'
import { mediaUrl } from '@/utils/media'
import ShareButton from '@/components/ShareButton.vue'
import AddToPlaylistButton from '@/components/AddToPlaylistButton.vue'
import { mixShareUrl } from '@/utils/share'
import type { Mix } from '@/types'

const props = defineProps<{ mix: Mix }>()
const playerStore = usePlayerStore()

function play(event: Event) {
  event.preventDefault()
  event.stopPropagation()
  playerStore.play(props.mix)
}
</script>

<template>
  <RouterLink
    :to="{ name: 'mix-detail', params: { id: mix.id } }"
    class="group relative block w-40 shrink-0 sm:w-48"
  >
    <div class="relative aspect-square w-full overflow-hidden rounded-xl bg-tambouille-surface-hover">
      <img v-if="mix.coverUrl" :src="mediaUrl(mix.coverUrl)" class="h-full w-full object-cover" alt="" />
      <div v-else class="flex h-full w-full items-center justify-center text-tambouille-muted">
        <svg viewBox="0 0 24 24" class="h-10 w-10 fill-current opacity-40">
          <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
        </svg>
      </div>

      <button
        class="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-tambouille-accent text-white opacity-0 shadow-lg transition group-hover:opacity-100 hover:bg-tambouille-accent-hover"
        @click="play"
      >
        <svg viewBox="0 0 24 24" class="ml-0.5 h-4 w-4 fill-current">
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>
    </div>

    <!-- Outside the cover: its overflow-hidden would clip the playlist dropdown. -->
    <ShareButton :url="mixShareUrl(mix.id)" variant="overlay" />
    <AddToPlaylistButton :mix-id="mix.id" variant="overlay" />

    <p class="mt-2 truncate text-sm font-semibold">{{ mix.title }}</p>
    <p class="truncate text-xs text-tambouille-muted">{{ mix.user.displayName }}</p>
  </RouterLink>
</template>
