<script setup lang="ts">
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import { usePlayerStore } from '@/stores/player'
import type { Mix } from '@/types'

const props = defineProps<{ mix: Mix; barCount?: number }>()
const playerStore = usePlayerStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
let animId = 0

const WAVEFORM_RESOLUTION = 200

const isThisMixPlaying = computed(() => playerStore.currentMix?.id === props.mix.id)
const isPlaying = computed(() => isThisMixPlaying.value && playerStore.isPlaying)

function seededRandom(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
    h = Math.imul(h ^ (h >>> 13), 0x45d9f3b)
    h = (h ^ (h >>> 16)) >>> 0
    return h / 0x100000000
  }
}

function generateWaveform(): number[] {
  const rng = seededRandom(props.mix.id)
  const raw: number[] = []
  for (let i = 0; i < WAVEFORM_RESOLUTION; i++) {
    const base = 0.15 + rng() * 0.85
    const envelope = Math.sin((i / WAVEFORM_RESOLUTION) * Math.PI) * 0.4 + 0.6
    raw.push(base * envelope)
  }
  for (let i = 1; i < raw.length - 1; i++) {
    raw[i] = raw[i]! * 0.6 + (raw[i - 1]! + raw[i + 1]!) * 0.2
  }
  return raw
}

const waveform = generateWaveform()

function sampleWaveform(count: number): number[] {
  const result: number[] = []
  for (let i = 0; i < count; i++) {
    const idx = (i / count) * waveform.length
    const lo = Math.floor(idx)
    const hi = Math.min(lo + 1, waveform.length - 1)
    const t = idx - lo
    result.push(waveform[lo]! * (1 - t) + waveform[hi]! * t)
  }
  return result
}

function getProgress(): number {
  if (!isThisMixPlaying.value) return 0
  const dur = playerStore.duration || props.mix.durationSec
  if (!dur || dur <= 0) return 0
  return Math.min(1, playerStore.currentTime / dur)
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const container = containerRef.value
  if (!container) return
  const rect = container.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const w = rect.width
  const h = rect.height
  // Un conteneur replié (onglet caché, parent en cours de montage) mesure 0 :
  // dessiner produirait un canvas vide qu'aucun redimensionnement ne rattrape.
  // Le ResizeObserver rappellera draw() dès qu'il aura une taille.
  if (w <= 0 || h <= 0) return

  // La taille CSS du canvas vient de `absolute inset-0`, jamais d'un style en
  // ligne. Y écrire des pixels en dur — ce que faisait cette fonction — donnait
  // au canvas une largeur définie, donc une taille min-content, que le
  // `min-width: auto` des éléments de grille et de flex propageait jusqu'en
  // haut : la piste refusait de se réduire, draw() re-mesurait cette largeur
  // gonflée et se la réécrivait. Une fois élargie, la vague ne revenait jamais.
  // Ici on ne dimensionne que le backing store.
  const bufferW = Math.round(w * dpr)
  const bufferH = Math.round(h * dpr)
  if (canvas.width !== bufferW || canvas.height !== bufferH) {
    canvas.width = bufferW
    canvas.height = bufferH
  }

  // Écrire canvas.width réinitialise la transformation, mais pas les frames où
  // la taille n'a pas bougé : on la repose donc à chaque passage plutôt que de
  // cumuler un scale() par frame.
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  const progress = getProgress()
  const gap = 2
  const targetBarWidth = 3
  const barCount = props.barCount ?? Math.max(10, Math.floor((w + gap) / (targetBarWidth + gap)))
  const sampled = sampleWaveform(barCount)
  const barWidth = Math.max(1, (w - gap * (barCount - 1)) / barCount)
  const progressX = progress * w

  const style = getComputedStyle(canvas)
  const accentColor = style.getPropertyValue('--waveform-accent').trim() || '#f97316'
  const mutedColor = style.getPropertyValue('--waveform-muted').trim() || 'rgba(255,255,255,0.25)'

  for (let i = 0; i < barCount; i++) {
    const x = i * (barWidth + gap)
    const barH = Math.max(2, sampled[i]! * h)
    const y = (h - barH) / 2

    ctx.fillStyle = x + barWidth <= progressX ? accentColor : mutedColor
    ctx.beginPath()
    ctx.roundRect(x, y, barWidth, barH, 1)
    ctx.fill()
  }
}

function loop() {
  draw()
  if (isPlaying.value) {
    animId = requestAnimationFrame(loop)
  }
}

watch(isPlaying, (playing) => {
  if (playing) {
    loop()
  } else {
    cancelAnimationFrame(animId)
    draw()
  }
})

watch(isThisMixPlaying, () => draw())

watch(
  () => playerStore.duration,
  () => {
    if (isThisMixPlaying.value && !isPlaying.value) draw()
  },
)

onMounted(() => {
  draw()
  const observer = new ResizeObserver(() => draw())
  if (containerRef.value) observer.observe(containerRef.value)
  onBeforeUnmount(() => {
    cancelAnimationFrame(animId)
    observer.disconnect()
  })
})

function onSeek(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  const container = containerRef.value
  if (!container) return
  const rect = container.getBoundingClientRect()
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
  const dur = playerStore.duration || props.mix.durationSec
  if (!dur) return
  const seconds = ratio * dur
  playerStore.playAt(props.mix, seconds)
}

function onToggle(event: Event) {
  event.preventDefault()
  event.stopPropagation()
  if (isThisMixPlaying.value) {
    playerStore.toggle()
  } else {
    playerStore.play(props.mix)
  }
}
</script>

<template>
  <div class="flex items-center gap-3 w-full">
    <!-- Le bouton ne contient qu'un chevron : sans étiquette, un lecteur
         d'écran n'annonce que « bouton ». L'état y est dit aussi, l'icône
         seule le portait. -->
    <button
      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-none bg-tambouille-accent text-white hover:bg-tambouille-accent-hover transition"
      :aria-label="isPlaying ? 'Mettre en pause' : 'Lire ce mix'"
      @click="onToggle"
    >
      <svg v-if="!isPlaying" viewBox="0 0 24 24" class="ml-0.5 h-3.5 w-3.5 fill-current">
        <path d="M8 5v14l11-7z" />
      </svg>
      <svg v-else viewBox="0 0 24 24" class="h-3.5 w-3.5 fill-current">
        <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
      </svg>
    </button>

    <!-- min-w-0 : sans lui, cet élément flex refuse de descendre sous la taille
         min-content de son contenu. Le canvas est en absolu pour la même raison,
         côté contenu — voir le commentaire de draw(). -->
    <div
      ref="containerRef"
      class="waveform-container relative h-10 min-w-0 flex-1 cursor-pointer"
      @click="onSeek"
    >
      <canvas ref="canvasRef" class="absolute inset-0 block h-full w-[95%]" />
    </div>
  </div>
</template>

<style scoped>
.waveform-container {
  --waveform-accent: var(--color-tambouille-accent, #f97316);
  --waveform-muted: color-mix(in srgb, currentColor 25%, transparent);
}
</style>
