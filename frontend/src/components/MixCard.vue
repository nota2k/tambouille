<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { mediaUrl } from '@/utils/media'
import CoverImage from '@/components/CoverImage.vue'
import { formatDuration } from '@/utils/time'
import { mixCredit } from '@/composables/useMixCredit'
import ShareButton from '@/components/ShareButton.vue'
import AddToPlaylistButton from '@/components/AddToPlaylistButton.vue'
import { mixShareUrl } from '@/utils/share'
import { mixRoute } from '@/utils/routes'
import type { Mix } from '@/types'

const props = withDefaults(defineProps<{ mix: Mix; landscape?: boolean }>(), {
  landscape: false,
})
const playerStore = usePlayerStore()

const duration = computed(() => formatDuration(props.mix.durationSec))
const credit = computed(() => mixCredit(props.mix))

function play(event: Event) {
  event.preventDefault()
  event.stopPropagation()
  playerStore.play(props.mix)
}
</script>

<template>
  <!--
    Une seule règle de pochette dans tout le site : carrée, sans bordure, sans
    arrondi. `landscape` ne change plus le format de l'image — seulement la
    largeur de la carte — pour que deux mix côte à côte n'aient jamais deux
    silhouettes différentes.
  -->
  <RouterLink
    :to="mixRoute(mix)"
    :class="['group relative block shrink-0', landscape ? 'w-full' : 'w-40 sm:w-48']"
  >
    <div class="relative aspect-square w-full overflow-hidden bg-tambouille-surface-hover">
      <CoverImage :src="mediaUrl(mix.coverUrl)">
        <template #vide>
          <div class="flex h-full w-full items-center justify-center text-tambouille-faint">
            <svg viewBox="0 0 24 24" class="h-10 w-10 fill-current">
              <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
            </svg>
          </div>
        </template>
      </CoverImage>

      <button
        class="absolute bottom-0 right-0 flex h-11 w-11 items-center justify-center bg-tambouille-accent text-tambouille-ink-on-accent opacity-0 transition group-hover:opacity-100 hover:bg-tambouille-accent-hover"
        aria-label="Lire ce mix"
        @click="play"
      >
        <svg viewBox="0 0 24 24" class="ml-0.5 h-5 w-5 fill-current">
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>
    </div>

    <ShareButton :url="mixShareUrl(mix)" variant="overlay" />
    <AddToPlaylistButton :mix-id="mix.id" variant="overlay" />

    <p class="mt-2.5 font-display text-[15px] font-bold leading-snug text-tambouille-text">
      {{ mix.title }}
    </p>
    <p class="mt-1 truncate text-[13px] text-tambouille-muted">
      <span class="artiste">{{ credit.primary }}</span
      ><template v-if="duration"> · {{ duration }}</template>
      <span v-if="credit.secondary" class="block text-tambouille-muted">
        importé par {{ credit.secondary }}
      </span>
    </p>
  </RouterLink>
</template>
