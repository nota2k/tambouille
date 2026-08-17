<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { mediaUrl } from '@/utils/media'
import { formatDuration } from '@/utils/time'
import { toggleUserFollow } from '@/utils/follows'
import MixListItem from '@/components/MixListItem.vue'
import PlaylistCard from '@/components/PlaylistCard.vue'
import AvatarStack from '@/components/AvatarStack.vue'
import { createPlaylist, fetchUserPlaylists } from '@/utils/playlists'
import type { AuthorSummary, Mix, PlaylistSummary, UserProfile } from '@/types'

/** Followers, following and playlists now live in the two-column section, not in tabs. */
type Tab = 'mixes' | 'favorites'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const profile = ref<UserProfile | null>(null)
const mixes = ref<Mix[]>([])
const favorites = ref<Mix[]>([])
const playlists = ref<PlaylistSummary[]>([])
const followers = ref<AuthorSummary[]>([])
const following = ref<AuthorSummary[]>([])
const activeTab = ref<Tab>('mixes')
const loading = ref(true)
const followBusy = ref(false)

const newPlaylistTitle = ref('')
const creatingPlaylist = ref(false)

async function submitNewPlaylist() {
  const title = newPlaylistTitle.value.trim()
  if (!title || creatingPlaylist.value) return

  creatingPlaylist.value = true
  try {
    const playlist = await createPlaylist({ title })
    playlists.value.unshift(playlist)
    newPlaylistTitle.value = ''
  } finally {
    creatingPlaylist.value = false
  }
}

const avatarInput = ref<HTMLInputElement | null>(null)
const coverInput = ref<HTMLInputElement | null>(null)

const isOwnProfile = computed(() => authStore.user?.username === route.params.username)

async function loadProfile() {
  loading.value = true
  activeTab.value = 'mixes'
  try {
    const username = route.params.username as string
    const [
      { data: userData },
      { data: mixesData },
      { data: followersData },
      { data: followingData },
      playlistsData,
    ] = await Promise.all([
      apiClient.get<UserProfile>(`/users/${username}`),
      apiClient.get<{ items: Mix[] }>('/mixes', { params: { username, limit: 50 } }),
      apiClient.get<{ items: AuthorSummary[] }>(`/users/${username}/followers`, {
        params: { limit: 50 },
      }),
      apiClient.get<{ items: AuthorSummary[] }>(`/users/${username}/following`, {
        params: { limit: 50 },
      }),
      fetchUserPlaylists(username, { limit: 50 }),
    ])
    profile.value = userData
    mixes.value = mixesData.items
    followers.value = followersData.items
    following.value = followingData.items
    playlists.value = playlistsData.items
    if (authStore.user?.username === username) {
      const { data: favoritesData } = await apiClient.get<{ items: Mix[] }>('/mixes/me/favorites', {
        params: { limit: 50 },
      })
      favorites.value = favoritesData.items
    } else {
      favorites.value = []
    }
  } finally {
    loading.value = false
  }
}

async function onAvatarChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const formData = new FormData()
  formData.append('avatar', file)
  const { data } = await apiClient.post<UserProfile>('/users/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  profile.value = data
  if (authStore.user) authStore.user.avatarUrl = data.avatarUrl
}

async function onCoverChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const formData = new FormData()
  formData.append('cover', file)
  const { data } = await apiClient.post<UserProfile>('/users/me/cover', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  profile.value = data
}

async function toggleFollow() {
  if (!profile.value) return
  if (!authStore.isAuthenticated) {
    router.push({ name: 'login' })
    return
  }
  followBusy.value = true
  try {
    await toggleUserFollow(profile.value)
    // Keep the followers list in sync with the count shown next to it.
    if (authStore.user) {
      if (profile.value.isFollowing) {
        // A null username means no public profile yet, so this account cannot
        // actually be following anyone (the router guard blocks it beforehand);
        // guard anyway so the type holds honestly.
        if (authStore.user.username) {
          followers.value = [
            {
              id: authStore.user.id,
              username: authStore.user.username,
              displayName: authStore.user.displayName,
              avatarUrl: authStore.user.avatarUrl,
            },
            ...followers.value,
          ]
        }
      } else {
        followers.value = followers.value.filter((u) => u.id !== authStore.user!.id)
      }
    }
  } finally {
    followBusy.value = false
  }
}

/**
 * Le total d'heures cuisinées remplace les compteurs sociaux à zéro : sur un
 * profil neuf, « 0 abonné · 0 playlist » annonce surtout que le site est vide,
 * alors que « 4 mix · 6 h 12 » dit quelque chose de vrai dès le premier upload.
 * Null quand aucune durée n'est connue — la mention disparaît alors.
 */
