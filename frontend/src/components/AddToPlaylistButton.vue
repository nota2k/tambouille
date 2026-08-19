<script setup lang="ts">
import { nextTick, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  createPlaylist,
  fetchMyPlaylists,
  toggleMixInPlaylist,
  addMixToPlaylist,
} from '@/utils/playlists'
import type { PlaylistSummary } from '@/types'

const props = withDefaults(defineProps<{ mixId: string; variant?: 'overlay' | 'pill' }>(), {
  variant: 'pill',
})

const router = useRouter()
const authStore = useAuthStore()

const open = ref(false)
const loading = ref(false)
const failed = ref(false)
const playlists = ref<PlaylistSummary[]>([])
const newTitle = ref('')
const creating = ref(false)

const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const newTitleInput = ref<HTMLInputElement | null>(null)

async function toggleMenu(event: Event) {
  // The card wraps this button in a RouterLink.
  event.preventDefault()
  event.stopPropagation()

  if (!authStore.isAuthenticated) {
    router.push({ name: 'login' })
    return
  }

  if (open.value) {
    closeMenu()
    return
  }

  open.value = true
  document.addEventListener('mousedown', onOutsideClick)
  document.addEventListener('keydown', onKeydown)
  await loadPlaylists()
}

function closeMenu(returnFocus = false) {
  open.value = false
  newTitle.value = ''
  document.removeEventListener('mousedown', onOutsideClick)
  document.removeEventListener('keydown', onKeydown)
  if (returnFocus) trigger.value?.focus()
}

function onOutsideClick(event: MouseEvent) {
  if (!root.value?.contains(event.target as Node)) closeMenu()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    closeMenu(true)
  }
}

async function loadPlaylists() {
  loading.value = true
  failed.value = false
  try {
    playlists.value = await fetchMyPlaylists(props.mixId)
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

async function toggle(playlist: PlaylistSummary) {
  try {
    await toggleMixInPlaylist(playlist, props.mixId)
  } catch {
    failed.value = true
  }
}

async function submitNewPlaylist() {
  const title = newTitle.value.trim()
  if (!title || creating.value) return

  creating.value = true
  failed.value = false
  try {
    const playlist = await createPlaylist({ title })
    await addMixToPlaylist(playlist.id, props.mixId)
    playlists.value.unshift({ ...playlist, mixesCount: 1, containsMix: true })
    newTitle.value = ''
    await nextTick()
    newTitleInput.value?.focus()
  } catch {
    failed.value = true
  } finally {
    creating.value = false
  }
}

onUnmounted(() => {
  document.removeEventListener('mousedown', onOutsideClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <!-- In overlay mode the card itself is the positioning context, so this wrapper
       must not create a box of its own. -->
  <div ref="root" :class="variant === 'overlay' ? 'contents' : 'relative'">
    <button
      ref="trigger"
      :class="
        variant === 'overlay'
          ? 'absolute right-2 top-11 flex h-8 w-8 items-center justify-center rounded-none bg-black/60 text-white opacity-0 shadow-lg backdrop-blur-sm transition group-hover:opacity-100 hover:bg-black/80 focus-visible:opacity-100'
          : 'flex items-center gap-1.5 tb-btn-outline tb-btn-sm'
      "
      :aria-expanded="open"
      aria-haspopup="true"
      title="Ajouter à une playlist"
      aria-label="Ajouter à une playlist"
      @click="toggleMenu"
    >
      <svg viewBox="0 0 24 24" class="h-10 w-10 fill-current">
        <path
          d="M14 10H3v2h11v-2zm0-4H3v2h11V6zM3 16h7v-2H3v2zm13-6v4h-4v2h4v4h2v-4h4v-2h-4v-4h-2z"
        />
      </svg>
      <span v-if="variant === 'pill'">Ajouter à une playlist</span>
    </button>

    <div
      v-if="open"
      class="absolute z-30 mt-2 w-64 overflow-hidden rounded-none border border-tambouille-border bg-tambouille-surface shadow-lg"
      :class="variant === 'overlay' ? 'right-2 top-20' : 'left-0 top-full'"
      @click.stop
    >
      <p v-if="loading" class="px-4 py-3 text-sm text-tambouille-muted">Chargement...</p>

      <p v-else-if="failed" class="px-4 py-3 text-sm text-tambouille-muted">
        Une erreur est survenue.
        <button class="text-tambouille-accent hover:underline" @click="loadPlaylists">
          Réessayer
        </button>
      </p>

      <template v-else>
        <p v-if="!playlists.length" class="px-4 pt-3 text-sm text-tambouille-muted">
          Aucune playlist pour l'instant.
        </p>

        <ul v-else class="max-h-56 overflow-y-auto">
          <li v-for="playlist in playlists" :key="playlist.id">
            <button
              class="flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition hover:bg-tambouille-surface-hover"
              @click="toggle(playlist)"
            >
              <span
                class="flex h-4 w-4 shrink-0 items-center justify-center rounded-none border"
                :class="
                  playlist.containsMix
                    ? 'border-tambouille-accent bg-tambouille-accent text-white'
                    : 'border-tambouille-border'
                "
              >
                <svg v-if="playlist.containsMix" viewBox="0 0 24 24" class="h-3 w-3 fill-current">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </span>
              <span class="min-w-0 flex-1 truncate">{{ playlist.title }}</span>
              <span class="shrink-0 text-lg text-tambouille-muted">{{ playlist.mixesCount }}</span>
            </button>
          </li>
        </ul>

        <form class="border-t border-tambouille-border p-2" @submit.prevent="submitNewPlaylist">
          <input
            ref="newTitleInput"
            v-model="newTitle"
            type="text"
            maxlength="120"
            placeholder="Nouvelle playlist..."
            class="w-full tb-field text-sm"
          />
          <button
            v-if="newTitle.trim()"
            type="submit"
            :disabled="creating"
            class="mt-2 w-full tb-btn"
          >
            {{ creating ? 'Création...' : 'Créer et ajouter' }}
          </button>
        </form>
      </template>
    </div>
  </div>
</template>
