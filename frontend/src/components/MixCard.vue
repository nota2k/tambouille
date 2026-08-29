<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { mediaSrcset, mediaUrl } from '@/utils/media'
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
      <!--
        `hover:` sur l'image, et NON `group-hover:`.
        ─────────────────────────────────────────────────────────────────────
        Avec le survol de groupe, approcher le curseur d'un coin quelconque de
        la carte éclaircissait la pochette ET le titre en même temps : deux
        mouvements simultanés pour un seul geste, dont aucun ne désigne quoi
        que ce soit. Chaque élément répond maintenant à son propre survol, et
        la carte reste un lien entier — n'importe où on clique, on va au mix.

        Le bouton de lecture, lui, garde son `group-hover` : il doit
        APPARAÎTRE quand on approche de la carte, sans quoi on ne saurait pas
        qu'il est là pour aller le chercher.
      -->
      <CoverImage
        :src="mediaUrl(mix.coverUrl)"
        :srcset="mediaSrcset(mix.coverUrl)"
        :sizes="landscape ? '(min-width: 640px) 33vw, 100vw' : '(min-width: 640px) 192px, 160px'"
        img-class="transition duration-200 hover:brightness-110"
      >
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

    <p
      class="mt-2.5 font-display text-[15px] font-bold leading-snug text-tambouille-text transition-colors hover:text-tambouille-text-hover"
    >
      {{ mix.title }}
    </p>
    <p class="mt-1 truncate text-[13px] text-tambouille-muted">
      <span class="artiste hover:underline">{{ credit.primary }}</span
      ><template v-if="duration"> · {{ duration }}</template>
      <span v-if="credit.secondary" class="block text-tambouille-muted">
        importé par {{ credit.secondary }}
      </span>
    </p>
  </RouterLink>
</template>
