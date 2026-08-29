<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { mediaSrcset, mediaUrl } from '@/utils/media'
import { mixRoute } from '@/utils/routes'
import CoverImage from '@/components/CoverImage.vue'
import { formatDuration } from '@/utils/time'
import { mixCredit } from '@/composables/useMixCredit'
import WaveformPlayer from '@/components/WaveformPlayer.vue'
import FavoriteButton from '@/components/FavoriteButton.vue'
import AddToPlaylistButton from '@/components/AddToPlaylistButton.vue'
import ShareButton from '@/components/ShareButton.vue'
import { mixEmbedUrl, mixShareUrl } from '@/utils/share'
import { HAUTEUR_EMBED_MIX } from '@/utils/embed'
import type { Mix } from '@/types'

const props = defineProps<{ mix: Mix }>()
const playerStore = usePlayerStore()

const duration = computed(() => formatDuration(props.mix.durationSec))
const credit = computed(() => mixCredit(props.mix))
const isCurrent = computed(() => playerStore.currentMix?.id === props.mix.id)

/** Le profil du compte qui a déposé le mix — jamais celui de l'artiste, qui est un champ libre. */
const profileRoute = computed(() => ({
  name: 'profile',
  params: { username: props.mix.user.username },
}))

/**
 * Deux tags au maximum dans le flux : cinq pastilles grises identiques par mix
 * n'en laissent primer aucune. Le reste attend sur la page du mix.
 */
const visibleTags = computed(() => props.mix.tags.slice(0, 2))
</script>

<template>
  <!--
    Une `div`, et non plus un lien qui enveloppe toute la ligne.

    Rendre le nom du compte cliquable aurait mis un lien DANS un lien : le HTML
    l'interdit, et le navigateur répare en sortant le second du premier — le
    balisage rendu n'est plus celui qu'on a écrit. Le lien du titre porte donc
    un `::after` qui couvre la ligne, et ce qui doit rester atteignable
    par-dessus est posé en `relative z-10`. Même montage que sur les cartes.
  -->
  <div
    class="relative -mx-4 flex items-center gap-4 border-b border-black/12 px-4 py-4 transition sm:gap-5"
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
      <h3>
        <!-- `after:absolute after:inset-0` : c'est CE lien qui rend toute la
             ligne cliquable. `after:content-['']` est indispensable — sans
             contenu, même vide, le pseudo-élément n'est pas généré. -->
        <RouterLink
          :to="mixRoute(mix)"
          class="inline-block font-display text-[24px] font-bold leading-tight text-tambouille-text transition-colors after:absolute after:inset-0 after:content-[''] hover:text-tambouille-text-hover sm:text-2xl"
        >
          {{ mix.title }}
        </RouterLink>
      </h3>

      <!-- Auteur, durée, nombre de morceaux : la ligne que la maquette réclamait. -->
      <p class="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 text-sm text-tambouille-muted">
        <span class="artiste">
          <!-- Sans artiste distinct, `primary` EST le compte : c'est alors lui
               qui mène au profil. Avec un artiste, `primary` est un champ libre
               qui ne désigne aucun compte. -->
          <RouterLink
            v-if="!credit.secondary"
            :to="profileRoute"
            class="relative z-10 font-bold hover:underline"
          >
            {{ credit.primary }}
          </RouterLink>
          <span v-else class="font-bold">{{ credit.primary }}</span>
          <span v-if="credit.secondary" class="text-tambouille-muted">
            — importé par
            <RouterLink :to="profileRoute" class="relative z-10 font-bold hover:underline">
              {{ credit.secondary }}
            </RouterLink>
          </span>
        </span>
        <template v-if="duration">
          <span aria-hidden="true">·</span>
          <b class="font-bold text-tambouille-text">{{ duration }}</b>
        </template>
        <!-- Aucune condition : ni sur `audioUrl` — les écoutes se comptent
             aussi dans les widgets, et la plupart des mix importés n'ont pas
             d'`audioUrl` —, ni sur le zéro, qu'on affiche tel quel. Un mix que
             personne n'a écouté le dit. -->
        <span aria-hidden="true">·</span>
        <span>{{ mix.playsCount }} {{ mix.playsCount > 1 ? 'écoutes' : 'écoute' }}</span>
      </p>

      <WaveformPlayer :mix="mix" class="relative z-10 mt-2" />
      <!--
        Les trois mêmes commandes que sur la page d'un mix et sur les cartes,
        sous la forme d'onde et alignées à droite.

        Elles ont été un temps SUR la ligne de l'onde, à sa droite. Elles lui
        prenaient 134 pixels : sur une fenêtre de 1024, où la colonne latérale
        rétrécit déjà la liste, l'onde tombait de 406 à 272 pixels de large.
        Sous elle, l'onde retrouve toute la largeur et les boutons gardent leur
        bord droit.

        Variante `pill` et non `overlay` : l'overlay est un bouton sombre fait
        pour se poser SUR une pochette. Sur le fond clair d'une ligne, il ferait
        trois pastilles noires au milieu du texte.
      -->
      <div class="relative z-10 mt-2 flex items-end justify-between gap-2">
        <!-- Les tags partagent la ligne des commandes au lieu d'occuper la
             leur : deux pastilles ne valaient pas une ligne de plus sur chaque
             item d'une liste qui en compte vingt. `flex-wrap` et non `wrap` —
             ce dernier n'est pas une classe Tailwind, et les tags ne
             revenaient donc jamais à la ligne. -->
        <div class="flex min-w-0 flex-wrap gap-1">
          <span v-for="tag in visibleTags" :key="tag" class="tb-tag">{{ tag }}</span>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <FavoriteButton :mix="mix" />
          <!-- Aligné à droite : le bouton touche le bord de la ligne, un menu
             parti vers la droite sortirait de l'écran. -->
          <AddToPlaylistButton :mix-id="mix.id" align="right" />
          <!-- La fenêtre à onglets, comme sur la page d'un mix : le lien d'un
             côté, le code d'intégration et son aperçu de l'autre. Elle est
             téléportée et centrée, donc elle ne dépend pas de la place
             disponible autour du bouton. -->
          <ShareButton
            :url="mixShareUrl(mix)"
            :embed-url="mixEmbedUrl(mix)"
            :embed-height="HAUTEUR_EMBED_MIX"
          />
        </div>
      </div>
    </div>

    <!-- Pas de bouton « Lire » au bout de la ligne : le `WaveformPlayer`
         juste au-dessus en porte déjà un, et il fait la même chose. Deux
         commandes pour la même action sur une même ligne de liste, c'est
         surtout deux fois plus de choses à lire avant de cliquer. La teinte du
         fond continue de dire quel mix est en cours. -->
  </div>
</template>
