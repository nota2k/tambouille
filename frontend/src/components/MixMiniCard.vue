<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { mediaSrcset, mediaUrl } from '@/utils/media'
import CoverImage from '@/components/CoverImage.vue'
import { formatDuration } from '@/utils/time'
import { mixRoute } from '@/utils/routes'
import type { Mix } from '@/types'

const props = defineProps<{ mix: Mix }>()
const playerStore = usePlayerStore()

const duration = computed(() => formatDuration(props.mix.durationSec))
const isCurrent = computed(() => playerStore.currentMix?.id === props.mix.id)

function play(event: Event) {
  event.preventDefault()
  event.stopPropagation()
  playerStore.play(props.mix)
}
</script>

<template>
  <!--
    La version étroite de `MixCard`, pour une colonne et non une grille : une
    ligne, une petite pochette, le titre et la durée.

    Ce qui a été retiré l'a été parce que la colonne est étroite, et parce que
    le contexte dit déjà le reste. Le nom de l'artiste, d'abord : la section qui
    porte ces cartes s'intitule « Aussi de … » et le nomme au-dessus, une fois,
    plutôt que sur chaque ligne. Les trois commandes ensuite — favori, playlist,
    partage : elles tiennent sur une pochette de 200 px, pas sur une de 64.

    Même montage de liens que sur les cartes : une `div`, et le lien du titre
    porte un `::after` qui couvre la ligne. Le bouton de lecture reste
    atteignable par-dessus grâce à `z-10`, sans imbriquer un bouton dans un lien.
  -->
  <div
    class="group relative flex items-center gap-3 py-2.5 transition"
    :class="isCurrent ? 'bg-tambouille-accent-wash' : 'hover:bg-tambouille-surface-hover'"
  >
    <div class="relative h-16 w-16 shrink-0 overflow-hidden bg-tambouille-surface-hover">
      <CoverImage :src="mediaUrl(mix.coverUrl)" :srcset="mediaSrcset(mix.coverUrl)" sizes="64px">
        <template #vide>
          <div class="flex h-full w-full items-center justify-center text-tambouille-faint">
            <svg viewBox="0 0 24 24" class="h-6 w-6 fill-current">
              <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
            </svg>
          </div>
        </template>
      </CoverImage>

      <!-- Le bouton couvre la pochette entière plutôt que de s'y poser dans un
           coin : à cette taille, une pastille de 44 px n'en laisserait presque
           rien voir, et une plus petite ne se viserait plus. -->
      <button
        class="absolute inset-0 z-10 flex items-center justify-center bg-tambouille-accent/85 text-tambouille-ink-on-accent opacity-0 transition focus-visible:opacity-100 group-hover:opacity-100"
        aria-label="Lire ce mix"
        @click="play"
      >
        <svg viewBox="0 0 24 24" class="ml-0.5 h-6 w-6 fill-current">
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>
    </div>

    <div class="min-w-0 flex-1">
      <RouterLink
        :to="mixRoute(mix)"
        class="block font-display text-[15px] font-bold leading-snug text-tambouille-text transition-colors after:absolute after:inset-0 after:content-[''] hover:text-tambouille-text-hover"
      >
        {{ mix.title }}
      </RouterLink>
      <p v-if="duration" class="mt-1 text-[13px] text-tambouille-muted">{{ duration }}</p>
    </div>
  </div>
</template>
