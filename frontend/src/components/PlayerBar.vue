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
/**
 * True while a Mixcloud widget is being brought up and no sound has started yet: from the
 * moment the mix becomes current, through the script fetch and the `getDuration` polling,
 * until the widget emits `play` (or the user gives up, or it fails).
 *
 * It exists because that window is long — seconds, on a slow connection — and the store
 * flips `isPlaying` the instant the button is clicked. Without this the bar would show a
 * pause icon and 0:00 while nothing whatsoever is playing, which is a claim it cannot back.
 */
const widgetLoading = ref(false)

/** Cloudcast key. Null unless this mix plays through the Mixcloud widget. */
const mixcloudRef = computed(() =>
  playerStore.currentMix?.sourceType === 'mixcloud' ? playerStore.currentMix.sourceRef : null,
)
/**
 * A directly playable URL: R2 goes through `mediaUrl`, anything else is already
 * absolute. Both end up on the same `<audio>` element — the point of the
 * source pair is that only Mixcloud needs its own engine.
 */
const audioSrc = computed(() => {
  const mix = playerStore.currentMix
  if (!mix) return undefined
  if (mix.sourceType === 'remote') return mix.sourceRef ?? undefined
  return mediaUrl(mix.audioUrl)
})
/** Neither source: the backend forbids it, but a stale payload must still not look playable. */
const hasNoSource = computed(
  () => playerStore.currentMix != null && !audioSrc.value && !mixcloudRef.value,
)
/** Set when the element itself fails, as opposed to the Mixcloud widget. */
const audioError = ref('')
const playbackError = computed(() =>
  hasNoSource.value
    ? "Ce mix n'a pas de source audio et ne peut pas être lu."
    : widgetError.value || audioError.value,
)
const canPlay = computed(() => !hasNoSource.value && !widgetError.value && !audioError.value)

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
 * The record of "a real gesture asked to play while the widget was not yet taking commands",
 * and the only thing that lets the load path call `play()`. Both watchers below set it, and
 * both do so within the originating click's activation window — the `isPlaying` one inside
 * the click's own call stack, the mix-change one on the scheduler tick just after.
 */
let playWhenLoaded = false

/**
 * Reads the browser's transient activation. Both callers run within the originating
 * click's activation window, so this is a truthful answer to "did a real gesture ask for
 * this". Browsers without the API fall back to true.
 *
 * It gates *recording* the intent to play, not the eventual `play()` call — see
 * `awaitCloudcast`, which issues that one long after any transient activation has expired.
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
  widgetLoading.value = false
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
  widgetLoading.value = false
  playerStore.pause()
}

function teardownWidget() {
  widgetLoading.value = false
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
    // Ownership has to be re-checked *after* this await, not only before it. A mix switch
    // can land while the call is in flight: this run then resumes into a world where its
    // widget was torn down, and every write below is module-level — `widgetLoaded`,
    // `duration`, `playWhenLoaded`, `widgetLoading`. The damaging one is `playWhenLoaded`,
    // which records the *new* mix's play intent; a stale run consuming it leaves the new
    // mix loaded, silent, and showing no error. Same shape as the shared ready timer:
    // every await is a place the world can change, so every await needs its own check.
    if (widget !== owner) return
    if (!total) continue

    widgetLoaded = true
    duration.value = total
    playerStore.setDuration(total)

    if (playWhenLoaded) {
      playWhenLoaded = false
      // This is NOT an in-gesture call, and nothing here should be written as though it
      // were. It runs from a promise chain, after a script fetch and up to ~7.75 s of
      // polling above; the click's transient activation expired long ago. What makes it
      // land is the iframe's `allow="autoplay"`, which delegates the autoplay permission
      // to Mixcloud's origin, and browsers grant that off *sticky* activation — "this
      // page has been interacted with at some point" — not off a live gesture.
      //
      // That is a policy, not a guarantee: a browser that insists on transient activation
      // drops this silently, and no error comes back. Hence `widgetLoading` stays true
      // here and is only cleared by the widget's own `play` event: the bar claims playback
      // once sound has demonstrably started, never merely because a play was requested.
      void Promise.resolve(owner.play()).catch(() => {})
    } else {
      widgetLoading.value = false
    }
    applyPendingSeek()
    return
  }

  if (widget !== owner) return
  widgetError.value = "Ce mix n'a pas pu être chargé depuis Mixcloud — il y a peut-être été retiré."
  widgetLoading.value = false
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
  widgetLoading.value = true

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
    widgetLoading.value = false
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
    widgetError.value = 'Ce mix est introuvable sur Mixcloud — il a peut-être été retiré.'
    widgetLoading.value = false
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

/**
 * On R2 the object is either there or it is not, so this never fired. With a
 * remote source, a file that has moved or gone is the ordinary case — and
 * without this the bar sits at 0:00 saying nothing, which is exactly what the
 * Mixcloud path takes such care to avoid.
 */
