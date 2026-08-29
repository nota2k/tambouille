<script setup lang="ts">
import { useTransitionDePage } from '@/composables/useTransitionDePage'

/**
 * Le voile rose posé entre deux pages, le temps que les pochettes arrivent.
 *
 * `animation` et non `transition` : une transition d'opacité s'est déjà figée
 * ici — `currentTime` bloqué à 8 ms sur 200, état « running », élément resté
 * invisible même ramené dans la fenêtre (voir l'historique de `CoverImage`).
 * Une animation avec `forwards` ne dépend pas du même mécanisme et se termine
 * sur sa dernière image quoi qu'il arrive. Le retrait du nœud, lui, ne dépend
 * d'aucun des deux : c'est une minuterie qui l'ôte.
 *
 * `pointer-events: none` de bout en bout : le voile ne doit jamais retenir un
 * clic, y compris pendant qu'il est plein. Un lien qu'on ne voit pas encore
 * reste cliquable, ce qui vaut mieux qu'une page morte pendant une seconde.
 *
 * `aria-hidden` : il n'y a rien à annoncer. Ce que fait la page se lit dans la
 * page — c'est le rôle des squelettes de fournée et des boîtes réservées, pas
 * celui d'un aplat de couleur.
 */
const { visible, sortie } = useTransitionDePage()
</script>

<template>
  <div
    v-if="visible"
    class="tb-voile"
    :class="sortie ? 'tb-voile--sortie' : ''"
    aria-hidden="true"
  />
</template>

<style scoped>
.tb-voile {
  position: fixed;
  inset: 0;
  /* Au-dessus de tout, barre de lecture et volet mobile compris — ceux-ci
     montent à 1100. En dessous de rien, puisque rien ne doit passer devant. */
  z-index: 2000;
  background-color: var(--color-tambouille-accent);
  pointer-events: none;
}

.tb-voile--sortie {
  animation: tb-voile-sortie 550ms ease forwards;
}

@keyframes tb-voile-sortie {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

/*
 * Un aplat plein écran qui apparaît et disparaît à chaque navigation est
 * exactement ce que ce réglage demande d'éviter. Le voile ne s'affiche donc
 * pas du tout : la page arrive sans fondu, ce qui est le comportement voulu.
 */
@media (prefers-reduced-motion: reduce) {
  .tb-voile {
    display: none;
  }
}
</style>
