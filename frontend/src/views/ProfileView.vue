<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { mediaUrl } from '@/utils/media'
import MixCard from '@/components/MixCard.vue'
import type { Mix, UserProfile } from '@/types'

const route = useRoute()
const authStore = useAuthStore()

const profile = ref<UserProfile | null>(null)
const mixes = ref<Mix[]>([])
const loading = ref(true)

const editing = ref(false)
const editDisplayName = ref('')
const editBio = ref('')
const savingProfile = ref(false)
const avatarInput = ref<HTMLInputElement | null>(null)

const isOwnProfile = computed(() => authStore.user?.username === route.params.username)

async function loadProfile() {
  loading.value = true
  try {
    const username = route.params.username as string
    const [{ data: userData }, { data: mixesData }] = await Promise.all([
      apiClient.get<UserProfile>(`/users/${username}`),
      apiClient.get<{ items: Mix[] }>('/mixes', { params: { username, limit: 50 } }),
    ])
    profile.value = userData
    mixes.value = mixesData.items
    editDisplayName.value = userData.displayName
    editBio.value = userData.bio ?? ''
  } finally {
    loading.value = false
  }
}

async function saveProfile() {
  savingProfile.value = true
  try {
    const { data } = await apiClient.patch<UserProfile>('/users/me', {
      displayName: editDisplayName.value,
      bio: editBio.value,
    })
    profile.value = data
    if (authStore.user) {
      authStore.user.displayName = data.displayName
      authStore.user.bio = data.bio
    }
    editing.value = false
  } finally {
    savingProfile.value = false
  }
}

async function onAvatarChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const formData = new FormData()
  formData.append('avatar', file)
  const { data } = await apiClient.post<UserProfile>('/users/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  profile.value = data
  if (authStore.user) authStore.user.avatarUrl = data.avatarUrl
}

watch(() => route.params.username, loadProfile)
onMounted(loadProfile)
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8">
    <div v-if="loading" class="py-16 text-center text-tambouille-muted">Chargement...</div>

    <template v-else-if="profile">
      <div class="mb-8 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div class="relative shrink-0">
          <img
            v-if="profile.avatarUrl"
            :src="mediaUrl(profile.avatarUrl)"
            class="h-24 w-24 rounded-full object-cover"
            alt=""
          />
          <div
            v-else
            class="flex h-24 w-24 items-center justify-center rounded-full bg-tambouille-surface-hover text-2xl font-bold"
          >
            {{ profile.displayName[0]?.toUpperCase() }}
          </div>
          <button
            v-if="isOwnProfile"
            class="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-tambouille-accent text-white hover:bg-tambouille-accent-hover"
            title="Changer la photo"
            @click="avatarInput?.click()"
          >
            <svg viewBox="0 0 24 24" class="h-4 w-4 fill-current">
              <path
                d="M9 3l-1.83 2H4a2 2 0 00-2 2v11a2 2 0 002 2h16a2 2 0 002-2V7a2 2 0 00-2-2h-3.17L15 3H9zm3 15a5 5 0 110-10 5 5 0 010 10z"
              />
            </svg>
          </button>
          <input ref="avatarInput" type="file" accept="image/*" class="hidden" @change="onAvatarChange" />
        </div>

        <div class="flex-1 text-center sm:text-left">
          <template v-if="!editing">
            <h1 class="text-2xl font-bold">{{ profile.displayName }}</h1>
            <p class="text-tambouille-muted">@{{ profile.username }}</p>
            <p v-if="profile.bio" class="mt-2 whitespace-pre-line text-sm">{{ profile.bio }}</p>
            <p class="mt-2 text-xs text-tambouille-muted">{{ profile.mixesCount }} mixs</p>
            <button
              v-if="isOwnProfile"
              class="mt-3 rounded-full border border-tambouille-border px-4 py-1.5 text-sm hover:bg-tambouille-surface-hover"
              @click="editing = true"
            >
              Modifier le profil
            </button>
          </template>

          <form v-else class="mx-auto max-w-sm space-y-3 sm:mx-0" @submit.prevent="saveProfile">
            <input
              v-model="editDisplayName"
              type="text"
              maxlength="50"
              class="w-full rounded-lg border border-tambouille-border bg-tambouille-surface px-3 py-2 outline-none focus:border-tambouille-accent"
            />
            <textarea
              v-model="editBio"
              rows="3"
              maxlength="280"
              placeholder="Bio"
              class="w-full rounded-lg border border-tambouille-border bg-tambouille-surface px-3 py-2 outline-none focus:border-tambouille-accent"
            />
            <div class="flex gap-2">
              <button
                type="submit"
                :disabled="savingProfile"
                class="rounded-full bg-tambouille-accent px-4 py-1.5 text-sm font-semibold text-white hover:bg-tambouille-accent-hover disabled:opacity-50"
              >
                Enregistrer
              </button>
              <button
                type="button"
                class="rounded-full border border-tambouille-border px-4 py-1.5 text-sm hover:bg-tambouille-surface-hover"
                @click="editing = false"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>

      <h2 class="mb-4 text-lg font-semibold">Mixs</h2>
      <div v-if="mixes.length === 0" class="py-8 text-center text-tambouille-muted">Aucun mix pour l'instant.</div>
      <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        <MixCard v-for="mix in mixes" :key="mix.id" :mix="mix" />
      </div>
    </template>
  </div>
</template>
