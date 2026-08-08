<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { mediaUrl } from '@/utils/media'
import { toggleUserFollow } from '@/utils/follows'
import MixListItem from '@/components/MixListItem.vue'
import PlaylistCard from '@/components/PlaylistCard.vue'
import AvatarStack from '@/components/AvatarStack.vue'
import { createPlaylist, fetchUserPlaylists } from '@/utils/playlists'
import topographyPattern from '@/assets/img/topography.svg'
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

const editing = ref(false)
const editDisplayName = ref('')
const editBio = ref('')
const savingProfile = ref(false)
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
      apiClient.get<{ items: AuthorSummary[] }>(`/users/${username}/followers`, { params: { limit: 50 } }),
      apiClient.get<{ items: AuthorSummary[] }>(`/users/${username}/following`, { params: { limit: 50 } }),
      fetchUserPlaylists(username, { limit: 50 }),
    ])
    profile.value = userData
    mixes.value = mixesData.items
    followers.value = followersData.items
    following.value = followingData.items
    playlists.value = playlistsData.items
    editDisplayName.value = userData.displayName
    editBio.value = userData.bio ?? ''

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

async function saveProfile() {
  savingProfile.value = true
  try {
    const { data } = await apiClient.patch<UserProfile>('/users/me', {
      displayName: editDisplayName.value,
      bio: editBio.value,
    })
    profile.value = data
    if (authStore.user) {
      authStore.user.displayName = data.displayName
      authStore.user.bio = data.bio
    }
    editing.value = false
  } finally {
    savingProfile.value = false
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

watch(() => route.params.username, loadProfile)
onMounted(loadProfile)
</script>

<template>
  <div>
    <div v-if="loading" class="mx-auto max-w-6xl px-4 py-16 text-center text-tambouille-muted">Chargement...</div>

    <template v-else-if="profile">
      <div class="relative h-40 overflow-hidden sm:h-52 md:h-60">
        <img
          v-if="profile.coverUrl"
          :src="mediaUrl(profile.coverUrl)"
          class="h-full w-full object-cover"
          alt=""
        />
        <div
          v-else
          class="h-full w-full bg-tambouille-bg-vector"
          :style="{
            backgroundImage: `url(${topographyPattern})`,
            backgroundSize: '600px',
          }"
        />
        <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-white/40 to-transparent" />

        <button
          v-if="isOwnProfile"
          class="absolute bottom-3 right-4 flex items-center gap-1.5 rounded-full border border-white/60 bg-black/30 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-black/45 sm:right-6"
          title="Changer la couverture"
          @click="coverInput?.click()"
        >
          <svg viewBox="0 0 24 24" class="h-3.5 w-3.5 fill-current">
            <path
              d="M9 3l-1.83 2H4a2 2 0 00-2 2v11a2 2 0 002 2h16a2 2 0 002-2V7a2 2 0 00-2-2h-3.17L15 3H9zm3 15a5 5 0 110-10 5 5 0 010 10z"
            />
          </svg>
          Modifier la couverture
        </button>
        <input ref="coverInput" type="file" accept="image/*" class="hidden" @change="onCoverChange" />
      </div>

      <div class="mx-auto max-w-6xl px-4 pb-8">
        <div class="mb-8 flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:gap-6">
          <div class="relative -mt-12 shrink-0 sm:-mt-14">
            <img
              v-if="profile.avatarUrl"
              :src="mediaUrl(profile.avatarUrl)"
              class="h-24 w-24 rounded-full border-4 border-white object-cover shadow-md sm:h-28 sm:w-28"
              alt=""
            />
            <div
              v-else
              class="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-tambouille-surface-hover text-2xl font-bold shadow-md sm:h-28 sm:w-28"
            >
              {{ profile.displayName[0]?.toUpperCase() }}
            </div>
            <button
              v-if="isOwnProfile"
              class="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-tambouille-accent text-white shadow hover:bg-tambouille-accent-hover"
              title="Changer la photo"
              @click="avatarInput?.click()"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4 fill-current">
                <path
                  d="M9 3l-1.83 2H4a2 2 0 00-2 2v11a2 2 0 002 2h16a2 2 0 002-2V7a2 2 0 00-2-2h-3.17L15 3H9zm3 15a5 5 0 110-10 5 5 0 010 10z"
                />
              </svg>
            </button>
            <input ref="avatarInput" type="file" accept="image/*" class="hidden" @change="onAvatarChange" />
          </div>

          <div class="flex-1 text-center sm:pb-1 sm:text-left">
          <template v-if="!editing">
            <h1 class="text-2xl font-bold">{{ profile.displayName }}</h1>
            <p class="text-tambouille-muted">@{{ profile.username }}</p>
            <p v-if="profile.bio" class="mt-2 whitespace-pre-line text-sm">{{ profile.bio }}</p>
            <!-- Nudge the owner to fill it in; visitors just see nothing. -->
            <button
              v-else-if="isOwnProfile"
              class="mt-2 text-sm text-tambouille-muted hover:text-tambouille-accent hover:underline"
              @click="editing = true"
            >
              + Ajoutez une description
            </button>

            <div class="mt-2 flex justify-center gap-4 text-xs text-tambouille-muted sm:justify-start">
              <span>{{ profile.mixesCount }} mixs</span>
              <RouterLink
                :to="{ name: 'user-followers', params: { username: profile.username } }"
                class="hover:text-tambouille-text hover:underline"
              >
                {{ profile.followersCount }} abonnés
              </RouterLink>
              <RouterLink
                :to="{ name: 'user-following', params: { username: profile.username } }"
                class="hover:text-tambouille-text hover:underline"
              >
                {{ profile.followingCount }} abonnements
              </RouterLink>
            </div>

            <button
              v-if="isOwnProfile"
              class="mt-3 rounded-full border border-tambouille-border px-4 py-1.5 text-sm hover:bg-tambouille-surface-hover"
              @click="editing = true"
            >
              Modifier le profil
            </button>
            <button
              v-else
              :disabled="followBusy"
              class="mt-3 rounded-full px-4 py-1.5 text-sm font-semibold transition disabled:opacity-50"
              :class="
                profile.isFollowing
                  ? 'border border-tambouille-border hover:bg-tambouille-surface-hover'
                  : 'bg-tambouille-accent text-white hover:bg-tambouille-accent-hover'
              "
              @click="toggleFollow"
            >
              {{ profile.isFollowing ? 'Abonné' : "S'abonner" }}
            </button>
          </template>

          <form v-else class="mx-auto max-w-md space-y-3 sm:mx-0" @submit.prevent="saveProfile">
            <label class="block text-left">
              <span class="mb-1 block text-xs font-medium uppercase tracking-wide text-tambouille-muted">
                Nom affiché
              </span>
              <input
                v-model="editDisplayName"
                type="text"
                maxlength="50"
                class="w-full rounded-lg border border-tambouille-border bg-tambouille-surface px-3 py-2 outline-none focus:border-tambouille-accent"
              />
            </label>
            <label class="block text-left">
              <span class="mb-1 block text-xs font-medium uppercase tracking-wide text-tambouille-muted">
                Description
              </span>
              <textarea
                v-model="editBio"
                rows="5"
                maxlength="280"
                placeholder="Présentez-vous, votre style, vos résidences..."
                class="w-full rounded-lg border border-tambouille-border bg-tambouille-surface px-3 py-2 outline-none focus:border-tambouille-accent"
              />
              <span class="mt-1 block text-right text-xs text-tambouille-muted">
                {{ editBio.length }}/280
              </span>
            </label>
            <div class="flex gap-2">
              <button
                type="submit"
                :disabled="savingProfile"
                class="rounded-full bg-tambouille-accent px-4 py-1.5 text-sm font-semibold text-white hover:bg-tambouille-accent-hover disabled:opacity-50"
              >
                Enregistrer
              </button>
              <button
                type="button"
                class="rounded-full border border-tambouille-border px-4 py-1.5 text-sm hover:bg-tambouille-surface-hover"
                @click="editing = false"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Réseau et playlists en colonne latérale, mixs à droite. -->
      <div class="grid items-start gap-10 lg:grid-cols-3">
        <aside class="space-y-8">
          <AvatarStack
            title="Abonnés"
            :count="profile.followersCount"
            :users="followers"
            :see-all-to="{ name: 'user-followers', params: { username: profile.username } }"
            empty-label="Aucun abonné pour l’instant."
          />
          <AvatarStack
            title="Abonnements"
            :count="profile.followingCount"
            :users="following"
            :see-all-to="{ name: 'user-following', params: { username: profile.username } }"
            empty-label="Aucun abonnement pour l’instant."
          />

          <section>
          <div class="mb-3 flex items-baseline justify-between gap-4">
            <h2 class="text-xl font-semibold">Playlists ({{ playlists.length }})</h2>
            <RouterLink
              v-if="playlists.length"
              :to="{ name: 'user-playlists', params: { username: profile.username } }"
              class="shrink-0 text-sm text-tambouille-muted hover:underline"
            >
              Voir tout
            </RouterLink>
          </div>

          <form v-if="isOwnProfile" class="mb-4 flex items-center gap-3" @submit.prevent="submitNewPlaylist">
            <input
              v-model="newPlaylistTitle"
              type="text"
              maxlength="120"
              placeholder="Nom de la nouvelle playlist..."
              class="min-w-0 flex-1 rounded-full border border-tambouille-border bg-transparent px-4 py-2 text-sm outline-none focus:border-tambouille-accent"
            />
            <button
              type="submit"
              :disabled="creatingPlaylist || !newPlaylistTitle.trim()"
              class="shrink-0 rounded-full bg-tambouille-accent px-5 py-2 text-sm font-semibold text-white hover:bg-tambouille-accent-hover disabled:opacity-50"
            >
              {{ creatingPlaylist ? 'Création...' : 'Créer' }}
            </button>
          </form>

            <p v-if="!playlists.length" class="text-sm text-tambouille-muted">Aucune playlist pour l’instant.</p>
            <div v-else class="flex flex-wrap gap-4">
              <PlaylistCard v-for="playlist in playlists.slice(0, 4)" :key="playlist.id" :playlist="playlist" />
            </div>
          </section>
        </aside>

        <div class="lg:col-span-2">
          <div class="mb-4 flex items-center gap-4 border-b border-tambouille-border">
            <button
              class="border-b-2 pb-2 text-sm font-medium transition"
              :class="
                activeTab === 'mixes'
                  ? 'border-tambouille-accent text-tambouille-text'
                  : 'border-transparent text-tambouille-muted hover:text-tambouille-text'
              "
              @click="activeTab = 'mixes'"
            >
              Mixs
            </button>
            <button
              v-if="isOwnProfile"
              class="border-b-2 pb-2 text-sm font-medium transition"
              :class="
                activeTab === 'favorites'
                  ? 'border-tambouille-accent text-tambouille-text'
                  : 'border-transparent text-tambouille-muted hover:text-tambouille-text'
              "
              @click="activeTab = 'favorites'"
            >
              Favoris
            </button>
          </div>

          <template v-if="activeTab === 'mixes'">
            <div v-if="mixes.length === 0" class="py-8 text-center text-tambouille-muted">Aucun mix pour l'instant.</div>
            <div v-else class="space-y-3">
              <MixListItem v-for="mix in mixes" :key="mix.id" :mix="mix" />
            </div>
          </template>

          <template v-else-if="activeTab === 'favorites'">
            <div v-if="favorites.length === 0" class="py-8 text-center text-tambouille-muted">Aucun favori pour l'instant.</div>
            <div v-else class="space-y-3">
              <MixListItem v-for="mix in favorites" :key="mix.id" :mix="mix" />
            </div>
          </template>
        </div>
      </div>
      </div>
    </template>
  </div>
</template>
