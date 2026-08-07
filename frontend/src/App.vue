<script setup lang="ts">
import { onMounted } from 'vue'
import NavBar from '@/components/NavBar.vue'
import PlayerBar from '@/components/PlayerBar.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

onMounted(() => {
  if (authStore.accessToken) {
    authStore.fetchCurrentUser().catch(() => authStore.logout())
  }
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-tambouille-bg text-tambouille-text">
    <NavBar />
    <main class="flex-1 pb-28">
      <RouterView />
    </main>
    <PlayerBar />
  </div>
</template>
