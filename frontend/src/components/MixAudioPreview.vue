<script setup lang="ts">
import { ref, watch } from 'vue'
import { formatTime } from '@/utils/time'

const props = defineProps<{ src: string | null }>()
const emit = defineEmits<{ capture: [seconds: number] }>()

const audioEl = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)

watch(
  () => props.src,
  () => {
    isPlaying.value = false
    currentTime.value = 0
    duration.value = 0
  },
)

function toggle() {
  if (!audioEl.value) return
  if (isPlaying.value) {
    audioEl.value.pause()
  } else {
    audioEl.value.play().catch(() => {})
  }
}

function skip(deltaSeconds: number) {
  if (!audioEl.value) return
  audioEl.value.currentTime = Math.max(
    0,
    Math.min(duration.value || Infinity, audioEl.value.currentTime + deltaSeconds),
  )
}

function onSeek(event: Event) {
  const value = Number((event.target as HTMLInputElement).value)
  if (audioEl.value) {
    audioEl.value.currentTime = value
    currentTime.value = value
  }
}

function onTimeUpdate() {
  if (audioEl.value) currentTime.value = audioEl.value.currentTime
}

function onLoadedMetadata() {
  if (audioEl.value) duration.value = audioEl.value.duration
}

function capture() {
  emit('capture', Math.floor(currentTime.value))
}
</script>

<template>
  <div v-if="src" class="rounded-none border border-tambouille-border bg-tambouille-surface p-3">
    <audio
      ref="audioEl"
      :src="src"
      @play="isPlaying = true"
      @pause="isPlaying = false"
      @ended="isPlaying = false"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoadedMetadata"
    />

    <div class="flex flex-wrap items-center gap-3">
      <button
        type="button"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-tambouille-accent text-tambouille-ink-on-accent hover:bg-tambouille-accent-hover"
        @click="toggle"
      >
        <svg v-if="!isPlaying" viewBox="0 0 24 24" class="ml-0.5 h-4 w-4 fill-current">
          <path d="M8 5v14l11-7z" />
        </svg>
        <svg v-else viewBox="0 0 24 24" class="h-4 w-4 fill-current">
          <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
        </svg>
      </button>

      <button
        type="button"
        class="shrink-0 rounded-none px-2 py-1 text-xs text-tambouille-muted hover:bg-tambouille-surface-hover"
        @click="skip(-10)"
      >
        -10s
      </button>
      <button
        type="button"
        class="shrink-0 rounded-none px-2 py-1 text-xs text-tambouille-muted hover:bg-tambouille-surface-hover"
        @click="skip(10)"
      >
        +10s
      </button>

      <div class="min-w-[140px] flex-1">
        <input
          type="range"
          class="h-1 w-full cursor-pointer accent-tambouille-accent"
          min="0"
          :max="duration || 0"
          :value="currentTime"
          @input="onSeek"
        />
        <div class="mt-0.5 text-xs text-tambouille-muted">
          {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
        </div>
      </div>

      <button
        type="button"
        class="shrink-0 rounded-none border border-tambouille-accent px-3 py-1.5 text-xs font-semibold text-tambouille-accent hover:bg-tambouille-accent hover:text-tambouille-ink-on-accent"
        @click="capture"
      >
        + Ajouter un morceau ici
      </button>
    </div>
  </div>
</template>
