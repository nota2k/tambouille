<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { formatDuration } from '@/utils/time'
import { useFourneeTheme, type FourneeZone } from '@/composables/useFourneeTheme'
import FourneeMixCard from './FourneeMixCard.vue'
import type { Fournee } from '@/types'
import { Swiper, SwiperSlide } from 'swiper/vue'
import 'swiper/swiper.css'

const props = defineProps<{ fournee: Fournee }>()

const playerStore = usePlayerStore()
const { season, inkOnSeason, paper, inkOnPaper, seasonOnPaper, wash } = useFourneeTheme(
  () => props.fournee,
)

/**
 * `large` ne peint pas comme `tall` : la moitié gauche reste du papier — blanc,
 * ou noir quand la fournée s'inverse comme 3c — et seule la moitié droite porte
 * l'aplat de saison. La couleur y remplit pastille, titre et bouton.
 */
const zone = computed<FourneeZone>(() => ({
  surface: season.value,
  ink: inkOnSeason.value,
  season: season.value,
  inkOnSeason: inkOnSeason.value,
  wash: wash.value,
}))

const totalDuration = computed(() =>
  formatDuration(props.fournee.mixes.reduce((sum, mix) => sum + (mix.durationSec ?? 0), 0)),
)

/**
 * Ne lance que le premier mix : le store de lecture n'a pas de file d'attente,
 * `play(mix)` remplace la piste courante.
 */
function playAll() {
  const first = props.fournee.mixes[0]
  if (first) playerStore.play(first)
}
</script>

<template>
  <section
    class="w-full my-15"
    :style="{ backgroundColor: paper, color: inkOnPaper }"
    :aria-label="`La fournée n°${fournee.number} — ${fournee.title}`"
  >
    <div class="mx-auto grid max-w-[1900px] grid-cols-1 lg:grid-cols-[1fr_1.5fr]">
      <!-- Le propos. L'action est collée en bas par `mt-auto`, comme au gabarit. -->
      <div class="flex flex-col px-4 py-10 sm:px-8">
        <div class="flex flex-wrap items-center gap-3">
          <span
            class="px-2.5 py-1.5 text-[11px] uppercase leading-none tracking-[0.16em]"
            :style="{ backgroundColor: season, color: inkOnSeason }"
          >
            La fournée n°{{ fournee.number }}
          </span>
          <span class="text-[11px] uppercase leading-none tracking-[0.16em] opacity-60">
            {{ fournee.period }}
          </span>
        </div>

        <h2
          class="pt-6 text-[clamp(2.5rem,6.5vw,7.5rem)] leading-[0.9] text-pretty"
          :style="{ color: seasonOnPaper }"
        >
          {{ fournee.title }}
        </h2>

        <p class="max-w-[460px] pt-4.5 text-md leading-[1.6]">{{ fournee.intro }}</p>

        <div class="mt-auto flex flex-wrap items-center gap-4.5 pt-8">
          <button
            type="button"
            class="min-h-11 px-6.5 py-3.5 text-lg font-bold uppercase tracking-[0.09em] transition-opacity hover:opacity-80"
            :style="{ backgroundColor: season, color: inkOnSeason }"
            @click="playAll"
          >
            Tout enfourner<template v-if="totalDuration"> — {{ totalDuration }}</template>
          </button>
          <span class="text-[13px] opacity-60"
            >{{ fournee.mixes.length }} mix · choisis par {{ fournee.curator }}</span
          >
        </div>
      </div>

      <!-- La moitié droite : le seul endroit de `large` qui porte la couleur.
           Le conteneur, plus étroit d'un pixel que la grille, coupe le filet de
           la carte de bout de rangée. -->
      <div class="overflow-hidden" :style="{ backgroundColor: season, color: inkOnSeason }">
        <!-- `ul`/`li` plutôt que les `div` par défaut de Swiper : la bande est
             une liste de mix, et un `li` sans parent de liste n'est pas énoncé
             comme tel. -->
        <Swiper
          wrapper-tag="ul"
          class="fournee-swiper h-full w-full"
          :slides-per-view="1"
          :space-between="0"
          :breakpoints="{
            450: { slidesPerView: 2 },
            800: { slidesPerView: 3 },
            1024: { slidesPerView: 4 },
          }"
        >
          <SwiperSlide v-for="mix in fournee.mixes" :key="mix.id" tag="li">
            <FourneeMixCard :mix="mix" :zone="zone" layout="large" class="h-full" />
          </SwiperSlide>
        </Swiper>
      </div>
    </div>
  </section>
</template>
