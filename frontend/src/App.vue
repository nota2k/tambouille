<script setup lang="ts">
import { onMounted } from 'vue'
import NavBar from '@/components/NavBar.vue'
import AppFooter from '@/components/AppFooter.vue'
import PlayerBar from '@/components/PlayerBar.vue'
import { useAuthStore } from '@/stores/auth'
import { usePlayerStore } from '@/stores/player'

const authStore = useAuthStore()
const playerStore = usePlayerStore()

onMounted(() => {
  if (authStore.accessToken) {
    authStore.fetchCurrentUser().catch(() => authStore.logout())
  }
})
</script>

<template>
  <!-- pb-28 sur le conteneur, pas sur main : la barre de lecture est en position
       fixe, et le pied de page doit lui aussi rester au-dessus d'elle. -->
  <div class="flex min-h-screen flex-col text-tambouille-text" :class="playerStore.currentMix ? 'pb-28' : ''">
    <NavBar />
    <main class="flex-1">
      <RouterView />
    </main>
    <AppFooter />
    <PlayerBar />
  </div>
</template>
