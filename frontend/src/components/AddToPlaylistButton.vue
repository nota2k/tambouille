<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  createPlaylist,
  fetchMyPlaylists,
  toggleMixInPlaylist,
  addMixToPlaylist,
} from '@/utils/playlists'
import type { PlaylistSummary } from '@/types'

const props = withDefaults(
  defineProps<{
    mixId: string
    variant?: 'overlay' | 'pill'
    /**
     * De quel bord le menu part.
     *
     * Il fait 256 pixels de large : posé près du bord droit d'une ligne, un
     * menu aligné à gauche sortirait de l'écran. L'appelant est le seul à
     * savoir où il a mis le bouton, donc c'est lui qui tranche.
     *
     * Par défaut il suit la variante : `overlay` vit dans le coin haut droit
     * d'une carte, donc à droite ; `pill` en début de ligne, donc à gauche.
     */
    align?: 'left' | 'right'
  }>(),
  { variant: 'pill', align: undefined },
)

const alignement = computed(() => props.align ?? (props.variant === 'overlay' ? 'right' : 'left'))

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
  <!--
    `relative` dans les deux variantes, désormais.
    ───────────────────────────────────────────────────────────────────────
    En `overlay`, le bouton se posait lui-même en `absolute right-2 top-11` et
    son menu en `right-2 top-20`, deux coordonnées mesurées à la main sur la
    carte. Le bouton fait maintenant partie d'un groupe que l'appelant place
    (voir `MixCard`), donc ces valeurs ne veulent plus rien dire.

    En rendant l'enveloppe positionnée, le menu s'accroche AU BOUTON — `top-full`
    — et suit où qu'on mette le groupe. Rien à recalculer si la colonne bouge.
  -->
  <div ref="root" class="relative">
    <button
      ref="trigger"
      :class="
        variant === 'overlay'
          ? 'flex h-8 w-8 shrink-0 items-center justify-center bg-black/60 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/80'
          : 'tb-btn-outline tb-btn-icone rounded-full'
      "
      :aria-expanded="open"
      aria-haspopup="true"
      title="Ajouter à une playlist"
      aria-label="Ajouter à une playlist"
      @click="toggleMenu"
    >
      <!-- Deux pixels de plus que le cœur et le partage, qui sont à 18 : ce
           dessin est fait de trois filets fins et d'une croix, là où les deux
           autres sont des formes pleines. À taille égale il paraissait plus
           petit qu'eux. La boîte du bouton, elle, ne bouge pas — voir
           `.tb-btn-icone`. -->
      <svg viewBox="0 0 24 24" class="h-5 w-5 fill-current">
        <path
          d="M14 10H3v2h11v-2zm0-4H3v2h11V6zM3 16h7v-2H3v2zm13-6v4h-4v2h4v4h2v-4h4v-2h-4v-4h-2z"
        />
      </svg>
    </button>

    <div
      v-if="open"
      class="absolute top-full z-30 mt-2 w-64 overflow-hidden rounded-none border border-tambouille-border bg-tambouille-surface shadow-lg"
      :class="alignement === 'right' ? 'right-0' : 'left-0'"
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
              class="flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition hover:bg-tambouille-surface-hover rounded-xl"
              @click="toggle(playlist)"
            >
              <span
                class="flex h-4 w-4 shrink-0 items-center justify-center rounded-none border"
                :class="
                  playlist.containsMix
                    ? 'border-tambouille-accent bg-tambouille-accent text-tambouille-ink-on-accent'
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
