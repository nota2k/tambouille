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
import { useTransitionDePage } from '@/composables/useTransitionDePage'

const authStore = useAuthStore()
const playerStore = usePlayerStore()

// Le défilement est un état de la fenêtre, pas d'une page : il s'installe ici,
// une seule fois, plutôt que dans chaque vue.
useSmoothScroll()

/**
 * Le contenu de route attend sous le volet, à opacité nulle, et se révèle
 * pendant que celui-ci sort. Sans cela, la partie que le volet n'a pas encore
 * couverte pendant sa montée laisserait voir la page en train de charger.
 *
 * Seul `<main>` est concerné : la barre de navigation et le pied de page ne
 * changent pas d'une route à l'autre, et les faire disparaître à chaque
 * navigation serait un clignotement, pas une transition.
 */
const { visible: sousLeVolet, sortie: voletQuiSort, dureeDeLaSortie } = useTransitionDePage()

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
    <main
      class="min-h-[calc(100vh-4rem)] flex-1 pb-16"
      :class="voletQuiSort ? 'tb-contenu-revele' : sousLeVolet ? 'tb-contenu-couvert' : ''"
      :style="{ '--tb-sortie': `${dureeDeLaSortie}ms` }"
    >
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

<style>
/*
 * ─────────────────────────────────────────────────────────────────────────────
 * LA MÊME RÈGLE QUE POUR LE VOLET, ET POUR LA MÊME RAISON
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Un contenu à opacité nulle est un contenu invisible : s'il ne revient pas,
 * il n'y a plus de page. Il ne dépend donc que de `sortie`, que trois
 * minuteries indépendantes garantissent — voir `useTransitionDePage`. Aucune
 * classe ici n'attend un `animationend`.
 */
.tb-contenu-couvert {
  opacity: 0;
}

.tb-contenu-revele {
  animation: tb-contenu-apparition var(--tb-sortie) ease forwards;
}

@keyframes tb-contenu-apparition {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/*
 * Sans cette exception, le mouvement réduit rendrait la page BLANCHE.
 *
 * Le volet ne s'y affiche pas — c'est voulu — mais `visible` reste vrai, et le
 * contenu resterait donc à opacité nulle sans rien par-dessus pour le masquer :
 * une page vide pendant plus d'une seconde, à chaque navigation. Le réglage qui
 * demande moins d'animations doit rendre la page immédiatement, pas la retirer.
 */
@media (prefers-reduced-motion: reduce) {
  .tb-contenu-couvert,
  .tb-contenu-revele {
    opacity: 1;
    animation: none;
  }
}
</style>
