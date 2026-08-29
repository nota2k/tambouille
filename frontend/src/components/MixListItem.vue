<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { mediaUrl } from '@/utils/media'
import { mixRoute } from '@/utils/routes'
import CoverImage from '@/components/CoverImage.vue'
import { formatDuration } from '@/utils/time'
import { mixCredit } from '@/composables/useMixCredit'
import WaveformPlayer from '@/components/WaveformPlayer.vue'
import type { Mix } from '@/types'

const props = defineProps<{ mix: Mix }>()
const playerStore = usePlayerStore()

const duration = computed(() => formatDuration(props.mix.durationSec))
const credit = computed(() => mixCredit(props.mix))
const isCurrent = computed(() => playerStore.currentMix?.id === props.mix.id)
const isPlaying = computed(() => isCurrent.value && playerStore.isPlaying)

/**
 * Deux tags au maximum dans le flux : cinq pastilles grises identiques par mix
 * n'en laissent primer aucune. Le reste attend sur la page du mix.
 */
const visibleTags = computed(() => props.mix.tags.slice(0, 2))

function onToggle(event: Event) {
  event.preventDefault()
  event.stopPropagation()
  if (isCurrent.value) playerStore.toggle()
  else playerStore.play(props.mix)
}
</script>

<template>
  <RouterLink
    :to="mixRoute(mix)"
    class="group -mx-4 flex items-center gap-4 border-b border-black/12 px-4 py-4 transition sm:gap-5"
    :class="isCurrent ? 'bg-tambouille-accent-wash' : 'hover:bg-tambouille-surface-hover'"
  >
    <div
      class="aspect-square w-[122px] shrink-0 overflow-hidden bg-tambouille-surface-hover sm:w-[188px]"
    >
      <CoverImage :src="mediaUrl(mix.coverUrl)">
        <template #vide>
          <div class="flex h-full w-full items-center justify-center text-tambouille-faint">
            <svg viewBox="0 0 24 24" class="h-7 w-7 fill-current">
              <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
            </svg>
          </div>
        </template>
      </CoverImage>
    </div>

    <div class="min-w-0 flex-1">
      <h3 class="font-display text-[24px] font-bold leading-tight text-tambouille-text sm:text-2xl">
        {{ mix.title }}
      </h3>

      <!-- Auteur, durée, nombre de morceaux : la ligne que la maquette réclamait. -->
      <p class="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 text-sm text-tambouille-muted">
        <span class="artiste">
          {{ credit.primary }}
          <span v-if="credit.secondary" class="text-tambouille-muted">
            — importé par {{ credit.secondary }}
          </span>
        </span>
        <template v-if="duration">
          <span aria-hidden="true">·</span>
          <b class="font-bold text-tambouille-text">{{ duration }}</b>
        </template>
        <template v-if="mix.tracklist.length">
          <span aria-hidden="true">·</span>
          <span>{{ mix.tracklist.length }} morceaux</span>
        </template>
        <template v-if="visibleTags.length">
          <span aria-hidden="true">·</span>
          <span v-for="tag in visibleTags" :key="tag" class="tb-tag">{{ tag }}</span>
        </template>
      </p>

      <WaveformPlayer :mix="mix" class="mt-2" />
    </div>

    <button
      type="button"
      class="tb-btn-sm shrink-0"
      :class="isCurrent ? 'tb-btn' : 'tb-btn-outline'"
      @click="onToggle"
    >
      {{ isPlaying ? 'En lecture' : isCurrent ? 'Reprendre' : 'Lire' }}
    </button>
  </RouterLink>
</template>
