<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { mediaUrl } from '@/utils/media'

const authStore = useAuthStore()
const router = useRouter()
const menuOpen = ref(false)

function logout() {
  authStore.logout()
  menuOpen.value = false
  router.push({ name: 'discover' })
}
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-tambouille-border bg-tambouille-bg/90 backdrop-blur">
    <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
      <RouterLink to="/" class="flex items-center gap-2 text-2xl font-bold tracking-tight">
        <span class="text-tambouille-accent" style="font-family: 'Gulax', sans-serif">Tambouille</span>
      </RouterLink>

      <nav class="flex items-center gap-4">
        <RouterLink
          to="/"
          class="text-sm font-medium text-tambouille-muted hover:text-tambouille-text"
          active-class="!text-tambouille-text"
        >
          Découvrir
        </RouterLink>

        <template v-if="authStore.isAuthenticated">
          <RouterLink
            to="/upload"
            class="rounded-full bg-tambouille-accent px-4 py-2 text-sm font-semibold text-white hover:bg-tambouille-accent-hover"
          >
            Uploader
          </RouterLink>

          <div class="relative">
            <button
              class="flex items-center gap-2 rounded-full border border-tambouille-border px-2 py-1 hover:bg-tambouille-surface-hover"
              @click="menuOpen = !menuOpen"
            >
              <img
                v-if="authStore.user?.avatarUrl"
                :src="mediaUrl(authStore.user.avatarUrl)"
                class="h-7 w-7 rounded-full object-cover"
                alt=""
              />
              <div
                v-else
                class="flex h-7 w-7 items-center justify-center rounded-full bg-tambouille-surface-hover text-xs font-semibold"
              >
                {{ authStore.user?.displayName?.[0]?.toUpperCase() }}
              </div>
            </button>

            <div
              v-if="menuOpen"
              class="absolute right-0 mt-2 w-48 rounded-lg border border-tambouille-border bg-tambouille-surface py-1 shadow-xl"
              @mouseleave="menuOpen = false"
            >
              <RouterLink
                v-if="authStore.user"
                :to="{ name: 'profile', params: { username: authStore.user.username } }"
                class="block px-4 py-2 text-sm hover:bg-tambouille-surface-hover"
                @click="menuOpen = false"
              >
                Mon profil
              </RouterLink>
              <button
                class="block w-full px-4 py-2 text-left text-sm hover:bg-tambouille-surface-hover"
                @click="logout"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </template>

        <template v-else>
          <RouterLink to="/login" class="text-sm font-medium text-tambouille-muted hover:text-tambouille-text">
            Connexion
          </RouterLink>
          <RouterLink
            to="/register"
            class="rounded-full bg-tambouille-accent px-4 py-2 text-sm font-semibold text-white hover:bg-tambouille-accent-hover"
          >
            S'inscrire
          </RouterLink>
        </template>
      </nav>
    </div>
  </header>
</template>
