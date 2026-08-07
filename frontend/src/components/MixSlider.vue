<script setup lang="ts">
import { ref } from 'vue'
import MixCard from './MixCard.vue'
import type { Mix } from '@/types'

defineProps<{ mixes: Mix[] }>()
const scrollEl = ref<HTMLDivElement | null>(null)

function scroll(direction: 1 | -1) {
  if (!scrollEl.value) return
  scrollEl.value.scrollBy({ left: direction * scrollEl.value.clientWidth * 0.8, behavior: 'smooth' })
}
</script>

<template>
  <div class="relative">
    <button
      class="absolute -left-3 top-[38%] z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-tambouille-border bg-tambouille-surface shadow hover:bg-tambouille-surface-hover sm:flex"
      aria-label="Précédent"
      @click="scroll(-1)"
    >
      <svg viewBox="0 0 24 24" class="h-4 w-4 fill-current">
        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
      </svg>
    </button>

    <div ref="scrollEl" class="scrollbar-hide flex gap-4 overflow-x-auto scroll-smooth pb-2">
      <MixCard v-for="mix in mixes" :key="mix.id" :mix="mix" />
    </div>

    <button
      class="absolute -right-3 top-[38%] z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-tambouille-border bg-tambouille-surface shadow hover:bg-tambouille-surface-hover sm:flex"
      aria-label="Suivant"
      @click="scroll(1)"
    >
      <svg viewBox="0 0 24 24" class="h-4 w-4 fill-current">
        <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
      </svg>
    </button>
  </div>
</template>