const totalDuration = computed(() =>
  formatDuration(mixes.value.reduce((sum, mix) => sum + (mix.durationSec ?? 0), 0)),
)

/** Les tags les plus fréquents chez cette personne : « surtout italo disco et new-wave ». */
const signatureTags = computed(() => {
  const counts = new Map<string, number>()
  for (const mix of mixes.value) {
    for (const tag of mix.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([tag]) => tag)
})

watch(() => route.params.username, loadProfile)
onMounted(loadProfile)
</script>

<template>
  <div>
    <div v-if="loading" class="mx-auto max-w-6xl px-4 py-16 text-center text-tambouille-muted">
      Chargement...
    </div>

    <template v-else-if="profile">
      <!-- Bandeau court : c'est ici, et seulement ici, que le motif topographique
           survit. À 120 px il ne mange plus le premier écran, et les mix
           commencent au-dessus de la ligne de flottaison. -->
      <div class="relative h-[120px] overflow-hidden sm:h-[150px]">
        <img
          v-if="profile.coverUrl"
          :src="mediaUrl(profile.coverUrl)"
          class="h-full w-full object-cover"
          alt=""
        />
        <div v-else class="topo-band h-full w-full" />

        <button
          v-if="isOwnProfile"
          class="absolute bottom-3 right-4 flex items-center gap-1.5 bg-black/55 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.09em] text-white transition hover:bg-black sm:right-6"
          title="Changer la couverture"
          @click="coverInput?.click()"
        >
          Modifier la couverture
        </button>
        <input
          ref="coverInput"
          type="file"
          accept="image/*"
          class="hidden"
          @change="onCoverChange"
        />
      </div>

      <div class="mx-auto max-w-6xl px-4 pb-12">
        <div
          class="flex flex-col items-start gap-5 border-b-2 border-tambouille-rule pb-6 sm:flex-row sm:items-end sm:gap-7"
        >
          <div class="relative -mt-14 shrink-0 sm:-mt-[56px]">
            <img
              v-if="profile.avatarUrl"
              :src="mediaUrl(profile.avatarUrl)"
              class="h-[120px] w-[120px] border-4 border-white object-cover sm:h-[150px] sm:w-[150px]"
              alt=""
            />
            <div
              v-else
              class="flex h-[120px] w-[120px] items-center justify-center border-4 border-white bg-tambouille-surface-hover text-5xl font-bold sm:h-[150px] sm:w-[150px]"
              style="font-family: 'Gulax', sans-serif"
            >
              {{ profile.displayName[0]?.toUpperCase() }}
            </div>
            <button
              v-if="isOwnProfile"
              class="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center bg-tambouille-accent text-white hover:bg-tambouille-accent-hover"
              title="Changer la photo"
              @click="avatarInput?.click()"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4 fill-current">
                <path
                  d="M9 3l-1.83 2H4a2 2 0 00-2 2v11a2 2 0 002 2h16a2 2 0 002-2V7a2 2 0 00-2-2h-3.17L15 3H9zm3 15a5 5 0 110-10 5 5 0 010 10z"
                />
              </svg>
            </button>
            <input
              ref="avatarInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="onAvatarChange"
            />
          </div>

          <div class="min-w-0 flex-1 sm:pb-1.5">
            <h1 class="text-[clamp(1.75rem,4vw,2.5rem)] leading-none">{{ profile.displayName }}</h1>
            <p class="pt-2 text-[15px] text-tambouille-muted">
              {{ profile.mixesCount }} mix<template v-if="totalDuration">
                · {{ totalDuration }} de cuisine</template
              >
              <template v-if="signatureTags.length">
                · surtout {{ signatureTags.join(' et ') }}</template
              >
            </p>
          </div>

          <div class="flex shrink-0 flex-wrap gap-3 sm:pb-2">
            <RouterLink v-if="isOwnProfile" :to="{ name: 'settings' }" class="tb-btn-outline">
              Modifier le profil
            </RouterLink>
            <button
              v-else
              :disabled="followBusy"
              :class="profile.isFollowing ? 'tb-btn-outline' : 'tb-btn'"
              @click="toggleFollow"
            >
              {{ profile.isFollowing ? 'Abonné⋅e' : 'Suivre' }}
            </button>
          </div>
        </div>

        <div class="flex flex-wrap items-baseline gap-7 pt-4 text-[15px] text-tambouille-muted">
          <button
            class="pb-3 transition"
            :class="
              activeTab === 'mixes'
                ? 'border-b-[3px] border-tambouille-accent font-bold text-tambouille-text'
                : 'hover:text-tambouille-text'
            "
            @click="activeTab = 'mixes'"
          >
            Mix ({{ profile.mixesCount }})
          </button>
          <button
            v-if="isOwnProfile"
            class="pb-3 transition"
            :class="
              activeTab === 'favorites'
                ? 'border-b-[3px] border-tambouille-accent font-bold text-tambouille-text'
                : 'hover:text-tambouille-text'
            "
            @click="activeTab = 'favorites'"
          >
            Favoris ({{ favorites.length }})
          </button>
          <RouterLink
            :to="{ name: 'user-playlists', params: { username: profile.username } }"
            class="pb-3 hover:text-tambouille-text"
          >
            Playlists ({{ playlists.length }})
          </RouterLink>
        </div>

        <!-- Les mix passent à gauche, au-dessus de la ligne de flottaison ; la
             colonne de droite garde le texte de présentation et le réseau. -->
        <div class="grid gap-12 pt-6 lg:grid-cols-[1fr_320px]">
          <!-- min-w-0 : un élément de grille a `min-width: auto`, donc il refuse de
               descendre sous la taille min-content de son contenu, et la liste de
               mix en contient. Sans ça la colonne pousse la page en débordement
               horizontal sur mobile. -->
          <div class="min-w-0">
            <template v-if="activeTab === 'mixes'">
              <p v-if="mixes.length === 0" class="py-10 text-center text-tambouille-muted">
                Aucun mix pour l'instant.
              </p>
              <MixListItem v-for="mix in mixes" v-else :key="mix.id" :mix="mix" />
            </template>

            <template v-else-if="activeTab === 'favorites'">
              <p v-if="favorites.length === 0" class="py-10 text-center text-tambouille-muted">
                Aucun favori pour l'instant.
              </p>
              <MixListItem v-for="mix in favorites" v-else :key="mix.id" :mix="mix" />
            </template>
          </div>

          <aside class="min-w-0">
            <template v-if="profile.bio">
              <p class="tb-eyebrow">Sa cuisine</p>
              <p class="mb-8 mt-4 whitespace-pre-line text-sm leading-relaxed">{{ profile.bio }}</p>
            </template>
            <RouterLink
              v-else-if="isOwnProfile"
              :to="{ name: 'settings' }"
              class="mb-8 inline-block text-sm text-tambouille-accent hover:underline"
            >
              + Ajoute une description
            </RouterLink>

            <!-- Trois blocs « (0) » devenaient trois façons de dire que le profil
                 est vide. Une seule carte d'invitation les remplace. -->
            <div v-if="!followers.length" class="tb-panel-dark">
              <p class="text-lg font-bold" style="font-family: 'Gulax', sans-serif">
                Personne ne suit {{ profile.displayName }}
              </p>
              <p class="mb-4 mt-2.5 text-[13.5px] leading-relaxed text-neutral-400">
                Sois le premier, ou range ses mix dans une playlist à toi.
              </p>
              <div class="flex flex-wrap gap-2.5">
                <button v-if="!isOwnProfile" class="tb-btn tb-btn-sm" @click="toggleFollow">
                  Suivre
                </button>
                <RouterLink
                  :to="{ name: 'user-playlists', params: { username: profile.username } }"
                  class="tb-btn-sm border border-white text-white hover:bg-white hover:text-black"
                >
                  Voir les playlists
                </RouterLink>
              </div>
            </div>

            <template v-else>
              <AvatarStack
                title="Abonnés"
                :count="profile.followersCount"
                :users="followers"
                :see-all-to="{ name: 'user-followers', params: { username: profile.username } }"
                empty-label="Aucun abonné pour l’instant."
              />
              <div class="pt-8">
                <AvatarStack
                  title="Abonnements"
                  :count="profile.followingCount"
                  :users="following"
                  :see-all-to="{ name: 'user-following', params: { username: profile.username } }"
                  empty-label="Aucun abonnement pour l’instant."
                />
              </div>
            </template>

            <div class="pt-8">
              <p class="tb-eyebrow">Playlists</p>
              <form
                v-if="isOwnProfile"
                class="flex items-stretch pt-4"
                @submit.prevent="submitNewPlaylist"
              >
                <input
                  v-model="newPlaylistTitle"
                  type="text"
                  maxlength="120"
                  placeholder="Nouvelle playlist…"
                  class="tb-field min-w-0 flex-1 border-r-0"
                />
                <button
                  type="submit"
                  :disabled="creatingPlaylist || !newPlaylistTitle.trim()"
                  class="tb-btn shrink-0"
                >
                  {{ creatingPlaylist ? '…' : 'Créer' }}
                </button>
              </form>

              <p v-if="!playlists.length" class="pt-4 text-sm text-tambouille-muted">
                Aucune playlist pour l’instant.
              </p>
              <div v-else class="flex flex-wrap gap-4 pt-4">
                <PlaylistCard
                  v-for="playlist in playlists.slice(0, 4)"
                  :key="playlist.id"
                  :playlist="playlist"
                />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </template>
  </div>
</template>
