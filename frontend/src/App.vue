<script setup lang="ts">
import { onMounted } from 'vue'
import NavBar from '@/components/NavBar.vue'
import EcoutezAilleurs from '@/components/EcoutezAilleurs.vue'
import AppFooter from '@/components/AppFooter.vue'
import PlayerBar from '@/components/PlayerBar.vue'
import PageFade from '@/components/PageFade.vue'
import { useAuthStore } from '@/stores/auth'
import { usePlayerStore } from '@/stores/player'
import { useSmoothScroll } from '@/composables/useSmoothScroll'

const authStore = useAuthStore()
const playerStore = usePlayerStore()

// Le défilement est un état de la fenêtre, pas d'une page : il s'installe ici,
// une seule fois, plutôt que dans chaque vue.
useSmoothScroll()

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
    <!--
         `min-h` en plus de `flex-1`, et ce n'est pas une ceinture avec des
         bretelles : `flex-1` seul étire `main` jusqu'à ce que le conteneur
         atteigne `min-h-screen`, PAS au-delà. Tant que la route n'a rien rendu,
         `main` ne mesure donc que la place restante — 544 px sur un écran de
         940 — et `EcoutezAilleurs` puis `AppFooter` se peignent dans le premier
         écran, à y=608. Quand le composant de route arrive (un chunk paresseux,
         donc une image plus tard sur un cache froid), les 332 px de bas de page
         sont chassés sous la ligne de flottaison d'un seul coup : 0,3644 de
         décalage cumulé le 29 août 2026, soit 86 % du total, pour un seuil de
         0,1.

         La hauteur minimale les place hors écran dès la première peinture. Ils
         descendent toujours, mais un déplacement hors du cadre ne se voit pas
         et ne se compte pas. Elle rend aussi la barre de défilement présente
         d'emblée, ce qui supprime les 10 px dont l'en-tête glissait.

         `4rem` est la hauteur de l'en-tête — le `h-16` de `NavBar.vue`. Les
         deux valeurs doivent bouger ensemble ; trop grande, la page gagne du
         vide en bas, trop petite, le bas de page revient dans l'écran et le
         saut avec lui.
    -->
    <main class="min-h-[calc(100vh-4rem)] flex-1 pb-16">
      <RouterView />
    </main>
    <!-- Sous chaque page, avant le pied de page : c'est la « bande de pied de
         page » du gabarit 4b. Elle sort les auditeurs du site, donc elle vient
         après tout le reste. -->
    <EcoutezAilleurs />
    <AppFooter />
    <PlayerBar />
    <!-- Hors du flux et par-dessus tout le reste : le voile ne participe à
         aucune mise en page, donc il ne peut rien décaler. -->
    <PageFade />
  </div>
</template>
