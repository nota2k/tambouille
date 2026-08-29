<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { usePlayerStore } from '@/stores/player'
import { feedUrl, mediaSrcset, mediaUrl } from '@/utils/media'
import { mixRoute } from '@/utils/routes'
import { formatDate } from '@/utils/date'
import { formatDuration } from '@/utils/time'
import MixListItem from '@/components/MixListItem.vue'
import MixListItemSkeleton from '@/components/MixListItemSkeleton.vue'
import MixGrid from '@/components/MixGrid.vue'
import TagsOverlay from '@/components/TagsOverlay.vue'
import FourneeBanner from '@/components/FourneeBanner.vue'
import FeedLink from '@/components/FeedLink.vue'
import CoverImage from '@/components/CoverImage.vue'
import { useFournee } from '@/composables/useFournee'
import { mixCredit } from '@/composables/useMixCredit'
import { useSeo } from '@/composables/useSeo'
import { shareUrl } from '@/utils/share'
import { DEFAULT_DESCRIPTION, SITE_NAME } from '@/utils/seo'
import type { Mix, MixListResponse, AuthorSummary } from '@/types'

const authStore = useAuthStore()
const playerStore = usePlayerStore()
const route = useRoute()

const search = ref(typeof route.query.q === 'string' ? route.query.q : '')
const sortBy = ref<'recent' | 'plays'>('recent')
/**
 * Vrai dès le départ, et non passé à vrai dans `loadSections` : la vue monte en
 * chargeant. À faux, le tout premier rendu montrerait une page vide avant que
 * `onMounted` ne déclenche le squelette — soit le saut qu'on cherche à supprimer,
 * repoussé d'une image.
 */
const loading = ref(true)
const showTagsOverlay = ref(false)
const selectedTags = ref<string[]>([])
const isSearching = computed(
  () =>
    search.value.trim().length > 0 || selectedTags.value.length > 0 || sortBy.value !== 'recent',
)

/**
 * L'accueil porte l'identité du site et le seul balisage qui vaille à l'échelle
 * du domaine : le `WebSite` et sa recherche, que Google peut reprendre pour
 * proposer un champ de recherche dans ses résultats.
 *
 * Une recherche en cours ne change ni le titre ni la canonique : `useSeo`
 * ignore la chaîne de requête, si bien que « /?q=techno » se déclare comme
 * l'accueil et n'ajoute pas à l'index une page de résultats maigre par terme
 * cherché.
 */
useSeo(() => ({
  title: SITE_NAME,
  description: DEFAULT_DESCRIPTION,
  canonical: shareUrl({ name: 'discover' }),
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: shareUrl({ name: 'discover' }),
    description: DEFAULT_DESCRIPTION,
    inLanguage: 'fr-FR',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${shareUrl({ name: 'discover' })}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  },
}))

function toggleTag(tag: string) {
  const idx = selectedTags.value.indexOf(tag)
  if (idx >= 0) {
    selectedTags.value.splice(idx, 1)
  } else {
    selectedTags.value.push(tag)
  }
  page.value = 1
  loadSearchResults()
}

// Curated sections (shown when not searching)
const latestMixes = ref<Mix[]>([])
const topMixes = ref<Mix[]>([])
const followingTopMixes = ref<Mix[]>([])
const recentlyPlayedMixes = ref<Mix[]>([])

// Flat search results (shown while searching)
const searchResults = ref<Mix[]>([])
const userResults = ref<AuthorSummary[]>([])
const page = ref(1)
const totalPages = ref(1)

let searchTimeout: ReturnType<typeof setTimeout> | undefined

/**
 * Le mix mis en avant, et la liste qui suit sans lui : la maquette ouvre sur un
 * seul mix en grand puis enchaîne, plutôt que de répéter le même mix deux fois
 * comme le faisaient « Derniers uploads » et « Tops ».
 */
const featuredMix = computed(() => latestMixes.value[0] ?? null)
const restOfLatest = computed(() => latestMixes.value.slice(1))
const featuredDuration = computed(() => formatDuration(featuredMix.value?.durationSec))

/**
 * Le premier chargement de l'accueil : l'API n'a encore rien rendu. Distinct
 * d'un catalogue vide, qui lui se dit avec des mots et non avec un squelette.
 */
const chargementDuFlux = computed(() => loading.value && !latestMixes.value.length)
// La règle artiste/compte vient du composable, comme sur les cinq autres
// surfaces : ce bloc écrivait le compte en dur et était le seul à la contourner.
const featuredCredit = computed(() => (featuredMix.value ? mixCredit(featuredMix.value) : null))

