<script setup lang="ts">
import { mediaSrcset, mediaUrl } from '@/utils/media'
import type { AuthorSummary } from '@/types'

defineProps<{ user: AuthorSummary }>()
</script>

<template>
  <RouterLink
    :to="{ name: 'profile', params: { username: user.username } }"
    class="flex items-center gap-3 rounded-none border border-tambouille-border bg-tambouille-surface p-3 transition hover:border-tambouille-accent"
  >
    <img
      v-if="user.avatarUrl"
      :src="mediaUrl(user.avatarUrl)"
      :srcset="mediaSrcset(user.avatarUrl)"
      sizes="48px"
      loading="lazy"
      decoding="async"
      class="h-12 w-12 shrink-0 rounded-none object-cover"
      alt=""
    />
    <div
      v-else
      class="flex h-12 w-12 shrink-0 items-center justify-center rounded-none bg-tambouille-surface-hover text-sm font-semibold"
    >
      {{ user.displayName[0]?.toUpperCase() }}
    </div>

    <div class="min-w-0">
      <p class="truncate text-sm font-semibold">{{ user.displayName }}</p>
      <p class="truncate text-xs text-tambouille-muted">@{{ user.username }}</p>
    </div>
  </RouterLink>
</template>
