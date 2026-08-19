<script setup lang="ts">
import { onMounted } from 'vue'
import NavBar from '@/components/NavBar.vue'
import EcoutezAilleurs from '@/components/EcoutezAilleurs.vue'
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
  <div
    class="flex min-h-screen flex-col text-tambouille-text"
    :class="playerStore.currentMix ? 'pb-28' : ''"
  >
    <NavBar />
    <main class="flex-1 pb-16">
      <RouterView />
    </main>
    <!-- Sous chaque page, avant le pied de page : c'est la « bande de pied de
         page » du gabarit 4b. Elle sort les auditeurs du site, donc elle vient
         après tout le reste. -->
    <EcoutezAilleurs />
    <AppFooter />
    <PlayerBar />
  </div>
</template>
