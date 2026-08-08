<script setup lang="ts">
import { usePlayerStore } from '@/stores/player'
import { mediaUrl } from '@/utils/media'
import ShareButton from '@/components/ShareButton.vue'
import AddToPlaylistButton from '@/components/AddToPlaylistButton.vue'
import { mixShareUrl } from '@/utils/share'
import type { Mix } from '@/types'

const props = withDefaults(defineProps<{ mix: Mix; landscape?: boolean }>(), {
  landscape: false,
})
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
    :class="[
      'group relative block shrink-0',
      landscape ? 'w-full' : 'w-40 sm:w-48',
    ]"
  >
    <div
      :class="[
        'relative w-full overflow-hidden rounded-xl bg-tambouille-surface-hover',
        landscape ? 'aspect-video' : 'aspect-3/4',
      ]"
    >
      <img v-if="mix.coverUrl" :src="mediaUrl(mix.coverUrl)" class="h-full w-full object-cover" alt="" />
      <div v-else class="flex h-full w-full items-center justify-center text-tambouille-muted">
        <svg viewBox="0 0 24 24" class="h-10 w-10 fill-current opacity-40 color-tambouille-white">
          <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
        </svg>
      </div>

      <div v-if="landscape" class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      <div v-if="landscape" class="absolute bottom-0 left-0 right-0 p-4 text-white">
        <p class="truncate text-base font-semibold drop-shadow-sm">{{ mix.title }}</p>
        <p class="truncate text-sm opacity-80 drop-shadow-sm">{{ mix.user.displayName }}</p>
      </div>

      <button
        :class="[
          'absolute flex items-center justify-center rounded-full bg-tambouille-accent text-white opacity-0 shadow-lg transition group-hover:opacity-100 hover:bg-tambouille-accent-hover',
          landscape ? 'bottom-4 right-4 h-12 w-12' : 'bottom-2 right-2 h-10 w-10',
        ]"
        @click="play"
      >
        <svg viewBox="0 0 24 24" :class="['ml-0.5 fill-current', landscape ? 'h-5 w-5' : 'h-4 w-4']">
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>
    </div>

    <ShareButton :url="mixShareUrl(mix.id)" variant="overlay" />
    <AddToPlaylistButton :mix-id="mix.id" variant="overlay" />

    <template v-if="!landscape">
      <p class="mt-2 truncate text-sm font-semibold">{{ mix.title }}</p>
      <p class="truncate text-xs text-tambouille-muted">{{ mix.user.displayName }}</p>
    </template>
  </RouterLink>
</template>
