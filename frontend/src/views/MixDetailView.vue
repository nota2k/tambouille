<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiClient } from '@/api/client'
import { usePlayerStore } from '@/stores/player'
import { useAuthStore } from '@/stores/auth'
import { mixCredit } from '@/composables/useMixCredit'
import { mediaSrcset, mediaUrl } from '@/utils/media'
import CoverImage from '@/components/CoverImage.vue'
import { formatTime, formatDuration, isoDuration } from '@/utils/time'
import { formatDate } from '@/utils/date'
import { toggleMixFavorite } from '@/utils/favorites'
import UploaderCard from '@/components/UploaderCard.vue'
import CommentsSection from '@/components/CommentsSection.vue'
import MixCard from '@/components/MixCard.vue'
import WaveformPlayer from '@/components/WaveformPlayer.vue'
import ShareButton from '@/components/ShareButton.vue'
import AddToPlaylistButton from '@/components/AddToPlaylistButton.vue'
import { mixShareUrl } from '@/utils/share'
import { nomDeLaSource } from '@/utils/source'
import { mixEditRoute, mixRoute } from '@/utils/routes'
import { taireLeProchainVoile } from '@/composables/useTransitionDePage'
import { useSeo } from '@/composables/useSeo'
import type { Mix, TracklistEntry, UserProfile } from '@/types'

const route = useRoute()
const router = useRouter()
const playerStore = usePlayerStore()
const authStore = useAuthStore()

const mix = ref<Mix | null>(null)
const uploaderProfile = ref<UserProfile | null>(null)
// La règle « artiste sinon compte » vit dans le composable, pas ici : sans
// lui, un mix importé par son propre artiste lirait « par Nelly Babillon »
// puis « Mijoté par Nelly Babillon », juste en dessous.
const credit = computed(() => (mix.value ? mixCredit(mix.value) : null))
const suggestions = ref<Mix[]>([])
const loading = ref(true)
const deleting = ref(false)

const sourceLabel = computed(() => nomDeLaSource(mix.value?.sourceType, mix.value?.sourceRef))

/**
 * L'adresse du mix dans l'API, selon la route par laquelle on est arrivé.
 *
 * Deux routes mènent ici : la canonique, `/mixes/<compte>/<slug>`, et l'ancienne
 * à un seul segment, qui ne connaît qu'un identifiant. Le paramètre présent
 * suffit à les distinguer.
 */
function urlDeLApi(): string {
  const { username, slug, id } = route.params
  if (typeof id === 'string') return `/mixes/${id}`
  return `/mixes/by-slug/${encodeURIComponent(String(username))}/${encodeURIComponent(String(slug))}`
}

/**
 * Remplace une ancienne adresse `/mixes/<id>` par la canonique.
 *
 * C'est ce qui fait vivre les liens déjà partagés sans les dupliquer : ils
 * affichent la page, puis l'adresse devient la bonne. Aucune requête de plus —
 * celle du mix venait d'aboutir, et c'est elle qui apprend compte et slug.
 *
 * `taireLeProchainVoile` parce que rien de ce qui est affiché ne change : sans
 * lui, le voile rose tomberait sur une page déjà lue.
 *
 * Query et fragment sont reconduits : un lien partagé peut porter un `?t=` ou
 * une ancre, et les perdre en chemin viderait le partage de son sens.
 */
function canoniserLUrl(courant: Mix) {
  // Sur la route canonique il n'y a rien à corriger. Un username qui ne
  // correspond pas n'y est plus rattrapable : le slug n'est unique que par
  // compte, donc l'username fait partie de la désignation — l'API répond 404,
  // ce qui est la bonne réponse.
  if (typeof route.params.id !== 'string') return
  taireLeProchainVoile()
  router.replace({ ...mixRoute(courant), query: route.query, hash: route.hash })
}

async function loadMix() {
  loading.value = true
  try {
    const { data } = await apiClient.get<Mix>(urlDeLApi())
    mix.value = data
    canoniserLUrl(data)
    const { data: profileData } = await apiClient.get<UserProfile>(`/users/${data.user.username}`)
    uploaderProfile.value = profileData
  } finally {
    loading.value = false
  }
}

