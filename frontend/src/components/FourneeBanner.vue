<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { mediaUrl } from '@/utils/media'
import { formatDuration } from '@/utils/time'
import type { Fournee, Mix } from '@/types'

const props = defineProps<{ fournee: Fournee }>()

const playerStore = usePlayerStore()

/**
 * Luminance relative WCAG. Sert à choisir la couleur du texte posé sur l'aplat
 * de saison : la maquette fixe un plancher de 4,5:1, et la couleur étant une
 * donnée éditoriale, elle ne peut pas être vérifiée à la main.
 */
function luminance(hex: string): number {
  const raw = hex.replace('#', '')
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw
  const channels = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
  const linear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const [r = 0, g = 0, b = 0] = channels.map(linear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const seasonLuminance = computed(() => luminance(props.fournee.color))
const contrastWithWhite = computed(() => 1.05 / (seasonLuminance.value + 0.05))
const contrastWithBlack = computed(() => (seasonLuminance.value + 0.05) / 0.05)

/**
 * L'encre posée sur l'aplat de saison : celle des deux qui contraste le mieux.
 *
 * Le seuil de 4,5:1 du gabarit est ici toujours tenu, et ne peut pas ne pas
 * l'être : la couleur qui contrasterait le moins bien avec les deux encres à la
 * fois n'existe pas — au pire des cas, à luminance 0,179, la meilleure des deux
 * vaut encore 4,58:1. Il n'y a donc pas de repli à prévoir.
 */
const inkOnSeason = computed(() =>
  contrastWithWhite.value >= contrastWithBlack.value ? '#ffffff' : '#000000',
)

/**
 * L'inversion en fond noir de 3c est un choix éditorial — « Noël, accent or » —
 * et non un repli de contraste, puisqu'aucune couleur ne peut en déclencher un.
 * Elle se demande donc explicitement, fournée par fournée.
 */
const inverted = computed(() => props.fournee.inverted === true)

const surface = computed(() => (inverted.value ? '#000000' : props.fournee.color))
const ink = computed(() => (inverted.value ? '#ffffff' : inkOnSeason.value))
/** L'inverse de l'encre : fond de la carte « en lecture ». */
const counterInk = computed(() => (ink.value === '#ffffff' ? '#000000' : '#ffffff'))
/** Ce qui porte badge et boutons : la couleur elle-même sur noir, l'encre sinon. */
const accent = computed(() => (inverted.value ? props.fournee.color : ink.value))
/** Et le texte posé dessus : sur la couleur, la même encre que partout ailleurs. */
const onAccent = computed(() => (inverted.value ? inkOnSeason.value : surface.value))

/** Le ton clair qui teinte les pochettes en duotone. */
const wash = computed(() => `color-mix(in srgb, ${props.fournee.color} 55%, #ffffff)`)

/**
 * La durée cumulée, l'argument de vente du bouton d'après le gabarit. Les mix
 * dont la durée est inconnue — elle n'est pas calculée à l'upload — sont
 * simplement ignorés plutôt que comptés zéro.
 */
const totalDuration = computed(() =>
  formatDuration(props.fournee.mixes.reduce((sum, mix) => sum + (mix.durationSec ?? 0), 0)),
)

function isPlaying(mix: Mix): boolean {
  return playerStore.currentMix?.id === mix.id
}

/**
 * « Tout enfourner » ne lance que le premier mix : le store de lecture n'a pas
 * de file d'attente (`play(mix)` remplace la piste courante), donc enchaîner la
 * fournée demanderait de lui en ajouter une.
 */
function playAll() {
  const first = props.fournee.mixes[0]
  if (first) playerStore.play(first)
}
</script>

<template>
  <section
    class="w-full"
    :style="{
      backgroundColor: surface,
      color: ink,
      '--fournee': fournee.color,
      '--fournee-wash': wash,
    }"
    :aria-label="`La fournée n°${fournee.number} — ${fournee.title}`"
  >
    <div class="mx-auto flex max-w-[1900px] flex-col gap-10 px-4 pt-10 sm:px-8 lg:pt-11">
      <!-- Le propos : titre géant à gauche, texte et action à droite. En dessous
           de lg les deux colonnes s'empilent, le titre garde la première place. -->
      <div class="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-3">
            <span
              class="px-2.5 py-1.5 text-[11px] uppercase leading-none tracking-[0.16em]"
              :style="{ backgroundColor: accent, color: onAccent }"
            >
              La fournée n°{{ fournee.number }}
            </span>
            <span class="text-[11px] uppercase leading-none tracking-[0.16em] opacity-70">
              {{ fournee.period }}
            </span>
          </div>

          <h2
            class="max-w-[900px] pt-6 text-[clamp(2.75rem,7.5vw,8rem)] leading-[0.86] text-pretty"
            :style="inverted ? { color: accent } : undefined"
          >
            {{ fournee.title }}
          </h2>
        </div>

        <div class="w-full shrink-0 lg:w-[400px] lg:pt-13">
          <p class="text-[17px] leading-[1.65] opacity-90">{{ fournee.intro }}</p>
          <div class="flex flex-wrap items-center gap-4 pt-5">
            <button
              type="button"
              class="min-h-11 px-6.5 py-3.5 text-xs font-bold uppercase tracking-[0.09em] transition-opacity hover:opacity-80"
              :style="{ backgroundColor: accent, color: onAccent }"
              @click="playAll"
            >
              Tout enfourner<template v-if="totalDuration"> — {{ totalDuration }}</template>
            </button>
            <span class="text-[13px] opacity-70">choisi par {{ fournee.curator }}</span>
          </div>
        </div>
      </div>

      <!-- La bande de mix, collée en bas de l'aplat. Le filet la sépare du propos
           comme dans le gabarit ; les colonnes tombent à 2 puis 1 en descendant. -->
      <!-- Le filet vertical de la dernière colonne tombe hors du cadre : chaque
           carte porte le sien à droite, et le conteneur, plus étroit d'un pixel
           que la grille, coupe celui de la colonne de bout de rangée. -->
      <div
        class="overflow-hidden border-t"
        :style="{ borderColor: `color-mix(in srgb, ${ink} 30%, transparent)` }"
      >
        <ul class="grid w-[calc(100%+1px)] grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <li
            v-for="mix in fournee.mixes"
            :key="mix.id"
            class="flex flex-col border-r border-b px-3 py-6 sm:px-5"
            :style="
              isPlaying(mix)
                ? {
                    backgroundColor: counterInk,
                    color: surface,
                    borderColor: `color-mix(in srgb, ${ink} 30%, transparent)`,
                  }
                : { borderColor: `color-mix(in srgb, ${ink} 30%, transparent)` }
            "
          >
            <RouterLink
              :to="{ name: 'mix-detail', params: { id: mix.id } }"
              class="isolate block aspect-3/2 w-full overflow-hidden"
              :style="{ backgroundColor: 'var(--fournee-wash)' }"
            >
              <!-- Duotone : l'aplat clair donne la teinte, la pochette n'apporte
                 que sa luminance. Sans pochette il ne reste que l'aplat. -->
              <img
                v-if="mix.coverUrl"
                :src="mediaUrl(mix.coverUrl)"
                class="h-full w-full object-cover mix-blend-luminosity"
                alt=""
              />
            </RouterLink>

            <RouterLink
              :to="{ name: 'mix-detail', params: { id: mix.id } }"
              class="pt-3.5 text-[18px] leading-[1.15] text-pretty hover:underline sm:text-[22px]"
              style="font-family: 'Gulax', sans-serif"
            >
              {{ mix.title }}
            </RouterLink>

            <p class="pt-1.5 text-[13px] leading-[1.45] opacity-75">
              {{ mix.user.displayName }}<br />
              <b class="opacity-100" :style="{ color: isPlaying(mix) ? surface : ink }">{{
                formatDuration(mix.durationSec) ?? 'durée inconnue'
              }}</b>
              <template v-if="mix.tracklist.length">
                · {{ mix.tracklist.length }} morceaux</template
              >
            </p>

            <button
              type="button"
              class="mt-4.5 min-h-9 px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[0.09em] transition-opacity hover:opacity-80 xl:mt-auto"
              :style="
                isPlaying(mix)
                  ? { backgroundColor: accent, color: onAccent }
                  : { border: `1px solid ${ink}`, color: ink }
              "
              @click="playerStore.play(mix)"
            >
              {{ isPlaying(mix) ? 'En lecture' : 'Lire' }}
            </button>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
