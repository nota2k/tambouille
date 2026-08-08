<script setup lang="ts">
import { mediaUrl } from '@/utils/media'
import type { PlaylistSummary } from '@/types'

defineProps<{ playlist: PlaylistSummary }>()
</script>

<template>
  <RouterLink
    :to="{ name: 'playlist-detail', params: { id: playlist.id } }"
    class="group block w-40 shrink-0 sm:w-48"
  >
    <!-- Mosaic of up to four covers; a single cover fills the square on its own. -->
    <div
      class="grid aspect-square w-full overflow-hidden rounded-none bg-tambouille-surface-hover"
      :class="playlist.coverUrls.length > 1 ? 'grid-cols-2 grid-rows-2 gap-0.5' : ''"
    >
      <template v-if="playlist.coverUrls.length">
        <img
          v-for="url in playlist.coverUrls"
          :key="url"
          :src="mediaUrl(url)"
          class="h-full w-full object-cover"
          alt=""
        />
      </template>
      <div v-else class="flex h-full w-full items-center justify-center text-tambouille-muted">
        <svg viewBox="0 0 24 24" class="h-10 w-10 fill-current opacity-40">
          <path d="M14 10H3v2h11v-2zm0-4H3v2h11V6zM3 16h7v-2H3v2zm13-6v4h-4v2h4v4h2v-4h4v-2h-4v-4h-2z" />
        </svg>
      </div>
    </div>

    <p class="mt-2 truncate text-sm font-semibold">{{ playlist.title }}</p>
    <p class="truncate text-xs text-tambouille-muted">
      {{ playlist.mixesCount }} {{ playlist.mixesCount > 1 ? 'mixs' : 'mix' }}
    </p>
  </RouterLink>
</template>