async function loadSuggestions(id: string) {
  // Les suggestions sont un complément : si l'appel échoue, la page du mix reste
  // entière et la section disparaît, plutôt que de faire tomber le tout.
  try {
    const { data } = await apiClient.get<{ items: Mix[] }>(`/mixes/${id}/suggestions`, {
      params: { limit: 3 },
    })
    suggestions.value = data.items
  } catch {
    suggestions.value = []
  }
}

/**
 * Les deux chargements, en séquence et non plus de front.
 *
 * L'identifiant du mix n'est plus dans l'URL : il faut le mix pour demander ses
 * suggestions. C'est un aller-retour de plus avant qu'elles n'arrivent, et
 * c'est sans conséquence — elles sont sous la ligne de flottaison, et déjà
 * traitées comme un complément qui peut manquer.
 */
async function loadAll() {
  suggestions.value = []
  await loadMix()
  if (mix.value) await loadSuggestions(mix.value.id)
}

function playFromTrack(entry: TracklistEntry) {
  if (mix.value) playerStore.playAt(mix.value, entry.timecodeSec)
}

function toggleFavorite() {
  if (!mix.value) return
  if (!authStore.isAuthenticated) {
    router.push({ name: 'login' })
    return
  }
  toggleMixFavorite(mix.value).catch(() => {})
}

async function removeMix() {
  if (!mix.value) return
  if (!confirm('Supprimer définitivement ce mix ?')) return
  deleting.value = true
  try {
    await apiClient.delete(`/mixes/${mix.value.id}`)
    router.push('/')
  } finally {
    deleting.value = false
  }
}

/**
 * Le compte de commentaires du mix, tenu ici parce que le mix est ici.
 *
 * `CommentsSection` et `CommentItem` l'écrivaient directement, à travers la
 * prop : cela fonctionnait, mais cette vue ne savait pas que sa donnée bougeait.
 * Elles annoncent maintenant l'écart, et c'est cette vue qui l'applique — à sa
 * propre référence, ce qui est son droit.
 */
function onCommentsCountChanged(ecart: number) {
  if (mix.value) mix.value.commentsCount += ecart
}

const duration = computed(() => formatDuration(mix.value?.durationSec))

/**
 * Ce qui suit, dans la ligne d'infos, chacun des membres qu'un point médian
 * peut précéder.
 *
 * La ligne énumère quatre choses — source, durée, nombre de morceaux, tags — et
 * chacune peut manquer. Un séparateur écrit sans condition sépare alors du
 * vide : « The Brain Radioshow · 1 h · 22 morceaux · » sur un mix sans tag,
 * avec en prime la classe `tb-tag` qui l'affiche encadré, comme un tag nommé
 * « · ». Un point médian ne sort donc que s'il a quelque chose des deux côtés.
 */
const suiteApresLaSource = computed(() => {
  const current = mix.value
  if (!current) return false
  return Boolean(duration.value) || current.tracklist.length > 0 || current.tags.length > 0
})

const suiteApresLaDuree = computed(() => {
  const current = mix.value
  if (!current) return false
  return current.tracklist.length > 0 || current.tags.length > 0
})
const isCurrent = computed(() => mix.value != null && playerStore.currentMix?.id === mix.value.id)
const isPlaying = computed(() => isCurrent.value && playerStore.isPlaying)

/**
 * Le morceau en cours, d'après la position de lecture : c'est ce qui rend la
 * tracklist vivante au lieu d'être une liste morte saisie à l'upload.
 */
const currentTrackId = computed(() => {
  if (!isCurrent.value || !mix.value) return null
  let active: string | null = null
  for (const entry of mix.value.tracklist) {
    if (entry.timecodeSec <= playerStore.currentTime) active = entry.id
    else break
  }
  return active
})

function togglePlay() {
  if (!mix.value) return
  if (isCurrent.value) playerStore.toggle()
  else playerStore.play(mix.value)
}

