<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { mediaUrl } from '@/utils/media'
import CoverImage from '@/components/CoverImage.vue'
import { formatDuration } from '@/utils/time'
import { mixCredit } from '@/composables/useMixCredit'
import type { FourneeZone } from '@/composables/useFourneeTheme'
import type { Mix } from '@/types'

const props = defineProps<{
  mix: Mix
  zone: FourneeZone
  layout?: 'large' | 'tall'
  /**
   * Vrai pour les cartes visibles dès l'arrivée : leur pochette part sans
   * attendre la mise en page, et l'une d'elles est l'image qui décide du
   * Largest Contentful Paint. Faux — donc différé — pour tout ce qui est hors
   * écran, c'est-à-dire la plupart des cartes de la bande.
   */
  priority?: boolean
}>()

const playerStore = usePlayerStore()
const isPlaying = computed(() => playerStore.currentMix?.id === props.mix.id)
const credit = computed(() => mixCredit(props.mix))

/**
 * La carte jouée s'inverse : son fond prend l'encre de la bande, son texte la
 * surface. C'est ce que fait la maquette — carte blanche sur le bleu de 3e,
 * carte noire sur l'or de 3c — et cela vaut aussi bien sur un aplat de saison
 * que sur du papier.
 */
const surface = computed(() => (isPlaying.value ? props.zone.ink : 'transparent'))
const ink = computed(() => (isPlaying.value ? props.zone.surface : props.zone.ink))
const rule = computed(() => `color-mix(in srgb, ${props.zone.ink} 30%, transparent)`)
</script>

<template>
  <!-- `flex flex-col` porte la mise en page interne de la carte : c'est lui qui
       permet au bouton de se coller en bas par `mt-auto` quand la carte est
       étirée à la hauteur de la plus haute de la bande. Sans lui, les enfants
       s'empilent en blocs et une marge verticale `auto` vaut zéro. -->
  <div
    class="flex flex-col border-r border-b px-3 py-6 sm:px-5"
    :style="{ backgroundColor: surface, color: ink, borderColor: rule }"
  >
    <!-- Retiré de l'arborescence d'accessibilité et de l'ordre de tabulation :
         le titre juste en dessous mène au même endroit. Sans cela le lien
         n'annonce rien — il ne contient qu'une image décorative — et un
         lecteur d'écran énonce deux fois le même mix. -->
    <RouterLink
      :to="{ name: 'mix-detail', params: { id: mix.id } }"
      class="isolate block w-full overflow-hidden"
      :class="layout === 'large' ? 'aspect-2/3' : 'aspect-3/2'"
      :style="{ backgroundColor: zone.wash }"
      aria-hidden="true"
      tabindex="-1"
    >
      <!-- Duotone : l'aplat clair donne la teinte, la pochette n'apporte que sa
           luminance. Sans pochette il ne reste que l'aplat. -->
      <CoverImage
        :src="mediaUrl(mix.coverUrl)"
        :priority="priority"
        img-class="mix-blend-luminosity"
      />
    </RouterLink>

    <RouterLink
      :to="{ name: 'mix-detail', params: { id: mix.id } }"
      class="pt-3.5 text-[18px] leading-[1.15] text-pretty hover:underline sm:text-[22px]"
      style="font-family: 'Gulax', sans-serif"
    >
      {{ mix.title }}
    </RouterLink>

    <!-- Pas de « importé par » ici : la carte est étroite et le gabarit lui
         impose déjà trois informations. L'artiste remplace le compte. -->
    <p class="pt-4 pb-3 text-[13px] leading-[1.45] opacity-85">
      {{ credit.primary }}<br />
      <b :style="{ color: ink }">{{ formatDuration(mix.durationSec) ?? 'durée inconnue' }}</b>
      <template v-if="mix.tracklist.length"> · {{ mix.tracklist.length }} morceaux</template>
    </p>

    <!-- `mt-auto` sans garde-fou de largeur : la carte est étirée à la hauteur
         de la plus haute de la bande, donc le bouton doit se coller en bas à
         toutes les largeurs. Le `xl:` d'avant datait de la grille, où les cartes
         ne s'alignaient qu'à cinq colonnes. L'écart minimal vient du `pb-3` du
         paragraphe au-dessus. -->
    <button
      type="button"
      class="mt-auto w-full min-h-9 px-3.5 py-2.5 text-[16px] font-bold uppercase tracking-[0.09em] transition-opacity hover:opacity-80"
      :style="
        isPlaying
          ? { backgroundColor: zone.season, color: zone.inkOnSeason }
          : { border: `2px solid ${ink}`, color: ink }
      "
      @click="playerStore.play(mix)"
    >
      {{ isPlaying ? 'En lecture' : 'Lire' }}
    </button>
  </div>
</template>
