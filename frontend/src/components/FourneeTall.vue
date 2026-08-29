<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { formatDuration } from '@/utils/time'
import { useFourneeTheme, type FourneeZone } from '@/composables/useFourneeTheme'
import FourneeMixCard from './FourneeMixCard.vue'
import FourneeMixSkeleton from './FourneeMixSkeleton.vue'
import { NOMBRE_DE_MIX } from '@/content/fournees'
import type { Fournee } from '@/types'
import { Swiper, SwiperSlide } from 'swiper/vue'
import 'swiper/swiper.css'

const props = defineProps<{ fournee: Fournee }>()
const playerStore = usePlayerStore()

/**
 * Combien de pochettes partent sans attendre la mise en page.
 *
 * Trois : c'est ce que la bande montre à la largeur d'un ordinateur portable
 * (`800: { slidesPerView: 3 }`), et le mobile n'en voit qu'une et demie. Les
 * suivantes restent différées — elles sont hors écran, et cinq images en
 * priorité haute ne feraient que se disputer la bande passante de celle qui
 * décide du LCP.
 */
const CARTES_PRIORITAIRES = 3
const { season, inkOnSeason, paper, inkOnPaper, seasonOnPaper, wash } = useFourneeTheme(
  () => props.fournee,
)

/**
 * `tall` peint tout à la couleur de saison — sauf quand la fournée s'inverse,
 * où le noir prend le fond et la couleur redevient un accent (3c).
 */
const inverted = computed(() => props.fournee.inverted === true)
const surface = computed(() => (inverted.value ? paper.value : season.value))
const ink = computed(() => (inverted.value ? inkOnPaper.value : inkOnSeason.value))
/** Ce qui remplit pastille et bouton d'action, et le texte posé dessus. */
const accent = computed(() => (inverted.value ? season.value : inkOnSeason.value))
const onAccent = computed(() => (inverted.value ? inkOnSeason.value : season.value))

const zone = computed<FourneeZone>(() => ({
  surface: surface.value,
  ink: ink.value,
  season: season.value,
  inkOnSeason: inkOnSeason.value,
  wash: wash.value,
}))

/**
 * La durée cumulée, l'argument de vente du bouton d'après le gabarit. Les mix
 * dont la durée est inconnue — elle n'est pas calculée à l'upload — sont
 * simplement ignorés plutôt que comptés zéro.
 */
const totalDuration = computed(() =>
  formatDuration(props.fournee.mixes.reduce((sum, mix) => sum + (mix.durationSec ?? 0), 0)),
)

/**
 * « Tout enfourner » ne lance que le premier mix : le store de lecture n'a pas
 * de file d'attente (`play(mix)` remplace la piste courante), donc enchaîner la
 * fournée demanderait de lui en ajouter une.
 */
function playAll() {
  const first = props.fournee.mixes[0]
  if (first) playerStore.play(first)
}

/**
 * Les cartes fantômes, tant que les mix ne sont pas revenus de l'API.
 *
 * Le bandeau se monte sans eux — c'est voulu, `useFournee` l'explique — mais la
 * bande restait alors vide : une barre de quelques pixels là où cinq cartes de
 * 380 px allaient s'installer. La section grandissait d'un coup vers 900 ms et
 * poussait tout le bas de page, l'encart « Écoutez ailleurs » en tête. Ce seul
 * saut valait 0,77 de décalage cumulé, sur un seuil de 0,1.
 *
 * Le nombre vient du parseur, qui l'exige déjà du fichier : réserver autre
 * chose que ce qui va arriver ne déplacerait le saut que de quelques cartes.
 */
const cartesFantomes = computed(() => (props.fournee.mixes.length ? 0 : NOMBRE_DE_MIX.tall.attendu))
</script>

<template>
  <section
    class="w-full min-h-[80vh] flex flex-col justify-center align-stretch mb-15"
    :style="{ backgroundColor: surface, color: ink }"
    :aria-label="`La fournée n°${fournee.number} — ${fournee.title}`"
  >
    <!-- `w-full` n'est pas décoratif : la section étant `flex flex-col`, ce
         conteneur est un item flex, donc dimensionné par son contenu et non par
         son parent. Or `.swiper-wrapper` a une largeur intrinsèque égale à la
         somme de ses slides, qui gonflerait le conteneur jusqu'à `max-w` et
         pousserait la colonne de droite hors de l'écran. Une largeur définie
         coupe cette remontée. -->
    <div class="mx-auto flex w-full max-w-[1280px] min-[1600px]:max-w-[1900px] flex-col gap-10 px-4 py-10 sm:px-8 lg:pt-11">
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
            <span class="text-[11px] uppercase leading-none tracking-[0.16em] opacity-85">
              {{ fournee.period }}
            </span>
          </div>

          <h2
            class="max-w-[900px] pt-6 text-[clamp(2.75rem,7.5vw,8rem)] leading-[0.86] text-pretty"
            :style="inverted ? { color: seasonOnPaper } : undefined"
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
            <span class="text-[13px] opacity-85">choisi par {{ fournee.curator }}</span>
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
        <!-- `ul`/`li` plutôt que les `div` par défaut de Swiper : la bande est
             une liste de mix, et un `li` sans parent de liste n'est pas énoncé
             comme tel. -->
        <Swiper
          wrapper-tag="ul"
          class="fournee-swiper fournee-swiper--tall w-full"
          :slides-per-view="1"
          :space-between="0"
          :breakpoints="{
            450: { slidesPerView: 1.5 },
            800: { slidesPerView: 3 },
            1280: { slidesPerView: 5 },
          }"
        >
          <SwiperSlide v-for="(mix, index) in fournee.mixes" :key="mix.id" tag="li">
            <!-- Les premières pochettes ne sont pas différées : la bande est en
                 haut de page et l'une d'elles est l'image qui décide du Largest
                 Contentful Paint. `lazy` lui faisait attendre la mise en page,
                 après le paquet JavaScript et cinq appels à l'API. -->
            <FourneeMixCard
              :mix="mix"
              :zone="zone"
              :priority="index < CARTES_PRIORITAIRES"
              class="h-full"
            />
          </SwiperSlide>
          <SwiperSlide v-for="n in cartesFantomes" :key="`fantome-${n}`" tag="li">
            <FourneeMixSkeleton :zone="zone" class="h-full" />
          </SwiperSlide>
        </Swiper>
      </div>
    </div>
  </section>
</template>