/**
 * La page d'un mix est la seule du site qui décrive une œuvre précise : c'est
 * elle qui a une chance d'être trouvée sur le nom d'un artiste ou d'un mix, et
 * elle porte donc les données structurées les plus riches.
 *
 * Le descripteur est une fonction parce que le mix arrive après le montage :
 * `useSeo` réécrit le `<head>` quand la réponse est là, ce que Googlebot voit,
 * exécutant le JavaScript avant de lire la page.
 */
useSeo(() => {
  const current = mix.value
  // Pendant le chargement, les valeurs par défaut du site : mieux vaut ça
  // qu'un titre inventé qui resterait affiché si la requête échoue.
  if (!current) return {}

  const auteur = credit.value?.primary ?? current.user.displayName
  const duree = formatDuration(current.durationSec)
  const cover = mediaUrl(current.coverUrl)

  return {
    // « par » plutôt qu'un tiret : le suffixe du site en pose déjà un, et
    // « Mix — Artiste — Tambouille » se lit comme trois choses sans lien.
    title: `${current.title} par ${auteur}`,
    description:
      current.description ||
      [`${current.title}, un mix de ${auteur} à écouter sur Tambouille`, duree]
        .filter(Boolean)
        .join(' · '),
    image: cover,
    type: 'music.song',
    canonical: mixShareUrl(current),
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'MusicRecording',
      name: current.title,
      url: mixShareUrl(current),
      byArtist: { '@type': 'MusicGroup', name: auteur },
      datePublished: current.createdAt,
      ...(current.description ? { description: current.description } : {}),
      ...(cover ? { image: cover } : {}),
      ...(isoDuration(current.durationSec) ? { duration: isoDuration(current.durationSec) } : {}),
      ...(current.tags.length ? { genre: current.tags } : {}),
    },
  }
})

/**
 * Ce qui est affiché correspond-il déjà à ce que l'URL demande ?
 *
 * La question se pose parce que la réécriture d'une ancienne adresse change
 * tous les paramètres d'un coup : sans cette comparaison, le veilleur y verrait
 * un autre mix et redemanderait celui qu'il vient de recevoir.
 */
function correspondALUrl(): boolean {
  const courant = mix.value
  if (!courant) return false
  if (typeof route.params.id === 'string') return route.params.id === courant.id
  return route.params.username === courant.user.username && route.params.slug === courant.slug
}

// Une carte de suggestion mène d'un mix à un autre : même route, même composant, que Vue
// Router réutilise sans le remonter. `onMounted` seul laissait alors l'ancien mix affiché
// sous la nouvelle URL. On suit donc les paramètres, `immediate` remplaçant le montage.
watch(
  () => [route.params.username, route.params.slug, route.params.id] as const,
  () => {
    if (!correspondALUrl()) loadAll()
  },
  { immediate: true },
)
</script>

