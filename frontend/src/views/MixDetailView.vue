<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiClient } from '@/api/client'
import { usePlayerStore } from '@/stores/player'
import { useAuthStore } from '@/stores/auth'
import { mediaUrl } from '@/utils/media'
import { formatTime, formatDuration } from '@/utils/time'
import { formatDate } from '@/utils/date'
import { toggleMixFavorite } from '@/utils/favorites'
import UploaderCard from '@/components/UploaderCard.vue'
import CommentsSection from '@/components/CommentsSection.vue'
import MixCard from '@/components/MixCard.vue'
import WaveformPlayer from '@/components/WaveformPlayer.vue'
import ShareButton from '@/components/ShareButton.vue'
import AddToPlaylistButton from '@/components/AddToPlaylistButton.vue'
import { mixShareUrl } from '@/utils/share'
import type { Mix, TracklistEntry, UserProfile } from '@/types'

const route = useRoute()
const router = useRouter()
const playerStore = usePlayerStore()
const authStore = useAuthStore()

const mix = ref<Mix | null>(null)
const uploaderProfile = ref<UserProfile | null>(null)
const suggestions = ref<Mix[]>([])
const loading = ref(true)
const deleting = ref(false)

/**
 * Sites that write their own name differently from their domain. This is a
 * display lookup, not a stored value: what the design refused to grow one
 * entry per site was the database column, and `sourceRef` still holds a URL
 * and nothing else. A host that is not listed shows as its bare hostname,
 * which reads acceptably for most.
 */
const SOURCE_NAMES: Record<string, string> = {
  'archive.org': 'Archive.org',
  'ouiedire.net': 'Ouïedire',
  // LYL sert ses mp3 depuis un sous-domaine de fichiers, jamais depuis lyl.live :
  // sans cette entrée le lien vers la source s'annoncerait « static.lyl.live ».
  'static.lyl.live': 'LYL Radio',
}

/**
 * `sourceType` says which player engine, not which site — Archive.org and a
 * podcast both answer 'remote'. The name shown therefore comes from the host
 * of `sourceRef`, which keeps the stored value from growing one per site.
 */
const sourceLabel = computed(() => {
  const current = mix.value
  if (!current?.sourceRef) return null
  if (current.sourceType === 'mixcloud') return 'Mixcloud'
  if (current.sourceType === 'soundcloud') return 'SoundCloud'
  try {
    const host = new URL(current.sourceRef).hostname.replace(/^www\./, '')
    return SOURCE_NAMES[host] ?? host
  } catch {
    return null
  }
})

const sourcePageUrl = computed(() => {
  const current = mix.value
  if (!current?.sourceRef) return null
  return current.sourceType === 'mixcloud'
    ? `https://www.mixcloud.com${current.sourceRef}`
    : current.sourceRef
})

async function loadMix() {
  loading.value = true
  try {
    const { data } = await apiClient.get<Mix>(`/mixes/${route.params.id}`)
    mix.value = data
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

async function loadAll(id: string) {
  suggestions.value = []
  await Promise.all([loadMix(), loadSuggestions(id)])
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

const duration = computed(() => formatDuration(mix.value?.durationSec))
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

// Une carte de suggestion mène d'un mix à un autre : même route, même composant, que Vue
// Router réutilise sans le remonter. `onMounted` seul laissait alors l'ancien mix affiché
// sous la nouvelle URL. On suit donc le paramètre, `immediate` remplaçant le montage.
watch(
  () => route.params.id,
  (id) => {
    if (typeof id === 'string') loadAll(id)
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
          <img
            v-if="mix.coverUrl"
            :src="mediaUrl(mix.coverUrl)"
            class="h-full w-full object-cover"
            alt=""
          />
          <div v-else class="flex h-full w-full items-center justify-center text-tambouille-faint">
            <svg viewBox="0 0 24 24" class="h-16 w-16 fill-current">
              <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
            </svg>
          </div>
        </div>

        <div class="min-w-0 flex-1">
          <h1 class="text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.05]">{{ mix.title }}</h1>

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
            <b v-if="duration">{{ duration }}</b>
            <span v-if="duration" class="text-tambouille-faint">·</span>
            <span v-if="mix.tracklist.length">{{ mix.tracklist.length }} morceaux</span>
            <span v-if="mix.tracklist.length" class="text-tambouille-faint">·</span>
            <span v-for="tag in mix.tags" :key="tag" class="text-tambouille-accent">{{ tag }}</span>
          </p>

          <div class="flex flex-wrap items-center gap-3">
            <button class="tb-btn" @click="togglePlay">
              {{ isPlaying ? 'Pause' : 'Écouter' }}
            </button>
            <button
              class="tb-btn-outline"
              :class="{ '!border-tambouille-accent !text-tambouille-accent': mix.isFavorited }"
              @click="toggleFavorite"
            >
              {{ mix.isFavorited ? 'Favori' : 'Mettre en favori' }}
            </button>
            <AddToPlaylistButton :mix-id="mix.id" />
            <ShareButton :url="mixShareUrl(mix.id)" />
          </div>

          <div
            v-if="authStore.user?.id === mix.userId"
            class="mt-5 flex items-center gap-5 text-sm"
          >
            <RouterLink
              :to="{ name: 'mix-edit', params: { id: mix.id } }"
              class="text-tambouille-muted hover:underline"
            >
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
      <p class="flex items-baseline justify-between pt-2 text-xs text-tambouille-muted">
        <a
          v-if="sourcePageUrl"
          :href="sourcePageUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="hover:underline"
        >
          Audio hébergé sur {{ sourceLabel }}
        </a>
        <span v-else-if="mix.audioUrl">{{ mix.playsCount }} écoutes</span>
        <span v-if="duration">{{ duration }}</span>
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

          <CommentsSection :mix="mix" />

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