/** Tous les mix chargés, pour en tirer les tags et les cuisinier⋅ère⋅s de la colonne. */
const knownMixes = computed(() => [...latestMixes.value, ...topMixes.value])

const { fournee } = useFournee()

/** Les tags les plus portés par les mix affichés — pas un classement, une porte d'entrée. */
const trendingTags = computed(() => {
  const counts = new Map<string, number>()
  for (const mix of knownMixes.value) {
    for (const tag of mix.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag]) => tag)
})

const cooks = computed(() => {
  const seen = new Map<string, AuthorSummary>()
  for (const mix of knownMixes.value) {
    if (!seen.has(mix.user.id)) seen.set(mix.user.id, mix.user)
  }
  return [...seen.values()].slice(0, 4)
})

/** « Sers-moi quelque chose » : au pif dans ce qui est déjà chargé, sans aller-retour serveur. */
function playRandomMix() {
  const pool = knownMixes.value
  if (!pool.length) return
  const pick = pool[Math.floor(Math.random() * pool.length)]
  if (pick) playerStore.play(pick)
}

async function loadSections() {
  loading.value = true
  try {
    // Les deux premières sections sont publiques ; les deux suivantes n'ont de sens que connecté.
    const [latest, top, followingTop, recentlyPlayed] = await Promise.all([
      apiClient.get<MixListResponse>('/mixes', { params: { limit: 10 } }),
      apiClient.get<MixListResponse>('/mixes', { params: { sort: 'plays', limit: 10 } }),
      authStore.isAuthenticated
        ? apiClient.get<MixListResponse>('/mixes/feed/following', { params: { limit: 10 } })
        : Promise.resolve(null),
      authStore.isAuthenticated
        ? apiClient.get<MixListResponse>('/mixes/me/recent', { params: { limit: 10 } })
        : Promise.resolve(null),
    ])
    latestMixes.value = latest.data.items
    topMixes.value = top.data.items
    followingTopMixes.value = followingTop?.data.items ?? []
    recentlyPlayedMixes.value = recentlyPlayed?.data.items ?? []
  } finally {
    loading.value = false
  }
}

async function loadSearchResults() {
  loading.value = true
  try {
    const mixesPromise = apiClient.get<MixListResponse>('/mixes', {
      params: {
        q: search.value || undefined,
        tags: selectedTags.value.length ? selectedTags.value.join(',') : undefined,
        sort: sortBy.value,
        page: page.value,
        limit: 20,
      },
    })

    const q = search.value.trim()
    const usersPromise =
      q.length >= 2
        ? apiClient.get<{ items: AuthorSummary[] }>('/users/search', { params: { q, limit: 5 } })
        : Promise.resolve(null)

    const [mixesRes, usersRes] = await Promise.all([mixesPromise, usersPromise])
    searchResults.value = mixesRes.data.items
    totalPages.value = mixesRes.data.totalPages
    userResults.value = usersRes?.data.items ?? []
  } finally {
    loading.value = false
  }
}

watch(search, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    page.value = 1
    if (isSearching.value) {
      loadSearchResults()
    } else {
      userResults.value = []
      loadSections()
    }
  }, 300)
})

watch(
  () => route.query.q,
  (q) => {
    search.value = typeof q === 'string' ? q : ''
  },
)

watch(sortBy, () => {
  page.value = 1
  loadSearchResults()
})

watch(page, () => {
  if (isSearching.value) loadSearchResults()
})

onMounted(loadSections)
</script>

