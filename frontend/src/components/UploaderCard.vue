<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { mediaUrl } from '@/utils/media'
import { toggleUserFollow } from '@/utils/follows'
import type { UserProfile } from '@/types'

const props = defineProps<{ profile: UserProfile }>()
const authStore = useAuthStore()
const router = useRouter()

function toggleFollow() {
  if (!authStore.isAuthenticated) {
    router.push({ name: 'login' })
    return
  }
  toggleUserFollow(props.profile).catch(() => {})
}
</script>

<template>

      <h2 class="mb-3 text-lg font-semibold">User</h2>

  <div class="rounded-xl border border-tambouille-border bg-tambouille-surface p-4">
    <div class="flex items-center gap-4">
      <RouterLink :to="{ name: 'profile', params: { username: profile.username } }" class="shrink-0">
        <img
          v-if="profile.avatarUrl"
          :src="mediaUrl(profile.avatarUrl)"
          class="h-16 w-16 rounded-full object-cover"
          alt=""
        />
        <div
          v-else
          class="flex h-16 w-16 items-center justify-center rounded-full bg-tambouille-surface-hover text-xl font-bold"
        >
          {{ profile.displayName[0]?.toUpperCase() }}
        </div>
      </RouterLink>

      <div class="min-w-0 flex-1">
        <p class="mb-1 text-xs uppercase tracking-wide text-tambouille-muted">Uploadé par</p>
        <RouterLink
          :to="{ name: 'profile', params: { username: profile.username } }"
          class="block truncate font-semibold hover:underline"
        >
          {{ profile.displayName }}
        </RouterLink>
        <p class="truncate text-sm text-tambouille-muted">@{{ profile.username }}</p>
      </div>

    </div>

    <!-- Sous la rangée plutôt qu'à côté : la carte vit dans une colonne étroite. -->
    <button
      v-if="authStore.user?.id !== profile.id"
      class="mt-3 w-full rounded-full px-4 py-1.5 text-sm font-semibold transition"
      :class="
        profile.isFollowing
          ? 'border border-tambouille-border hover:bg-tambouille-surface-hover'
          : 'bg-tambouille-accent text-white hover:bg-tambouille-accent-hover'
      "
      @click="toggleFollow"
    >
      {{ profile.isFollowing ? 'Abonné' : "S'abonner" }}
    </button>

    <p v-if="profile.bio" class="mt-3 whitespace-pre-line text-sm text-tambouille-text/90">{{ profile.bio }}</p>

    <div class="mt-3 flex gap-4 text-xs text-tambouille-muted">
      <RouterLink :to="{ name: 'profile', params: { username: profile.username } }" class="hover:underline">
        {{ profile.mixesCount }} mixs
      </RouterLink>
      <RouterLink :to="{ name: 'profile', params: { username: profile.username } }" class="hover:underline">
        {{ profile.followersCount }} abonnés
      </RouterLink>
      <RouterLink :to="{ name: 'profile', params: { username: profile.username } }" class="hover:underline">
        {{ profile.followingCount }} abonnements
      </RouterLink>
    </div>
  </div>
</template>
