<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { mediaSrcset, mediaUrl } from '@/utils/media'
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
  <div>
    <p class="tb-eyebrow">Dégoté par</p>

    <div class="flex items-center gap-4 pt-4">
      <RouterLink
        :to="{ name: 'profile', params: { username: profile.username } }"
        class="shrink-0"
      >
        <img
          v-if="profile.avatarUrl"
          :src="mediaUrl(profile.avatarUrl)"
          :srcset="mediaSrcset(profile.avatarUrl)"
          sizes="64px"
          loading="lazy"
          decoding="async"
          class="h-16 w-16 object-cover"
          alt=""
        />
        <div
          v-else
          class="flex h-16 w-16 items-center justify-center bg-tambouille-surface-hover font-display text-xl font-bold"
        >
          {{ profile.displayName[0]?.toUpperCase() }}
        </div>
      </RouterLink>

      <div class="min-w-0 flex-1">
        <RouterLink
          :to="{ name: 'profile', params: { username: profile.username } }"
          class="block truncate font-display text-[17px] font-bold hover:underline"
        >
          {{ profile.displayName }}
        </RouterLink>
        <p class="truncate text-[13px] text-tambouille-muted">
          {{ profile.mixesCount }} mix · @{{ profile.username }}
        </p>
      </div>

      <button
        v-if="authStore.user?.id !== profile.id"
        class="tb-btn-sm shrink-0"
        :class="profile.isFollowing ? 'tb-btn-outline' : 'tb-btn'"
        @click="toggleFollow"
      >
        {{ profile.isFollowing ? 'Abonné⋅e' : 'Suivre' }}
      </button>
    </div>

    <p
      v-if="profile.bio"
      class="mt-4 whitespace-pre-line text-sm leading-relaxed text-tambouille-muted"
    >
      {{ profile.bio }}
    </p>
  </div>
</template>
