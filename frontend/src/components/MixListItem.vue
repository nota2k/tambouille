<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { mediaSrcset, mediaUrl } from '@/utils/media'
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

/**
 * Deux tags au maximum dans le flux : cinq pastilles grises identiques par mix
 * n'en laissent primer aucune. Le reste attend sur la page du mix.
 */
const visibleTags = computed(() => props.mix.tags.slice(0, 2))
</script>

<template>
  <RouterLink
    :to="mixRoute(mix)"
    class="-mx-4 flex items-center gap-4 border-b border-black/12 px-4 py-4 transition sm:gap-5"
    :class="isCurrent ? 'bg-tambouille-accent-wash' : 'hover:bg-tambouille-surface-hover'"
  >
    <div
      class="aspect-square w-[122px] shrink-0 overflow-hidden bg-tambouille-surface-hover sm:w-[188px]"
    >
      <!-- `hover:` et non `group-hover:`, comme sur les cartes : chaque partie
           de la ligne répond à son propre survol. -->
      <CoverImage
        :src="mediaUrl(mix.coverUrl)"
        :srcset="mediaSrcset(mix.coverUrl)"
        sizes="(min-width: 640px) 188px, 122px"
        img-class="transition duration-200 hover:brightness-110"
      >
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
      <!--
        Le titre s'éclaircit, comme sur les cartes.
        ─────────────────────────────────────────────────────────────────────
        Il se superpose au gris de la ligne, et les deux ne disent pas la même
        chose : le fond annonce que la ligne entière est cliquable, le titre
        que le curseur est précisément dessus. Ils ne se marchent dessus que si
        le titre répond au survol du GROUPE — c'était le cas, et on ne voyait
        alors plus que le rectangle. D'où le `hover:` et non `group-hover:`.

        `inline-block` parce qu'un `h3` occupe toute la largeur : sans lui, la
        zone de survol serait une bande allant jusqu'au bord droit, bien
        au-delà du texte.
      -->
      <h3
        class="inline-block font-display text-[24px] font-bold leading-tight text-tambouille-text transition-colors hover:text-tambouille-text-hover sm:text-2xl"
      >
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

    <!-- Pas de bouton « Lire » au bout de la ligne : le `WaveformPlayer`
         juste au-dessus en porte déjà un, et il fait la même chose. Deux
         commandes pour la même action sur une même ligne de liste, c'est
         surtout deux fois plus de choses à lire avant de cliquer. La teinte du
         fond continue de dire quel mix est en cours. -->
  </RouterLink>
</template>
