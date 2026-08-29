<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { fetchPlaylist } from '@/utils/playlists'
import { mixCredit } from '@/composables/useMixCredit'
import { mediaUrl } from '@/utils/media'
import { formatDuration } from '@/utils/time'
import { useSeo } from '@/composables/useSeo'
import type { Mix, Playlist } from '@/types'

/**
 * Une playlist telle qu'elle s'affiche chez quelqu'un d'autre.
 *
 * Même principe que `EmbedMixView` : la lecture appartient entièrement à
 * `PlayerBar`, cette vue ne fait que désigner le morceau courant. La liste
 * défile à l'intérieur du cadre — l'hôte fixe une hauteur une fois pour toutes
 * et une playlist de quarante mix ne doit pas la faire déborder.
 */

const route = useRoute()
const playerStore = usePlayerStore()

const playlist = ref<Playlist | null>(null)
const loading = ref(true)
const introuvable = ref(false)

async function charger() {
  loading.value = true
  introuvable.value = false
  try {
    const data = await fetchPlaylist(String(route.params.id))
    playlist.value = data
    // Le premier mix est posé sans être lancé : le lecteur s'affiche prêt,
    // et le clic choisit ensuite. Voir `load` dans le magasin.
    const premier = data.mixes[0]
    if (premier) playerStore.load(premier)
  } catch {
    introuvable.value = true
  } finally {
    loading.value = false
  }
}

watch(() => route.params.id, charger, { immediate: true })

function lire(mix: Mix) {
  playerStore.play(mix)
}

// Voir `EmbedMixView` : l'intégration ne doit pas concurrencer dans l'index la
// page de la playlist, dont elle reprend le contenu.
useSeo(() => ({ noindex: true, title: playlist.value?.title ?? 'Lecteur' }))
</script>

<template>
  <div class="flex h-full flex-col bg-tambouille-bg">
    <p v-if="loading" class="px-4 py-6 text-sm text-tambouille-muted">Chargement…</p>

    <p v-else-if="introuvable || !playlist" class="px-4 py-6 text-sm text-tambouille-muted">
      Cette playlist n'est plus disponible.
      <a href="/" target="_blank" rel="noopener" class="text-tambouille-accent hover:underline">
        Aller sur Tambouille
      </a>
    </p>

    <template v-else>
      <!-- L'en-tête ne défile pas : il porte le titre et le lien de retour, qui
           doivent rester visibles quelle que soit la position dans la liste. -->
      <header class="flex shrink-0 items-center gap-3 border-b border-tambouille-border px-4 py-3">
        <img
          v-if="playlist.coverUrls[0]"
          :src="mediaUrl(playlist.coverUrls[0])"
          decoding="async"
          class="h-10 w-10 shrink-0 object-cover"
          alt=""
        />
        <div v-else class="h-10 w-10 shrink-0 bg-tambouille-border"></div>

        <div class="min-w-0 flex-1">
          <RouterLink
            :to="{ name: 'playlist-detail', params: { id: playlist.id } }"
            target="_blank"
            rel="noopener"
            class="block truncate font-display text-sm font-bold leading-tight hover:underline"
          >
            {{ playlist.title }}
          </RouterLink>
          <p class="truncate text-xs text-tambouille-muted">
            {{ playlist.user.displayName }} · {{ playlist.mixesCount }} mix
          </p>
        </div>

        <RouterLink
          :to="{ name: 'discover' }"
          target="_blank"
          rel="noopener"
          class="shrink-0 font-wordmark text-xs uppercase tracking-wide text-tambouille-accent hover:underline"
        >
          Tambouille
        </RouterLink>
      </header>

      <p v-if="!playlist.mixes.length" class="px-4 py-6 text-sm text-tambouille-muted">
        Cette playlist est vide.
      </p>

      <ul v-else class="min-h-0 flex-1 overflow-y-auto">
        <li v-for="(mix, index) in playlist.mixes" :key="mix.id">
          <button
            type="button"
            class="flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition hover:bg-tambouille-surface-hover"
            :class="playerStore.currentMix?.id === mix.id ? 'bg-tambouille-surface-hover' : ''"
            @click="lire(mix)"
          >
            <span
              class="w-5 shrink-0 text-right text-xs tabular-nums"
              :class="
                playerStore.currentMix?.id === mix.id
                  ? 'text-tambouille-accent'
                  : 'text-tambouille-muted'
              "
            >
              {{ index + 1 }}
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate font-display font-bold leading-tight">
                {{ mix.title }}
              </span>
              <span class="block truncate text-xs text-tambouille-muted">
                {{ mixCredit(mix).primary }}
              </span>
            </span>
            <span
              v-if="mix.durationSec"
              class="shrink-0 text-xs text-tambouille-muted tabular-nums"
            >
              {{ formatDuration(mix.durationSec) }}
            </span>
          </button>
        </li>
      </ul>
    </template>
  </div>
</template>