<template>
  <!-- Hors du conteneur paginé, délibérément : l'aplat de saison va d'un bord à
       l'autre de la fenêtre, seul son contenu s'aligne sur la grille de la page.
       Masqué pendant une recherche, où la home cède la place aux résultats. -->
  <FourneeBanner v-if="fournee && !isSearching" :fournee="fournee" />

  <div class="mx-auto max-w-[1900px] px-4 py-9">
    <!-- Titre et filtres sur une seule ligne, posés sur le filet noir : c'est la
         barre qui donne son échelle à toute la page. -->
    <div
      class="flex flex-wrap items-end justify-between gap-4 border-b-2 border-tambouille-rule pb-3"
    >
      <div class="flex items-center gap-3">
        <h1 class="text-tambouille-title-big leading-none">Découvrir</h1>
        <FeedLink :href="feedUrl('/rss')" title="Tambouille" />
        <FeedLink
          v-if="fournee"
          :href="feedUrl(`/fournees/${fournee.number}/rss`)"
          :title="`La fournée n°${fournee.number} — ${fournee.title}`"
        />
      </div>
      <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-tambouille-muted">
        <button
          type="button"
          class="pb-2 transition"
          :class="
            sortBy === 'recent'
              ? 'border-b-[3px] border-tambouille-accent font-bold text-tambouille-text text-lg'
              : 'hover:text-tambouille-text text-lg'
          "
          @click="sortBy = 'recent'"
        >
          Récents
        </button>
        <button
          type="button"
          class="pb-2 transition"
          :class="
            sortBy === 'plays'
              ? 'border-b-[3px] border-tambouille-accent font-bold text-tambouille-text text-lg'
              : 'hover:text-tambouille-text text-lg'
          "
          @click="sortBy = 'plays'"
        >
          Plus écoutés
        </button>
        <button
          type="button"
          class="pb-2 hover:text-tambouille-text text-lg"
          @click="showTagsOverlay = true"
        >
          Par tag<span v-if="selectedTags.length" class="text-tambouille-accent text-lg">
            ({{ selectedTags.length }})</span
          >
        </button>
        <!-- Le jaune de la maquette vit sur les panneaux noirs, où il tient
             12:1. Posé sur du papier il tombe à 1,38 — un texte qu'on devine
             plutôt qu'on ne le lit.

             L'aplat rose le remplace, et dit mieux ce que ce bouton est : ses
             trois voisins filtrent la liste, celui-ci lance un mix. Un onglet
             de plus le faisait passer pour un quatrième tri. -->
        <button
          type="button"
          class="min-h-9 bg-tambouille-accent px-3.5 py-1.5 text-lg text-tambouille-ink-on-accent transition-opacity hover:opacity-80"
          @click="playRandomMix"
        >
          Au hasard
        </button>
      </div>
    </div>

    <div v-if="selectedTags.length" class="mt-4 flex flex-wrap items-center gap-2">
      <button
        v-for="tag in selectedTags"
        :key="tag"
        class="tb-chip tb-chip-on"
        @click="toggleTag(tag)"
      >
        {{ tag }}
        <svg viewBox="0 0 24 24" class="h-3 w-3 fill-current">
          <path
            d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
          />
        </svg>
      </button>
    </div>

    <TagsOverlay
      v-if="showTagsOverlay"
      :selected="selectedTags"
      @toggle="toggleTag"
      @close="showTagsOverlay = false"
    />

    <template v-if="isSearching">
      <!-- Le flux avant ses données : six lignes plutôt qu'un « Chargement… »
           centré, qui ne réservait rien et laissait les résultats pousser le bas
           de page d'un coup. -->
      <div v-if="loading && !searchResults.length" class="mt-9">
        <MixListItemSkeleton v-for="n in 6" :key="n" />
      </div>

      <section v-if="userResults.length > 0" class="mt-9">
        <p class="tb-eyebrow">Cuisinier⋅ère⋅s</p>
        <div class="flex flex-wrap gap-6 pt-4">
          <RouterLink
            v-for="user in userResults"
            :key="user.id"
            :to="{ name: 'profile', params: { username: user.username } }"
            class="flex items-center gap-3"
          >
            <img
              v-if="user.avatarUrl"
              :src="mediaUrl(user.avatarUrl)"
              loading="lazy"
              decoding="async"
              class="h-11 w-11 object-cover"
              alt=""
            />
            <div
              v-else
              class="flex h-11 w-11 items-center justify-center bg-tambouille-accent text-sm font-bold text-tambouille-ink-on-accent"
            >
              {{ user.displayName?.[0]?.toUpperCase() }}
            </div>
            <span class="min-w-0">
              <span class="block truncate font-display text-[15px] font-bold">{{
                user.displayName
              }}</span>
              <span class="block truncate text-[13px] text-tambouille-muted"
                >@{{ user.username }}</span
              >
            </span>
          </RouterLink>
        </div>
      </section>

      <div
        v-if="searchResults.length === 0 && userResults.length === 0"
        class="py-16 text-center text-tambouille-muted"
      >
        Aucun résultat trouvé.
      </div>

      <div v-if="searchResults.length > 0" class="mt-9">
        <p class="tb-eyebrow">{{ searchResults.length }} mix</p>
        <MixListItem v-for="mix in searchResults" :key="mix.id" :mix="mix" />
      </div>

      <div v-if="totalPages > 1" class="mt-8 flex items-center justify-center gap-4">
        <button class="tb-btn-outline tb-btn-sm" :disabled="page <= 1" @click="page--">
          Précédent
        </button>
        <span class="text-sm text-tambouille-muted">Page {{ page }} / {{ totalPages }}</span>
        <button class="tb-btn-outline tb-btn-sm" :disabled="page >= totalPages" @click="page++">
          Suivant
        </button>
      </div>
    </template>

    <template v-else>
      <!-- Colonne principale + colonne de découverte : le hasard, les tags et les
           cuisinier⋅ère⋅s remplacent le bloc coloré et le faux classement. -->
      <div class="mt-8 grid gap-12 lg:grid-cols-[1fr_320px]">
        <div class="min-w-0">
          <!-- La colonne avant ses données. Sans elle, l'accueil s'affichait
               presque vide : la bande « Écoutez ailleurs » se retrouvait dans la
               fenêtre, puis les mix arrivaient et la chassaient trois mille
               pixels plus bas. Ce saut-là valait à lui seul 1,47 de décalage
               cumulé, sur un seuil de 0,1.

               Un mis en avant et neuf lignes : c'est ce que `limit: 10` ramène,
               le premier mix passant à la une et les neuf autres à la suite. -->
          <template v-if="chargementDuFlux">
            <p class="tb-eyebrow">À la une</p>
            <div
              class="flex flex-col gap-6 border-b border-black/15 py-7 sm:flex-row"
              aria-hidden="true"
            >
              <div
                class="aspect-square w-full max-w-[var(--width-max-large)] shrink-0 bg-tambouille-surface-hover"
              />
              <div class="flex min-w-0 flex-1 flex-col">
                <!-- Le titre : `text-5xl leading-tight`, deux lignes. Réserver
                     au plus court rendrait le saut qu'on cherche à supprimer. -->
                <div class="h-[60px] w-11/12 bg-tambouille-surface-hover" />
                <div class="mt-2 h-[60px] w-2/3 bg-tambouille-surface-hover" />
                <!-- Le compte et la date, puis la ligne durée · morceaux. -->
                <div class="mt-4 h-[26px] w-1/2 bg-tambouille-surface-hover" />
                <div class="mt-2.5 h-5 w-2/5 bg-tambouille-surface-hover" />
                <!-- Le bouton « Écouter », `tb-btn`. -->
                <div class="mt-auto h-[43px] w-40 bg-tambouille-surface-hover" />
              </div>
            </div>

            <section class="pt-8">
              <p class="tb-eyebrow">Derniers mix</p>
              <MixListItemSkeleton v-for="n in 9" :key="n" />
            </section>
          </template>

          <template v-if="featuredMix">
            <p class="tb-eyebrow">À la une</p>
            <div class="flex flex-col gap-6 border-b border-black/15 py-7 sm:flex-row">
              <!-- Hors de l'arborescence d'accessibilité et de l'ordre de
                   tabulation : le titre à droite mène au même mix. Le lien ne
                   contenant qu'une image décorative, il n'annoncerait rien. -->
              <RouterLink
                :to="mixRoute(featuredMix)"
                class="aspect-square w-full max-w-[var(--width-max-large)] shrink-0 overflow-hidden bg-tambouille-surface-hover"
                aria-hidden="true"
                tabindex="-1"
              >
                <CoverImage
                  :src="mediaUrl(featuredMix.coverUrl)"
                  :srcset="mediaSrcset(featuredMix.coverUrl)"
                  sizes="(min-width: 640px) 380px, 100vw"
                  priority
                />
              </RouterLink>

              <div class="flex min-w-0 flex-1 flex-col">
                <RouterLink :to="mixRoute(featuredMix)">
                  <h2 class="font-display text-5xl font-medium leading-tight sm:text-[46px]">
                    {{ featuredMix.title }}
                  </h2>
                </RouterLink>

                <!-- Même règle que sur la page du mix : la ligne ne paraît que
                     lorsqu'il y a deux noms distincts à montrer. Sans artiste,
                     ou quand l'artiste est le compte qui a mis en ligne, elle se
                     tait — sinon on lirait le même nom deux fois de suite. -->
                <p v-if="featuredCredit?.secondary" class="pt-2 text-[17px] text-tambouille-muted">
                  par {{ featuredCredit.primary }}
                </p>

                <p class="pb-1.5 pt-2.5 text-[17px] text-tambouille-muted">
                  {{ featuredMix.user.displayName }} · {{ formatDate(featuredMix.createdAt) }}
                </p>

                <p class="flex flex-wrap items-baseline gap-x-2 pb-4 text-sm">
                  <b v-if="featuredDuration">{{ featuredDuration }}</b>
                  <span v-if="featuredDuration" class="text-tambouille-faint">·</span>
                  <span v-if="featuredMix.tracklist.length"
                    >{{ featuredMix.tracklist.length }} morceaux</span
                  >
                  <span v-if="featuredMix.tracklist.length" class="text-tambouille-faint">·</span>
                  <span v-for="tag in featuredMix.tags.slice(0, 3)" :key="tag" class="tb-tag">
                    {{ tag }}
                  </span>
                </p>

                <div class="mt-auto flex flex-wrap items-center gap-4">
                  <button class="tb-btn" @click="playerStore.play(featuredMix)">Écouter</button>
                  <span v-if="featuredMix.audioUrl" class="text-[13px] text-tambouille-muted">
                    {{ featuredMix.playsCount }} écoutes
                  </span>
                </div>
              </div>
            </div>
          </template>

          <section v-if="restOfLatest.length" class="pt-8">
            <p class="tb-eyebrow">Derniers mix</p>
            <MixListItem v-for="mix in restOfLatest" :key="mix.id" :mix="mix" />
          </section>

          <p v-if="!loading && !latestMixes.length" class="py-10 text-center text-tambouille-muted">
            Aucun mix pour l'instant. Sois le premier à en mettre un à la casserole&nbsp;!
          </p>

          <section v-if="followingTopMixes.length" class="pt-10">
            <p class="tb-eyebrow">Chez tes abonnements</p>
            <MixListItem v-for="mix in followingTopMixes" :key="mix.id" :mix="mix" />
          </section>

          <section v-if="recentlyPlayedMixes.length" class="pt-10">
            <p class="tb-eyebrow">Repris là où tu t'es arrêté⋅e</p>
            <MixGrid :mixes="recentlyPlayedMixes" class="mt-4" />
          </section>
        </div>

        <!-- L'`aside` est un item de grille : il s'étire sur toute la hauteur de
             la rangée, et c'est lui qui donne sa fin de course au bloc collant.
             Le `top-20` dégage les 64 px de la barre de navigation, elle-même
             en `sticky top-0`. Rien avant `lg`, où la grille n'a qu'une colonne
             et où la colonne se retrouve empilée sous le contenu. -->
        <aside class="min-w-0">
          <div class="lg:sticky lg:top-20">
            <div class="tb-panel-dark">
              <p class="uppercase text-lg border-b border-white pb-2.5 text-tambouille-jaune">
                Au hasard
              </p>
              <p class="mb-4 mt-3.5 text-sm leading-relaxed">
                Pas d'idée&nbsp;? On te sert un mix au pif. L'arbitraire y est roi.
              </p>
              <button class="tb-btn" :disabled="!knownMixes.length" @click="playRandomMix">
                Sers-moi quelque chose
              </button>
            </div>

            <div v-if="trendingTags.length" class="pt-8">
              <p class="tb-eyebrow">Tags du moment</p>
              <div class="flex flex-wrap gap-2 pt-3.5">
                <button
                  v-for="tag in trendingTags"
                  :key="tag"
                  class="tb-chip"
                  @click="toggleTag(tag)"
                >
                  {{ tag }}
                </button>
              </div>
            </div>

            <div v-if="cooks.length" class="pt-8">
              <p class="tb-eyebrow">Cuisinier⋅ère⋅s</p>
              <div class="flex flex-col gap-3.5 pt-3.5">
                <RouterLink
                  v-for="cook in cooks"
                  :key="cook.id"
                  :to="{ name: 'profile', params: { username: cook.username } }"
                  class="flex items-center gap-3"
                >
                  <img
                    v-if="cook.avatarUrl"
                    :src="mediaUrl(cook.avatarUrl)"
                    loading="lazy"
                    decoding="async"
                    class="h-11 w-11 shrink-0 object-cover"
                    alt=""
                  />
                  <span
                    v-else
                    class="flex h-11 w-11 shrink-0 items-center justify-center bg-tambouille-surface-hover font-display font-bold"
                  >
                    {{ cook.displayName?.[0]?.toUpperCase() }}
                  </span>
                  <span class="min-w-0">
                    <span class="block truncate font-display text-[15px] font-bold">{{
                      cook.displayName
                    }}</span>
                    <span class="block truncate text-[12.5px] text-tambouille-muted"
                      >@{{ cook.username }}</span
                    >
                  </span>
                </RouterLink>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </template>
  </div>
</template>
