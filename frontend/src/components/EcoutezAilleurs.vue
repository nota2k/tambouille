<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { parseElsewhere, type ElsewhereList } from '@/content/elsewhere'
import source from '@/content/elsewhere.md?raw'

const playerStore = usePlayerStore()

/**
 * Le fichier est embarqué au build, comme les fournées. Un fichier fautif est
 * écarté avec son chemin plutôt que de faire tomber toutes les pages : l'encart
 * vit sous chacune d'elles, une exception ici emporterait le site entier. La CI
 * est censée l'avoir arrêté avant (`elsewhere.spec.ts`).
 */
const list = computed<ElsewhereList | null>(() => {
  try {
    return parseElsewhere(source, 'src/content/elsewhere.md')
  } catch (error) {
    console.error('Encart « Écoutez ailleurs » ignoré :', error)
    return null
  }
})

/**
 * Le lien sort du site, donc le lecteur se tait — règle 4d : on ne rejoue pas
 * le flux d'une radio dans le lecteur Tambouille, et laisser un mix tourner
 * par-dessus une radio qu'on vient d'ouvrir serait le contraire de l'intention.
 */
function leaveForElsewhere() {
  playerStore.pause()
}
</script>

<template>
  <!-- Le noir dit « ceci n'est pas le catalogue Tambouille ». Pas de rose :
       le gabarit le réserve au direct, dont cet encart n'a pas la notion. -->
  <section v-if="list" class="w-full bg-black text-white" :aria-label="list.title">
    <div class="mx-auto max-w-[1280px] min-[1600px]:max-w-[1900px] px-4 py-9 sm:px-8">
      <div
        class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-white pb-3"
      >
        <h2 class="text-[clamp(1.6rem,3vw,1.9rem)] leading-none">{{ list.title }}</h2>
        <p class="text-[11px] uppercase tracking-[0.16em] text-neutral-400">{{ list.note }}</p>
      </div>

      <!-- Pas de défilement horizontal, 4d y insiste : c'est une liste de
           rendez-vous, pas une vitrine. Les colonnes tombent donc à 2 puis 1.
           Le filet de bout de rangée sort du cadre, coupé par le conteneur plus
           étroit d'un pixel que la grille. -->
      <div class="overflow-hidden">
        <ul class="grid w-[calc(100%+1px)] grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          <li
            v-for="entry in list.entries"
            :key="entry.url"
            class="border-r border-white/25 py-5 pr-6"
          >
            <a
              :href="entry.url"
              target="_blank"
              rel="noopener noreferrer"
              class="text-[22px] leading-[1.15] hover:underline"
              style="font-family: 'Gulax', sans-serif"
              @click="leaveForElsewhere"
            >
              {{ entry.name }}
            </a>
            <p class="pt-1.5 text-[12.5px] text-neutral-400">{{ entry.note }}</p>
          </li>
        </ul>
      </div>

      <div class="flex flex-wrap items-center gap-x-4 gap-y-3 pt-7">
        <a
          v-if="list.allUrl"
          :href="list.allUrl"
          class="min-h-11 border border-white px-5 py-3 text-xs font-bold uppercase tracking-[0.09em] transition-colors hover:bg-white hover:text-black"
        >
          Toutes les radios
        </a>
        <p class="text-[13px] text-neutral-400">
          Ta radio n'y est pas&nbsp;?
          <a
            href="mailto:noreply@tambouille.pantagruweb.club?subject=Une%20radio%20pour%20l%27encart"
            class="text-tambouille-accent hover:underline"
          >
            Dis-le nous.
          </a>
        </p>
      </div>
    </div>
  </section>
</template>