<template>
  <div class="mx-auto max-w-[1900px] px-4 py-10">
    <div v-if="loading" class="py-16 text-center text-tambouille-muted">Chargement...</div>

    <template v-else-if="mix">
      <!-- En-tête : la pochette carrée, le titre en grand, et la ligne d'infos
           qui manquait — durée, nombre de morceaux, tags. -->
      <div class="flex flex-col gap-7 sm:flex-row">
        <div
          class="aspect-square w-full max-w-[360px] shrink-0 overflow-hidden bg-tambouille-surface-hover"
        >
          <!-- `sizes` : le conteneur plafonne à 360 px et n'occupe toute la
               largeur qu'en dessous, où `100vw` surestime des 32 px de marge —
               dans le bon sens, celui d'une image un cran trop grande. -->
          <CoverImage
            :src="mediaUrl(mix.coverUrl)"
            :srcset="mediaSrcset(mix.coverUrl)"
            sizes="(min-width: 640px) 360px, 100vw"
            priority
          >
            <template #vide>
              <div class="flex h-full w-full items-center justify-center text-tambouille-faint">
                <svg viewBox="0 0 24 24" class="h-16 w-16 fill-current">
                  <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
                </svg>
              </div>
            </template>
          </CoverImage>
        </div>

        <div class="min-w-0 flex-1">
          <h1 class="text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.05]">{{ mix.title }}</h1>

          <!-- N'apparaît que lorsqu'il y a deux noms distincts à montrer : pas
               d'artiste, ou artiste identique au compte qui a mis en ligne
               (import de son propre mix), et la ligne se tait — sinon on
               lirait « par Nelly Babillon » puis « Mijoté par Nelly Babillon »
               juste en dessous. -->
          <p v-if="credit?.secondary" class="pt-1 text-lg text-tambouille-muted">
            par {{ credit.primary }}
          </p>

          <p class="pb-2.5 pt-3.5 text-base text-tambouille-muted">
            Mijoté par
            <RouterLink
              :to="{ name: 'profile', params: { username: mix.user.username } }"
              class="font-bold text-tambouille-text hover:underline"
            >
              {{ mix.user.displayName }}
            </RouterLink>
            · {{ formatDate(mix.createdAt) }}
          </p>

          <p class="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 pb-5 text-sm">
            <!-- D'où vient le mix. Cliquable vers la page de l'émission quand
                 elle est connue — les mix importés avant que la colonne existe
                 n'en ont pas toujours une, et se contentent alors du nom. -->
            <template v-if="sourceLabel">
              <a
                v-if="mix.sourcePageUrl"
                :href="mix.sourcePageUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="font-bold hover:underline"
              >
                {{ sourceLabel }}
              </a>
              <b v-else>{{ sourceLabel }}</b>
              <span v-if="suiteApresLaSource" class="text-tambouille-faint">·</span>
            </template>
            <b v-if="duration">{{ duration }}</b>
            <span v-if="duration && suiteApresLaDuree" class="text-tambouille-faint">·</span>
            <span v-if="mix.tracklist.length">{{ mix.tracklist.length }} morceaux</span>
            <span v-if="mix.tracklist.length && mix.tags.length" class="tb-tag">·</span>
            <span v-for="tag in mix.tags" :key="tag" class="tb-tag">{{ tag }}</span>
          </p>

          <div class="flex flex-wrap items-center gap-3">
            <button class="tb-btn" @click="togglePlay">
              {{ isPlaying ? 'Pause' : 'Écouter' }}
            </button>
            <!-- Le libellé passe dans `aria-label` et `title` : sans texte
                 visible, ce sont eux qui portent l'action et son état. Le cœur
                 plein ou creux dit lequel des deux à qui voit l'icône. -->
            <button
              class="tb-btn-outline tb-btn-icone"
              :class="{ '!border-tambouille-accent !text-tambouille-accent': mix.isFavorited }"
              :aria-pressed="mix.isFavorited"
              :aria-label="mix.isFavorited ? 'Retirer des favoris' : 'Mettre en favori'"
              :title="mix.isFavorited ? 'Retirer des favoris' : 'Mettre en favori'"
              @click="toggleFavorite"
            >
              <svg v-if="mix.isFavorited" viewBox="0 0 24 24" class="h-4 w-4 fill-current">
                <path
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                />
              </svg>
              <svg
                v-else
                viewBox="0 0 24 24"
                class="h-4 w-4 fill-none stroke-current"
                stroke-width="2"
              >
                <path
                  d="M12 20.6l-1.1-1C5.9 15 2.8 12.2 2.8 8.7 2.8 5.9 5 3.8 7.7 3.8c1.6 0 3.1.7 4.3 2 1.2-1.3 2.7-2 4.3-2 2.7 0 4.9 2.1 4.9 4.9 0 3.5-3.1 6.3-8.1 10.9l-1.1 1z"
                />
              </svg>
            </button>
            <AddToPlaylistButton :mix-id="mix.id" />
            <ShareButton :url="mixShareUrl(mix)" />
          </div>

          <div
            v-if="authStore.user?.id === mix.userId"
            class="mt-5 flex items-center gap-5 text-sm"
          >
            <RouterLink :to="mixEditRoute(mix)" class="text-tambouille-muted hover:underline">
              Modifier ce mix
            </RouterLink>
            <button
              :disabled="deleting"
              class="text-tambouille-accent hover:underline disabled:opacity-50"
              @click="removeMix"
            >
              Supprimer ce mix
            </button>
          </div>
        </div>
      </div>

      <!-- La vague n'est plus décorative : pleine largeur, elle sert de barre de
           progression et de zone de navigation. -->
      <div class="mt-9 border-b border-tambouille-rule pb-2">
        <WaveformPlayer :mix="mix" />
      </div>
      <!-- La provenance était dite ici, sous la vague, et son lien menait au mp3
           nu faute de mieux. Elle est maintenant dans l'encart infos, en tête,
           avec la vraie page de l'émission : la répéter ici ne dirait rien de
           plus. `ml-auto` remplace `justify-between`, qui collait la durée à
           gauche dès que la ligne n'avait qu'un membre. -->
      <p class="flex items-baseline pt-2 text-xs text-tambouille-muted">
        <span v-if="mix.audioUrl">{{ mix.playsCount }} écoutes</span>
        <span v-if="duration" class="ml-auto">{{ duration }}</span>
      </p>

      <!-- Deux colonnes seulement quand il y a une tracklist à mettre en face du
           texte : sans elle, la colonne de gauche resterait une moitié de page
           vide sous un titre qui annonce son propre vide. -->
      <div
        class="mt-10 grid gap-12"
        :class="{ 'lg:grid-cols-[1.15fr_1fr]': mix.tracklist.length > 0 }"
      >
        <div v-if="mix.tracklist.length > 0" class="min-w-0">
          <p class="tb-eyebrow">Tracklist — {{ mix.tracklist.length }} morceaux</p>
          <ol>
            <li v-for="entry in mix.tracklist" :key="entry.id">
              <button
                class="grid w-full cursor-pointer grid-cols-[4.5rem_1fr] items-baseline gap-x-4 border-b border-black/10 px-2 py-3 text-left transition"
                :class="
                  entry.id === currentTrackId
                    ? 'bg-tambouille-accent-wash'
                    : 'hover:bg-tambouille-surface-hover'
                "
                @click="playFromTrack(entry)"
              >
                <span
                  class="text-sm tabular-nums"
                  :class="
                    entry.id === currentTrackId
                      ? 'font-bold text-tambouille-accent'
                      : 'text-tambouille-muted'
                  "
                >
                  {{ formatTime(entry.timecodeSec) }}
                </span>
                <!-- Un des deux noms peut manquer — un jingle, une intro. Le
                     tiret cadratin ne sépare que ce qu'il y a des deux côtés,
                     au lieu de rester suspendu dans le vide. -->
                <span class="min-w-0 text-[15px] text-tambouille-text">
                  <template v-if="entry.artist && entry.title">
                    <span :class="{ 'font-bold': entry.id === currentTrackId }">{{
                      entry.artist
                    }}</span>
                    <span class="text-tambouille-muted"> — {{ entry.title }}</span>
                  </template>
                  <span
                    v-else
                    :class="
                      entry.artist || entry.title
                        ? { 'font-bold': entry.id === currentTrackId }
                        : 'text-tambouille-muted'
                    "
                    >{{ entry.title || entry.artist || 'Sans titre' }}</span
                  >
                </span>
              </button>
            </li>
          </ol>
        </div>

        <div class="min-w-0">
          <template v-if="mix.description">
            <p class="tb-eyebrow">Le mot de la cuisine</p>
            <p class="mb-9 mt-4 whitespace-pre-line text-base leading-relaxed">
              {{ mix.description }}
            </p>
          </template>

          <CommentsSection :mix="mix" @count-changed="onCommentsCountChanged" />

          <div v-if="uploaderProfile" class="pt-9">
            <UploaderCard :profile="uploaderProfile" />
          </div>
        </div>
      </div>

      <section v-if="suggestions.length" class="mt-14">
        <p class="tb-eyebrow">Dans la même casserole</p>
        <div class="grid grid-cols-2 gap-5 pt-5 sm:grid-cols-3">
          <MixCard
            v-for="suggestion in suggestions"
            :key="suggestion.id"
            :mix="suggestion"
            landscape
          />
        </div>
      </section>
    </template>
  </div>
</template>
