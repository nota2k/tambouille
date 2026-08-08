<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { apiClient } from '@/api/client'
import { mediaUrl } from '@/utils/media'
import { formatTime } from '@/utils/time'

const playerStore = usePlayerStore()
const audioEl = ref<HTMLAudioElement | null>(null)
const duration = ref(0)

const currentTrack = computed(() => {
  const tracklist = playerStore.currentMix?.tracklist
  if (!tracklist || tracklist.length === 0) return null

  let active = null
  for (const entry of tracklist) {
    if (entry.timecodeSec <= playerStore.currentTime) {
      active = entry
    } else {
      break
    }
  }
  return active
})

function applyPendingSeek() {
  if (playerStore.pendingSeekSec == null || !audioEl.value) return
  audioEl.value.currentTime = playerStore.pendingSeekSec
  playerStore.setCurrentTime(playerStore.pendingSeekSec)
  playerStore.clearPendingSeek()
}

watch(
  () => playerStore.currentMix?.id,
  () => {
    duration.value = 0
    if (playerStore.currentMix) {
      apiClient.post(`/mixes/${playerStore.currentMix.id}/play`).catch(() => {})
    }
  },
)

watch(
  () => playerStore.pendingSeekSec,
  (seconds) => {
    if (seconds == null) return
    // If the audio element already has metadata for the current src, seek right away;
    // otherwise wait for `onLoadedMetadata` (e.g. when switching to a different mix).
    if (audioEl.value && audioEl.value.readyState >= 1) {
      applyPendingSeek()
    }
  },
)

watch(
  () => playerStore.isPlaying,
  (isPlaying) => {
    if (!audioEl.value) return
    if (isPlaying) {
      audioEl.value.play().catch(() => {})
    } else {
      audioEl.value.pause()
    }
  },
)

function onTimeUpdate() {
  if (audioEl.value) playerStore.setCurrentTime(audioEl.value.currentTime)
}

function onLoadedMetadata() {
  if (!audioEl.value) return
  duration.value = audioEl.value.duration
  playerStore.setDuration(audioEl.value.duration)
  applyPendingSeek()
}

function onSeek(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  if (audioEl.value) {
    audioEl.value.currentTime = value
    playerStore.setCurrentTime(value)
  }
}

function onEnded() {
  playerStore.pause()
}
</script>

<template>
  <div
    v-if="playerStore.currentMix"
    class="fixed inset-x-0 bottom-0 z-40 border-t border-tambouille-text-black bg-tambouille-action"
  >
    <audio
      ref="audioEl"
      :src="mediaUrl(playerStore.currentMix.audioUrl)"
      autoplay
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoadedMetadata"
      @ended="onEnded"
    />

    <div class="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
      <img
        v-if="playerStore.currentMix.coverUrl"
        :src="mediaUrl(playerStore.currentMix.coverUrl)"
        class="h-12 w-12 shrink-0 rounded object-cover"
        alt=""
      />
      <div v-else class="h-12 w-12 shrink-0 rounded bg-tambouille-surface-hover"></div>

      <button
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tambouille-action-hover text-tambouille-text-black hover:bg-tambouille-accent-hover"
        @click="playerStore.toggle()"
      >
        <svg v-if="!playerStore.isPlaying" viewBox="0 0 24 24" class="ml-0.5 h-5 w-5 fill-current">
          <path d="M8 5v14l11-7z" />
        </svg>
        <svg v-else viewBox="0 0 24 24" class="h-5 w-5 fill-current">
          <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
        </svg>
      </button>

      <div class="min-w-0 flex-1">
        <div class="flex items-baseline justify-between gap-2 text-tambouille-text-black">
          <RouterLink
            :to="{ name: 'mix-detail', params: { id: playerStore.currentMix.id } }"
            class="truncate text-sm font-semibold hover:underline"
          >
            {{ playerStore.currentMix.title }}
          </RouterLink>
          <span class="shrink-0 text-xs text-tambouille-text-black">
            {{ formatTime(playerStore.currentTime) }} / {{ formatTime(duration) }}
          </span>
        </div>

        <div class="flex items-baseline gap-1.5 truncate text-xs">
          <RouterLink
            :to="{ name: 'profile', params: { username: playerStore.currentMix.user.username } }"
            class="shrink-0 text-tambouille-text-black hover:underline"
          >
            {{ playerStore.currentMix.user.displayName }}
          </RouterLink>
          <template v-if="currentTrack">
            <span class="text-tambouille-text-black">·</span>
            <span class="truncate text-tambouille-text-black">
              {{ currentTrack.artist }} – {{ currentTrack.title }}
            </span>
          </template>
        </div>

        <input
          type="range"
          class="mt-1 h-1 w-full cursor-pointer accent-tambouille-text-black"
          min="0"
          :max="duration || 0"
          :value="playerStore.currentTime"
          @input="onSeek"
        />
      </div>
    </div>
  </div>
</template>
