<script setup lang="ts">
/**
 * Le rouage qui tourne pendant qu'une image arrive.
 *
 * Trois anneaux concentriques, chacun en deux traits — un pâle qui reste, un
 * franc qui court. Les six animations sont décalées de quelques centièmes, ce
 * qui donne au mouvement son léger retard d'un anneau sur l'autre.
 *
 * `currentColor` : le rouage prend la couleur du texte de son conteneur. Posé
 * sur le gris de la boîte de pochette il est discret, posé sur l'aplat d'une
 * fournée il prend son encre — sans que rien ici n'ait à connaître l'un ou
 * l'autre.
 */
withDefaults(defineProps<{ label?: string }>(), { label: 'Chargement' })
</script>

<template>
  <!-- `img` avec un nom accessible plutôt qu'un SVG décoratif : quelque chose
       est en train de se passer, et une technologie d'assistance doit pouvoir
       le dire. Pas de `status` ni de `live` en revanche — une vingtaine de
       pochettes qui chargent annonceraient vingt fois la même chose. -->
  <svg
    class="tb-loader"
    viewBox="0 0 96 96"
    role="img"
    :aria-label="label"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g class="outer">
      <circle class="back" cx="43" cy="43" r="40" />
      <circle class="front" cx="43" cy="43" r="40" />
    </g>
    <g class="middle">
      <circle class="back" cx="43" cy="43" r="27" />
      <circle class="front" cx="43" cy="43" r="27" />
    </g>
    <g class="inner">
      <circle class="back" cx="43" cy="43" r="14" />
      <circle class="front" cx="43" cy="43" r="14" />
    </g>
  </svg>
</template>

<style scoped>
.tb-loader :is(.front, .back) {
  fill: none;
  stroke-width: 6px;
  stroke: currentColor;
  transform-origin: center;
  transform: rotate(-100deg);
}

.back {
  opacity: 0.5;
}

.back,
.front {
  stroke-dasharray: 22 66;
}

.outer circle {
  stroke-dasharray: 62.75 188.25;
}
.outer circle.back {
  animation: circle-outer135 1.8s ease infinite 0.3s;
}
.outer circle.front {
  animation: circle-outer135 1.8s ease infinite 0.15s;
}

.middle circle {
  stroke-dasharray: 42.5 127.5;
}
.middle circle.back {
  animation: circle-middle6123 1.8s ease infinite 0.25s;
}
.middle circle.front {
  animation: circle-middle6123 1.8s ease infinite 0.1s;
}

.inner circle {
  stroke-dasharray: 22 66;
}
.inner circle.back {
  animation: circle-inner162 1.8s ease infinite 0.2s;
}
.inner circle.front {
  animation: circle-inner162 1.8s ease infinite 0.05s;
}

/*
 * Une animation qui tourne sans fin déclenche des nausées chez une partie des
 * lecteurs, et le réglage système est leur seul recours. Les anneaux
 * s'immobilisent alors sur leur position d'ouverture : la boîte reste occupée,
 * on lit toujours « quelque chose arrive », mais plus rien ne bouge.
 */
@media (prefers-reduced-motion: reduce) {
  .tb-loader circle {
    animation: none !important;
  }
}

@keyframes circle-outer135 {
  0% {
    stroke-dashoffset: 25;
  }
  25% {
    stroke-dashoffset: 0;
  }
  65% {
    stroke-dashoffset: 301;
  }
  80% {
    stroke-dashoffset: 276;
  }
  100% {
    stroke-dashoffset: 276;
  }
}

@keyframes circle-middle6123 {
  0% {
    stroke-dashoffset: 17;
  }
  25% {
    stroke-dashoffset: 0;
  }
  65% {
    stroke-dashoffset: 204;
  }
  80% {
    stroke-dashoffset: 187;
  }
  100% {
    stroke-dashoffset: 187;
  }
}

@keyframes circle-inner162 {
  0% {
    stroke-dashoffset: 9;
  }
  25% {
    stroke-dashoffset: 0;
  }
  65% {
    stroke-dashoffset: 106;
  }
  80% {
    stroke-dashoffset: 97;
  }
  100% {
    stroke-dashoffset: 97;
  }
}
</style>
