<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { mediaUrl } from '@/utils/media'
import { formatDate } from '@/utils/date'
import { playlistShareUrl } from '@/utils/share'
import {
  deletePlaylist,
  fetchPlaylist,
  removeMixFromPlaylist,
  updatePlaylist,
} from '@/utils/playlists'
import MixListItem from '@/components/MixListItem.vue'
import ShareButton from '@/components/ShareButton.vue'
import FeedLink from '@/components/FeedLink.vue'
import { feedUrl } from '@/utils/media'
import type { Playlist } from '@/types'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const playlist = ref<Playlist | null>(null)
const loading = ref(true)
const notFound = ref(false)
const deleting = ref(false)
const editing = ref(false)
const savingEdit = ref(false)
const editTitle = ref('')
const editDescription = ref('')

const isOwner = computed(() => !!playlist.value && authStore.user?.id === playlist.value.userId)

async function loadPlaylist() {
  loading.value = true
  notFound.value = false
  try {
    playlist.value = await fetchPlaylist(String(route.params.id))
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
}

function startEditing() {
  if (!playlist.value) return
  editTitle.value = playlist.value.title
  editDescription.value = playlist.value.description ?? ''
  editing.value = true
}

async function saveEdit() {
  if (!playlist.value) return
  const title = editTitle.value.trim()
  if (!title) return

  savingEdit.value = true
  try {
    const updated = await updatePlaylist(playlist.value.id, {
      title,
      description: editDescription.value.trim(),
    })
    playlist.value.title = updated.title
    playlist.value.description = updated.description
    editing.value = false
  } finally {
    savingEdit.value = false
  }
}

async function removeMix(mixId: string) {
  if (!playlist.value) return
  const removed = playlist.value.mixes.find((mix) => mix.id === mixId)
  if (!removed) return

  const index = playlist.value.mixes.indexOf(removed)
  playlist.value.mixes.splice(index, 1)
  playlist.value.mixesCount -= 1

  try {
    await removeMixFromPlaylist(playlist.value.id, mixId)
  } catch {
    playlist.value.mixes.splice(index, 0, removed)
    playlist.value.mixesCount += 1
  }
}

async function removePlaylist() {
  if (!playlist.value) return
  if (!confirm('Supprimer définitivement cette playlist ?')) return

  deleting.value = true
  try {
    await deletePlaylist(playlist.value.id)
    router.push({ name: 'profile', params: { username: playlist.value.user.username } })
  } finally {
    deleting.value = false
  }
}

onMounted(loadPlaylist)
watch(() => route.params.id, loadPlaylist)
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8">
    <div v-if="loading" class="py-16 text-center text-tambouille-muted">Chargement...</div>

    <div v-else-if="notFound" class="py-16 text-center text-tambouille-muted">
      Cette playlist n'existe pas.
    </div>

    <template v-else-if="playlist">
      <div class="flex flex-col gap-6 sm:flex-row">
        <div class="mx-auto w-48 shrink-0 sm:mx-0">
          <div
            class="grid aspect-square w-full overflow-hidden rounded-none bg-tambouille-surface-hover"
            :class="playlist.coverUrls.length > 1 ? 'grid-cols-2 grid-rows-2 gap-0.5' : ''"
          >
            <template v-if="playlist.coverUrls.length">
              <img
                v-for="url in playlist.coverUrls"
                :key="url"
                :src="mediaUrl(url)"
                class="h-full w-full object-cover"
                alt=""
              />
            </template>
            <div
              v-else
              class="flex h-full w-full items-center justify-center text-tambouille-muted"
            >
              <svg viewBox="0 0 24 24" class="h-16 w-16 fill-current opacity-40">
                <path
                  d="M14 10H3v2h11v-2zm0-4H3v2h11V6zM3 16h7v-2H3v2zm13-6v4h-4v2h4v4h2v-4h4v-2h-4v-4h-2z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div class="min-w-0 flex-1">
          <form v-if="editing" class="flex flex-col gap-2" @submit.prevent="saveEdit">
            <input
              v-model="editTitle"
              type="text"
              maxlength="120"
              class="w-full tb-field text-xl font-bold"
            />
            <textarea
              v-model="editDescription"
              rows="3"
              maxlength="2000"
              placeholder="Description..."
              class="w-full tb-field text-sm"
            />
            <div class="flex items-center gap-3">
              <button type="submit" :disabled="savingEdit || !editTitle.trim()" class="tb-btn">
                {{ savingEdit ? 'Enregistrement...' : 'Enregistrer' }}
              </button>
              <button
                type="button"
                class="text-sm text-tambouille-muted hover:underline"
                @click="editing = false"
              >
                Annuler
              </button>
            </div>
          </form>

          <template v-else>
            <p class="text-xs uppercase tracking-wide text-tambouille-muted">Playlist</p>
            <h1 class="text-2xl font-bold">{{ playlist.title }}</h1>
            <RouterLink
              :to="{ name: 'profile', params: { username: playlist.user.username } }"
              class="text-tambouille-muted hover:underline"
            >
              {{ playlist.user.displayName }}
            </RouterLink>

            <div class="mt-4 flex flex-wrap items-center gap-3">
              <span class="text-sm text-tambouille-muted">
                {{ playlist.mixesCount }} {{ playlist.mixesCount > 1 ? 'mixs' : 'mix' }}
              </span>
              <ShareButton :url="playlistShareUrl(playlist.id)" />
              <FeedLink :href="feedUrl(`/playlists/${playlist.id}/rss`)" :title="playlist.title" />
            </div>

            <p
              v-if="playlist.description"
              class="mt-4 whitespace-pre-line text-sm text-tambouille-text/90"
            >
              {{ playlist.description }}
            </p>

            <p class="mt-4 text-xs text-tambouille-muted">
              Créée le {{ formatDate(playlist.createdAt) }}
            </p>

            <div v-if="isOwner" class="mt-6 flex items-center gap-4">
              <button class="text-sm text-tambouille-muted hover:underline" @click="startEditing">
                Modifier cette playlist
              </button>
              <button
                :disabled="deleting"
                class="text-sm text-red-400 hover:underline disabled:opacity-50"
                @click="removePlaylist"
              >
                Supprimer cette playlist
              </button>
            </div>
          </template>
        </div>
      </div>

      <div class="mt-10">
        <p
          v-if="!playlist.mixes.length"
          class="rounded-none border border-tambouille-border p-8 text-center text-sm text-tambouille-muted"
        >
          Cette playlist est vide.
          <template v-if="isOwner">
            Ajoutez-y des mixs depuis leur page ou depuis les cartes de la page d'accueil.
          </template>
        </p>

        <ul v-else class="flex flex-col gap-3">
          <li v-for="mix in playlist.mixes" :key="mix.id" class="flex items-center gap-2">
            <MixListItem :mix="mix" class="min-w-0 flex-1" />
            <button
              v-if="isOwner"
              class="shrink-0 rounded-none p-2 text-tambouille-muted transition hover:bg-tambouille-surface-hover hover:text-red-400"
              title="Retirer de la playlist"
              aria-label="Retirer de la playlist"
              @click="removeMix(mix.id)"
            >
              <svg viewBox="0 0 24 24" class="h-5 w-5 fill-current">
                <path d="M19 13H5v-2h14v2z" />
              </svg>
            </button>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>
