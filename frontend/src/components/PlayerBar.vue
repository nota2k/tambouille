<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { apiClient } from '@/api/client'
import { mediaUrl } from '@/utils/media'
import { formatTime } from '@/utils/time'
import { loadMixcloudWidgetApi, mixcloudIframeSrc, type MixcloudWidget } from '@/utils/mixcloud'

/** A cloudcast that was removed or made private never answers `ready`; fail loudly instead of hanging. */
const WIDGET_READY_TIMEOUT_MS = 15000

const playerStore = usePlayerStore()
const audioEl = ref<HTMLAudioElement | null>(null)
const mixcloudFrame = ref<HTMLIFrameElement | null>(null)
const duration = ref(0)
const widgetError = ref('')

/** R2-hosted audio. Undefined on a Mixcloud-hosted mix. */
const audioSrc = computed(() => mediaUrl(playerStore.currentMix?.audioUrl))
/** Mixcloud cloudcast key. Null on an R2-hosted mix. */
const mixcloudKey = computed(() => playerStore.currentMix?.mixcloudKey ?? null)
/** Neither source: the backend forbids it, but a stale payload must still not look playable. */
const hasNoSource = computed(
  () => playerStore.currentMix != null && !audioSrc.value && !mixcloudKey.value,
)
const playbackError = computed(() =>
  hasNoSource.value ? "Ce mix n'a pas de source audio et ne peut pas être lu." : widgetError.value,
)
const canPlay = computed(() => !hasNoSource.value && !widgetError.value)

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

// --- Mixcloud widget ------------------------------------------------------
// The iframe belongs to this component, which persists across route changes, so a
// navigation mid-playback never touches it. `widget` is deliberately a plain binding:
// nothing in the template reads it, and reactivity would only add proxy noise.

let widget: MixcloudWidget | null = null
/**
 * `ready` only means the widget's own API is wired up — Mixcloud may not have fetched the
 * cloudcast yet, and a `play()` sent before it has is accepted and silently dropped. This
 * turns true once the cloudcast is demonstrably loaded, which is when commands start landing.
 */
let widgetLoaded = false
/** True once the widget has actually started; before that its `pause` events are setup noise. */
let widgetHasPlayed = false
/**
 * The record of "a real gesture asked to play while the widget was not yet taking commands".
 * It is set from the `isPlaying` watcher below, which runs synchronously inside the click
 * handler that flipped the store, and it is the only thing that lets the load path call `play()`.
 */
let playWhenLoaded = false

/**
 * Reads the browser's transient activation. The watcher that calls it runs with
 * `flush: 'sync'`, so it executes inside the originating click's own call stack and this
 * is a truthful answer to "is a gesture in progress right now". Browsers without the API
 * fall back to true — the synchronous flush already ties the call to the gesture there.
 */
function hasUserActivation(): boolean {
  const activation = navigator.userActivation
  return activation ? activation.isActive : true
}

function onWidgetProgress(position: number, total: number) {
  if (total && total !== duration.value) {
    duration.value = total
    playerStore.setDuration(total)
  }
  playerStore.setCurrentTime(position)
}

function onWidgetPlay() {
  widgetHasPlayed = true
  widgetError.value = ''
}

function onWidgetPause() {
  // Mixcloud emits `pause` while it is still wiring itself up; mirroring that would
  // cancel the click that started playback. Only follow it once sound has been heard.
  if (widgetHasPlayed) playerStore.pause()
}

function onWidgetEnded() {
  playerStore.pause()
}

function onWidgetError() {
  widgetError.value = "La lecture Mixcloud a échoué — le mix n'y est peut-être plus disponible."
  playerStore.pause()
}

function teardownWidget() {
  if (widget) {
    widget.events.progress.off(onWidgetProgress)
    widget.events.play.off(onWidgetPlay)
    widget.events.pause.off(onWidgetPause)
    widget.events.ended.off(onWidgetEnded)
    widget.events.error.off(onWidgetError)
    widget = null
  }
  widgetLoaded = false
  widgetHasPlayed = false
  // `playWhenLoaded` is deliberately left alone: it records a user's intent, not a widget's
  // lifetime, and the mix-change watcher tears the old widget down *after* the click that
  // set it has already been seen.
}

/**
 * Waits for Mixcloud to answer `getDuration()` with a real number. That answer is the first
 * observable proof that the cloudcast itself has loaded, so it doubles as the cue to start
 * playing and as the source of the scrubber's range. A cloudcast that never loads — deleted,
 * made private — never answers, and the loop ends in a visible error rather than a dead bar.
 */
