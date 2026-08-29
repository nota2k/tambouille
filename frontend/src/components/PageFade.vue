<script setup lang="ts">
import { useTransitionDePage } from '@/composables/useTransitionDePage'

/**
 * Le volet rose qui passe entre deux pages, le temps que les pochettes arrivent.
 *
 * Un seul balayage vers le haut, en deux temps séparés par l'attente : il monte
 * du bas jusqu'à couvrir, tient, puis continue et sort par le haut. Il ne
 * redescend jamais — la page suivante se découvre du bas vers le haut.
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
const { visible, sortie, dureeDeLaMontee, dureeDeLaSortie } = useTransitionDePage()
</script>

<template>
  <div
    v-if="visible"
    class="tb-volet"
    :class="sortie ? 'tb-volet--sortie' : ''"
    :style="{
      '--tb-montee': `${dureeDeLaMontee}ms`,
      '--tb-sortie': `${dureeDeLaSortie}ms`,
    }"
    aria-hidden="true"
  />
</template>

<style scoped>
.tb-volet {
  position: fixed;
  inset: 0;
  /* Au-dessus de tout, barre de lecture et volet mobile compris — ceux-ci
     montent à 1100. En dessous de rien, puisque rien ne doit passer devant. */
  z-index: 2000;
  background-color: var(--color-tambouille-accent);
  pointer-events: none;
  /* Le volet part sous l'écran et y monte. `forwards` le laisse sur sa
     dernière image : arrivé, il couvre, et il y reste jusqu'à sa sortie. */
  animation: tb-volet-montee var(--tb-montee) cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

/* La montée est terminée ou n'a plus lieu d'être : le volet repart par le haut,
   depuis là où il est. La déclaration l'emporte sur celle du dessus, et
   remplace donc l'animation d'entrée plutôt que de s'y ajouter. */
.tb-volet--sortie {
  animation: tb-volet-sortie var(--tb-sortie) cubic-bezier(0.65, 0, 0.35, 1) forwards;
}

@keyframes tb-volet-montee {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes tb-volet-sortie {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-100%);
  }
}

/*
 * Un aplat plein écran qui balaie l'écran à chaque navigation est exactement ce
 * que ce réglage demande d'éviter. Le voile ne s'affiche donc
 * pas du tout : la page arrive sans fondu, ce qui est le comportement voulu.
 */
@media (prefers-reduced-motion: reduce) {
  .tb-volet {
    display: none;
  }
}
</style>