function onAudioError() {
  // A `src` cleared between mixes makes the element fire `error` on an empty
  // source; there is nothing broken to report in that case.
  if (!audioSrc.value) return

  audioError.value =
    playerStore.currentMix?.sourceType === 'remote'
      ? 'La source de ce mix ne répond plus — elle a peut-être été retirée.'
      : 'Ce fichier audio est illisible.'
  playerStore.pause()
}

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
    audioError.value = ''
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
    if (mix?.sourceType === 'mixcloud' && mix.sourceRef) void setupWidget(mix.id, mix.sourceRef)
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
    if (mixcloudRef.value) {
      if (!isPlaying) {
        playWhenLoaded = false
        // Whatever was still coming up, the user has stopped asking for it. Dropping the
        // loading state here is also the escape hatch from a widget that never emits
        // `play`: the pause button always ends the claim that something is starting.
        widgetLoading.value = false
        if (widget) void Promise.resolve(widget.pause()).catch(() => {})
        return
      }
      // Only a real gesture may record an intent to play. The call this eventually leads
      // to is not itself in-gesture — `awaitCloudcast` explains why it lands anyway.
      if (!hasUserActivation()) return
      if (widget && widgetLoaded) void Promise.resolve(widget.play()).catch(() => {})
      else playWhenLoaded = true
      // Either way, sound has not started yet: the bar says "loading" until `play` arrives.
      widgetLoading.value = true
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
  <div v-if="playerStore.currentMix" class="fixed inset-x-0 bottom-0 z-40 bg-black text-white">
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
      v-if="mixcloudRef"
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
      @error="onAudioError"
    />

    <p
      v-if="playbackError"
      role="alert"
      class="bg-tambouille-accent px-4 py-2 text-sm text-tambouille-white"
    >
      {{ playbackError }}
    </p>

    <div class="mx-auto flex max-w-6xl items-center gap-5 px-4 py-3">
      <img
        v-if="playerStore.currentMix.coverUrl"
        :src="mediaUrl(playerStore.currentMix.coverUrl)"
        class="h-12 w-12 shrink-0 rounded-none object-cover"
        alt=""
      />
      <div v-else class="h-12 w-12 shrink-0 rounded-none bg-neutral-700"></div>

      <!--
        While the Mixcloud widget is still coming up, the button shows a spinner rather
        than a pause icon: the store says "playing" from the click onwards, but nothing is
        audible until the widget answers, and a pause icon over silence is a lie. It stays
        clickable throughout — pausing is how the user calls off a load that drags.
      -->
      <button
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-none bg-tambouille-accent text-white hover:bg-tambouille-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="!canPlay"
        :aria-label="widgetLoading ? 'Chargement' : playerStore.isPlaying ? 'Pause' : 'Lecture'"
        @click="playerStore.toggle()"
      >
        <svg
          v-if="widgetLoading"
          viewBox="0 0 24 24"
          class="h-5 w-5 animate-spin"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            opacity="0.3"
          />
          <path
            d="M21 12a9 9 0 0 0-9-9"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
          />
        </svg>
        <svg
          v-else-if="!playerStore.isPlaying"
          viewBox="0 0 24 24"
          class="ml-0.5 h-5 w-5 fill-current"
          aria-hidden="true"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
        <svg v-else viewBox="0 0 24 24" class="h-5 w-5 fill-current" aria-hidden="true">
          <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
        </svg>
      </button>

      <div class="min-w-0 flex-1">
        <div class="flex items-baseline justify-between gap-3">
          <RouterLink
            :to="{ name: 'mix-detail', params: { id: playerStore.currentMix.id } }"
            class="truncate font-display text-sm font-bold text-white hover:underline"
          >
            {{ playerStore.currentMix.title }}
          </RouterLink>
          <!-- "0:00 / 0:00" during the load reads as a stalled player; say what is happening. -->
          <span class="shrink-0 text-xs text-neutral-400 tabular-nums">
            <template v-if="widgetLoading">Chargement…</template>
            <template v-else>
              {{ formatTime(playerStore.currentTime) }} / {{ formatTime(duration) }}
            </template>
          </span>
        </div>

        <div class="flex items-baseline gap-1.5 truncate text-xs text-neutral-400">
          <RouterLink
            :to="{ name: 'profile', params: { username: playerStore.currentMix.user.username } }"
            class="shrink-0 hover:underline"
          >
            {{ playerStore.currentMix.user.displayName }}
          </RouterLink>
          <!-- Un morceau sans aucun des deux noms n'a rien à annoncer : la
               barre garde le titre du mix, sans point médian orphelin. -->
          <template v-if="currentTrack && (currentTrack.artist || currentTrack.title)">
            <span>·</span>
            <span class="truncate text-white">
              {{
                currentTrack.artist && currentTrack.title
                  ? `${currentTrack.artist} – ${currentTrack.title}`
                  : currentTrack.title || currentTrack.artist
              }}
            </span>
          </template>
        </div>

        <input
          type="range"
          class="player-seek mt-2 h-1 w-full cursor-pointer accent-white disabled:cursor-not-allowed disabled:opacity-40"
          min="0"
          :max="duration || 0"
          :value="playerStore.currentTime"
          :disabled="!canPlay || widgetLoading"
          @input="onSeek"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * La barre de progression de la maquette est un filet de 4 px : piste grise,
 * partie lue en blanc, curseur carré. `accent-color` seul donne une piste
 * arrondie et un curseur rond, alors on redessine les deux.
 */
.player-seek {
  appearance: none;
  background: #555;
  height: 4px;
}

.player-seek::-webkit-slider-thumb {
  appearance: none;
  width: 4px;
  height: 14px;
  background: #fff;
  border: 0;
  border-radius: 0;
}

.player-seek::-moz-range-thumb {
  width: 4px;
  height: 14px;
  background: #fff;
  border: 0;
  border-radius: 0;
}

.player-seek::-moz-range-progress {
  background: #fff;
  height: 4px;
}
</style>