async function awaitCloudcast(owner: MixcloudWidget) {
  for (const delay of [0, 250, 500, 1000, 2000, 4000]) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay))
    if (widget !== owner) return

    const total = await owner.getDuration().catch(() => 0)
    if (!total) continue

    widgetLoaded = true
    duration.value = total
    playerStore.setDuration(total)

    if (playWhenLoaded) {
      playWhenLoaded = false
      void Promise.resolve(owner.play()).catch(() => {})
    }
    applyPendingSeek()
    return
  }

  if (widget !== owner) return
  widgetError.value = "Ce mix n'a pas pu être chargé depuis Mixcloud — il y a peut-être été retiré."
  playerStore.pause()
}

/**
 * Is `mixId` still the mix this run is building for? Every await re-asks, so a fast mix
 * switch cannot leave two widgets alive.
 *
 * The question is asked about the mix *id*, never the cloudcast key. A key is not unique
 * across rows — two users can import the same public cloudcast — so a key comparison would
 * answer "yes, still current" after a switch between two mixes that happen to share one,
 * and this run would go on wiring itself to a frame that has since been replaced.
 */
function isCurrentMix(mixId: string): boolean {
  return playerStore.currentMix?.id === mixId
}

/**
 * Builds the widget for the mix `mixId`, whose cloudcast is `key`.
 *
 * The order below is not incidental. `PlayerWidget()` completes its handshake by catching the
 * message the iframe posts once it has loaded; a widget built after that message has already
 * gone by never resolves `ready`. So the iframe is rendered blank, the script is fetched, the
 * widget is built on the empty frame, and only then is the feed URL assigned.
 */
async function setupWidget(mixId: string, key: string) {
  teardownWidget()

  // The iframe is rendered by `v-if` on the same tick the mix changed, and keyed on the mix
  // id, so this is a pristine element with no src yet.
  await nextTick()
  const frame = mixcloudFrame.value
  if (!frame || !isCurrentMix(mixId)) return

  let api
  try {
    api = await loadMixcloudWidgetApi()
  } catch {
    if (!isCurrentMix(mixId)) return
    widgetError.value = "Le lecteur Mixcloud n'a pas pu être chargé."
    playerStore.pause()
    return
  }
  if (!isCurrentMix(mixId)) return

  const created = api.PlayerWidget(frame)
  frame.src = mixcloudIframeSrc(key)

  // The timeout handle is local to this run, and cleared the moment the race settles.
  // It was module-level once, which meant concurrent runs shared one slot: a run that
  // finished first cleared whatever timer the run after it had just armed, and that
  // later run — the current one — then waited on a `ready` that would never resolve,
  // with nothing left to reject it. A dead cloudcast reported no error at all, and the
  // bar sat at 0:00 forever. Anything that outlives one run must not be shared by name.
  let readyTimer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      created.ready,
      new Promise<never>((_, reject) => {
        readyTimer = setTimeout(() => reject(new Error('ready timed out')), WIDGET_READY_TIMEOUT_MS)
      }),
    ])
  } catch {
    if (!isCurrentMix(mixId)) return
    widgetError.value = "Ce mix est introuvable sur Mixcloud — il a peut-être été retiré."
    playerStore.pause()
    return
  } finally {
    clearTimeout(readyTimer)
  }
  if (!isCurrentMix(mixId)) return

  widget = created
  created.events.progress.on(onWidgetProgress)
  created.events.play.on(onWidgetPlay)
  created.events.pause.on(onWidgetPause)
  created.events.ended.on(onWidgetEnded)
  created.events.error.on(onWidgetError)

  await awaitCloudcast(created)
}

// --- Shared transport -----------------------------------------------------

function applyPendingSeek() {
  const seconds = playerStore.pendingSeekSec
  if (seconds == null) return

  if (widget && widgetLoaded) {
    void Promise.resolve(widget.seek(seconds)).catch(() => {})
  } else if (audioEl.value) {
    audioEl.value.currentTime = seconds
  } else {
    return
  }

  playerStore.setCurrentTime(seconds)
  playerStore.clearPendingSeek()
}

