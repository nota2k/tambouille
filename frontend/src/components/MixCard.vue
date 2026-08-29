<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { mediaSrcset, mediaUrl } from '@/utils/media'
import CoverImage from '@/components/CoverImage.vue'
import { formatDuration } from '@/utils/time'
import { mixCredit } from '@/composables/useMixCredit'
import ShareButton from '@/components/ShareButton.vue'
import AddToPlaylistButton from '@/components/AddToPlaylistButton.vue'
import FavoriteButton from '@/components/FavoriteButton.vue'
import { mixShareUrl } from '@/utils/share'
import { mixRoute } from '@/utils/routes'
import type { Mix } from '@/types'

const props = withDefaults(
  defineProps<{
    mix: Mix
    landscape?: boolean
    /**
     * Les trois commandes du coin — favori, playlist, partage.
     *
     * Se coupent pour les vignettes d'une bande où l'on ne fait que reprendre
     * une écoute : trois boutons sur une carte large de quelques centimètres
     * pèsent plus que ce qu'ils apportent là. Le bouton de lecture reste, lui :
     * c'est la raison d'être de la bande.
     */
    actions?: boolean
  }>(),
  { landscape: false, actions: true },
)
const playerStore = usePlayerStore()

const duration = computed(() => formatDuration(props.mix.durationSec))
const credit = computed(() => mixCredit(props.mix))

/** Le profil du compte qui a déposé le mix — jamais celui de l'artiste, qui est un champ libre. */
const profileRoute = computed(() => ({
  name: 'profile',
  params: { username: props.mix.user.username },
}))

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
  <!--
    ─────────────────────────────────────────────────────────────────────────
    UNE `div`, ET NON PLUS UN LIEN QUI ENVELOPPE TOUT
    ─────────────────────────────────────────────────────────────────────────

    La carte entière était un `RouterLink`. Rendre le nom du compte cliquable
    aurait mis un lien DANS un lien : le HTML l'interdit, et le navigateur
    répare en sortant le second du premier — le balisage rendu n'est plus celui
    qu'on a écrit, et le clic ne va nulle part de fiable.

    Le lien du titre porte donc un `::after` qui couvre la carte : on clique
    n'importe où, on va au mix, comme avant. Tout ce qui doit rester atteignable
    par-dessus ce voile — les trois boutons, le lien du profil — est posé en
    `relative z-10`. C'est ce qui permet à deux destinations de coexister sur
    une même carte sans imbriquer quoi que ce soit.
  -->
  <div :class="['group relative block shrink-0', landscape ? 'w-full' : 'w-40 sm:w-48']">
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
        class="absolute bottom-0 right-0 z-10 flex h-11 w-11 items-center justify-center bg-tambouille-accent text-tambouille-ink-on-accent opacity-0 transition group-hover:opacity-100 hover:bg-tambouille-accent-hover"
        aria-label="Lire ce mix"
        @click="play"
      >
        <svg viewBox="0 0 24 24" class="ml-0.5 h-5 w-5 fill-current">
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>
    </div>

    <!--
      Les trois mêmes commandes que sur la page d'un mix — favori, playlist,
      partage — groupées en une colonne que la carte place une fois pour toutes.

      HORS de la boîte de la pochette, et c'est nécessaire : celle-ci est en
      `overflow-hidden` pour recadrer l'image, et le menu des playlists, plus
      large que la carte, y serait tranché. Le repère de positionnement est donc
      le lien de la carte, qui est `relative`.

      L'opacité est portée ici et non par chaque bouton : ils apparaissent et
      disparaissent ensemble. `focus-within` les fait aussi venir au clavier,
      sans quoi on les atteindrait en tabulant sans jamais les voir.
    -->
    <div
      v-if="actions"
      class="absolute right-2 top-2 z-10 flex flex-col items-end gap-2 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100"
    >
      <FavoriteButton :mix="mix" variant="overlay" />
      <AddToPlaylistButton :mix-id="mix.id" variant="overlay" />
      <!-- Pas d'`embed-url` ici : la fenêtre à onglets est réservée aux pages
           de détail, une carte se contente de copier le lien d'un clic. -->
      <ShareButton :url="mixShareUrl(mix)" variant="overlay" />
    </div>

    <!-- `after:absolute after:inset-0` : c'est CE lien qui rend toute la carte
         cliquable. `after:content-['']` est indispensable — sans contenu, même
         vide, le pseudo-élément n'est pas généré. -->
    <RouterLink
      :to="mixRoute(mix)"
      class="mt-2.5 block font-display text-[15px] font-bold leading-snug text-tambouille-text transition-colors after:absolute after:inset-0 after:content-[''] hover:text-tambouille-text-hover"
    >
      {{ mix.title }}
    </RouterLink>
    <p class="mt-1 truncate text-[13px] text-tambouille-muted">
      <!-- Sans artiste distinct, `primary` EST le compte : c'est alors lui qui
           mène au profil. Avec un artiste, `primary` est un champ libre qui ne
           désigne aucun compte, et c'est `secondary` qui est cliquable. -->
      <RouterLink
        v-if="!credit.secondary"
        :to="profileRoute"
        class="artiste relative z-10 font-bold hover:underline"
        >{{ credit.primary }}</RouterLink
      ><span v-else class="artiste font-bold">{{ credit.primary }}</span
      ><template v-if="duration"> · {{ duration }}</template>
      <span v-if="credit.secondary" class="block text-tambouille-muted">
        importé par
        <RouterLink :to="profileRoute" class="relative z-10 font-bold hover:underline">{{
          credit.secondary
        }}</RouterLink>
      </span>
      <!-- Sur sa propre ligne et non à la suite de la durée : la ligne est en
           `truncate` et la carte fait 160 px, où « artiste · 1 h » tient déjà
           tout juste. À la suite, le compteur serait coupé sur la moitié des
           cartes. Aucune condition, comme aux trois autres endroits : les
           écoutes se comptent aussi dans les widgets, et le zéro se dit. -->
      <span class="block text-tambouille-muted">
        {{ mix.playsCount }} {{ mix.playsCount > 1 ? 'écoutes' : 'écoute' }}
      </span>
    </p>
  </div>
</template>
