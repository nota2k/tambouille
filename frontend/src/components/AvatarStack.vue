<script setup lang="ts">
import { computed } from 'vue'
import { mediaUrl } from '@/utils/media'
import type { AuthorSummary } from '@/types'
import type { RouteLocationRaw } from 'vue-router'

const props = withDefaults(
  defineProps<{
    title: string
    count: number
    users: AuthorSummary[]
    seeAllTo: RouteLocationRaw
    /** How many avatars to show before the row is truncated. */
    max?: number
    emptyLabel?: string
  }>(),
  { max: 7, emptyLabel: 'Personne pour l’instant.' },
)

const visible = computed(() => props.users.slice(0, props.max))
</script>

<template>
  <section>
    <div class="mb-3 flex items-baseline justify-between gap-4">
      <h2 class="text-xl font-semibold">{{ title }} ({{ count }})</h2>
      <RouterLink
        v-if="count > 0"
        :to="seeAllTo"
        class="shrink-0 text-sm text-tambouille-muted hover:underline"
      >
        Voir tout
      </RouterLink>
    </div>

    <p v-if="!visible.length" class="text-sm text-tambouille-muted">{{ emptyLabel }}</p>

    <!-- Negative gap makes the circles overlap; the ring keeps each one readable against its neighbour. -->
    <div v-else class="flex flex-wrap">
      <RouterLink
        v-for="user in visible"
        :key="user.id"
        :to="{ name: 'profile', params: { username: user.username } }"
        class="-mr-3 transition hover:z-10 hover:-translate-y-1"
        :title="user.displayName"
      >
        <img
          v-if="user.avatarUrl"
          :src="mediaUrl(user.avatarUrl)"
          class="h-14 w-14 rounded-none object-cover ring-2 ring-white"
          :alt="user.displayName"
        />
        <div
          v-else
          class="flex h-14 w-14 items-center justify-center rounded-none bg-tambouille-surface-hover text-lg font-bold ring-2 ring-white"
        >
          {{ user.displayName[0]?.toUpperCase() }}
        </div>
      </RouterLink>

      <RouterLink
        v-if="count > visible.length"
        :to="seeAllTo"
        class="-mr-3 flex h-14 w-14 items-center justify-center rounded-none bg-tambouille-surface-hover text-xs font-semibold text-tambouille-muted ring-2 ring-white transition hover:z-10 hover:-translate-y-1"
        :title="`Voir les ${count} au total`"
      >
        +{{ count - visible.length }}
      </RouterLink>
    </div>
  </section>
</template>