watch(
  () => playerStore.currentMix?.id,
  () => {
    duration.value = 0
    widgetError.value = ''
    teardownWidget()

    if (playerStore.currentMix) {
      apiClient.post(`/mixes/${playerStore.currentMix.id}/play`).catch(() => {})
    }

    // Switching mixes while already playing never re-fires the `isPlaying` watcher, so the
    // gesture that asked for the new mix is recorded here instead. This watcher runs on the
    // scheduler tick that follows the click, well inside the browser's transient activation
    // window, so `hasUserActivation()` is still a truthful reading.
    playWhenLoaded = playerStore.isPlaying && hasUserActivation()

    // First use of a Mixcloud-hosted mix is what pulls the widget script down.
    const mix = playerStore.currentMix
    if (mix?.mixcloudKey) void setupWidget(mix.id, mix.mixcloudKey)
  },
)

watch(
  () => playerStore.pendingSeekSec,
  (seconds) => {
    if (seconds == null) return
    // Seek right away when the backend is ready for it; otherwise `onLoadedMetadata`
    // (audio) or `awaitCloudcast` (Mixcloud) picks the pending seek up on arrival.
    if (widget && widgetLoaded) {
      applyPendingSeek()
    } else if (audioEl.value && audioEl.value.readyState >= 1) {
      applyPendingSeek()
    }
  },
)

watch(
  () => playerStore.isPlaying,
  (isPlaying) => {
    if (mixcloudKey.value) {
      if (!isPlaying) {
        playWhenLoaded = false
        if (widget) void Promise.resolve(widget.pause()).catch(() => {})
        return
      }
      // Autoplay policy: `play()` is legitimate only on the tick of a real gesture.
      if (!hasUserActivation()) return
      if (widget && widgetLoaded) void Promise.resolve(widget.play()).catch(() => {})
      else playWhenLoaded = true
      return
    }

    if (!audioEl.value) return
    if (isPlaying) {
      audioEl.value.play().catch(() => {})
    } else {
      audioEl.value.pause()
    }
  },
  // Runs inside the call stack of the click that flipped the store, so the browser still
  // sees a live user activation. A `pre` flush would defer it to a scheduler microtask.
  { flush: 'sync' },
)

onBeforeUnmount(teardownWidget)

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
  if (widget) {
    void Promise.resolve(widget.seek(value)).catch(() => {})
    playerStore.setCurrentTime(value)
  } else if (audioEl.value) {
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
    <!--
      Exactly one backend is mounted at a time. The Mixcloud widget is an iframe whose
      interior cannot be styled from here, so it is hidden and driven by the controls below.
    -->
    <!--
      Keyed on the mix id, not on the cloudcast key: two rows can carry the same key —
      nothing stops two users importing the same public cloudcast — and a shared key would
      leave Vue patching the existing iframe rather than replacing it, so the switch would
      depend on reassigning `src` re-navigating the frame. The id is unique, so every mix
      change hands `setupWidget` a fresh, blank element, which is what it expects.
    -->
    <iframe
      v-if="mixcloudKey"
      :key="playerStore.currentMix.id"
      ref="mixcloudFrame"
      title="Lecteur Mixcloud"
      aria-hidden="true"
      tabindex="-1"
      allow="autoplay"
      class="pointer-events-none absolute h-px w-px border-0 opacity-0"
    ></iframe>
    <audio
      v-else-if="audioSrc"
      ref="audioEl"
      :src="audioSrc"
      autoplay
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoadedMetadata"
      @ended="onEnded"
    />

    <p
      v-if="playbackError"
      role="alert"
      class="border-b border-tambouille-text-black bg-tambouille-accent px-4 py-2 text-sm text-tambouille-white"
    >
      {{ playbackError }}
    </p>

    <div class="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
      <img
        v-if="playerStore.currentMix.coverUrl"
        :src="mediaUrl(playerStore.currentMix.coverUrl)"
        class="h-12 w-12 shrink-0 rounded object-cover"
        alt=""
      />
      <div v-else class="h-12 w-12 shrink-0 rounded bg-tambouille-surface-hover"></div>

      <button
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tambouille-action-hover text-tambouille-text-black hover:bg-tambouille-accent-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-tambouille-action-hover"
        :disabled="!canPlay"
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
          class="mt-1 h-1 w-full cursor-pointer accent-tambouille-text-black disabled:cursor-not-allowed disabled:opacity-40"
          min="0"
          :max="duration || 0"
          :value="playerStore.currentTime"
          :disabled="!canPlay"
          @input="onSeek"
        />
      </div>
    </div>
  </div>
</template>
