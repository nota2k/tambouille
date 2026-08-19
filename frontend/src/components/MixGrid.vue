<script setup lang="ts">
import { ref } from 'vue'
import MixCard from './MixCard.vue'
import type { Mix } from '@/types'
import { Swiper, SwiperSlide } from 'swiper/vue'
import { Navigation } from 'swiper/modules'
import 'swiper/swiper.css'

defineProps<{ mixes: Mix[] }>()

const prevEl = ref<HTMLButtonElement | null>(null)
const nextEl = ref<HTMLButtonElement | null>(null)
</script>

<template>
  <div class="relative">
    <button
      ref="prevEl"
      class="absolute -left-3 top-[38%] z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center border border-tambouille-border bg-tambouille-surface shadow hover:bg-tambouille-surface-hover sm:flex"
      aria-label="Précédent"
    >
      <svg viewBox="0 0 24 24" class="h-4 w-4 fill-current">
        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
      </svg>
    </button>

    <Swiper
      class="mix-grid-swiper w-full"
      :modules="[Navigation]"
      :navigation="{ prevEl, nextEl }"
      :slides-per-view="1.2"
      :space-between="12"
      :breakpoints="{
        450: { slidesPerView: 2, spaceBetween: 12 },
        640: { slidesPerView: 3, spaceBetween: 16 },
        800: { slidesPerView: 4, spaceBetween: 16 },
        1024: { slidesPerView: 5, spaceBetween: 16 },
        1280: { slidesPerView: 6, spaceBetween: 16 },
      }"
    >
      <SwiperSlide v-for="mix in mixes" :key="mix.id">
        <MixCard :mix="mix" landscape />
      </SwiperSlide>
    </Swiper>

    <button
      ref="nextEl"
      class="absolute -right-3 top-[38%] z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center border border-tambouille-border bg-tambouille-surface shadow hover:bg-tambouille-surface-hover sm:flex"
      aria-label="Suivant"
    >
      <svg viewBox="0 0 24 24" class="h-4 w-4 fill-current">
        <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
      </svg>
    </button>
  </div>
</template>

<style>
.mix-grid-swiper .swiper-wrapper {
  align-items: stretch !important;
}

.mix-grid-swiper .swiper-slide {
  height: auto !important;
}
</style>
