<script setup lang="ts">
import { onMounted, ref, useTemplateRef, watch } from 'vue'
import TambouilleLoader from './TambouilleLoader.vue'

/**
 * Une pochette, sa place réservée, et le rouage qui tourne en attendant.
 *
 * La boîte est occupée dès le premier rendu, avant que l'image ne soit
 * demandée : c'est elle qui empêche la carte de grandir d'un coup quand la
 * pochette arrive. Les conteneurs d'appel imposent presque tous un format
 * carré, `min-height` n'est qu'un garde-fou pour ceux qui ne contraindraient
 * rien.
 */
const props = withDefaults(
  defineProps<{
    src?: string
    alt?: string
    /**
     * Vrai pour ce qui est visible dès l'arrivée : l'image part sans attendre
     * la mise en page. Faux — donc différé — pour tout ce qui est plus bas.
     */
    priority?: boolean
    /** Ce qui s'ajoute à l'image elle-même : `mix-blend-luminosity` sur les fournées. */
    imgClass?: string
  }>(),
  { alt: '', priority: false, imgClass: '' },
)

const image = useTemplateRef<HTMLImageElement>('image')
const chargee = ref(false)

/**
 * Une image déjà en cache est complète avant que Vue n'ait posé son écouteur :
 * `load` ne se déclenchera jamais, et le rouage tournerait indéfiniment
 * par-dessus une pochette parfaitement visible. `complete` est la seule façon
 * de le savoir après coup.
 *
 * `naturalWidth` en plus de `complete` : une image en échec est elle aussi
 * « complète », mais large de zéro.
 */
function verifierLeCache() {
  const el = image.value
  if (el?.complete && el.naturalWidth > 0) chargee.value = true
}

onMounted(verifierLeCache)

// La même carte peut servir deux mix de suite — une bande qui défile, une
// recherche qui se relance. Le rouage doit alors revenir.
watch(
  () => props.src,
  () => {
    chargee.value = false
    // Le `src` de l'élément n'est à jour qu'après le rendu.
    requestAnimationFrame(verifierLeCache)
  },
)

/**
 * Une pochette qui ne répond pas laisse la boîte grise plutôt que le rouage :
 * un rouage éternel dit « ça arrive » à quelqu'un qui attendrait pour rien.
 */
function surEchec() {
  chargee.value = true
}
</script>

<template>
  <div class="relative h-full w-full min-h-12">
    <!--
      L'image n'est jamais masquée, et son opacité n'est jamais animée.

      La version d'avant la révélait par un fondu de 200 ms. Mesuré dans le
      navigateur : la transition se fige — `currentTime` bloqué à 8 ms sur 200,
      état « running », opacité à 0,004 — et la pochette reste invisible même
      une fois ramenée dans la fenêtre. Neutraliser la transition la fait sauter
      à 1, donc rien d'autre ne la retenait. Une pochette qu'on ne voit pas est
      un prix trop élevé pour un fondu.

      Le rouage se pose donc PAR-DESSUS plutôt que l'image ne se dévoile en
      dessous : rien à animer sur l'image, rien qui puisse se coincer. Ce qu'on
      voit pendant le chargement est le gris du conteneur, comme avant.
    -->
    <img
      v-if="src"
      ref="image"
      :src="src"
      :alt="alt"
      :loading="priority ? 'eager' : 'lazy'"
      :fetchpriority="priority ? 'high' : 'auto'"
      decoding="async"
      class="h-full w-full object-cover"
      :class="imgClass"
      @load="chargee = true"
      @error="surEchec"
    />

    <!-- Au centre, et à l'échelle de la boîte : un tiers de sa largeur, borné
         pour qu'il ne devienne ni un point sur la pochette à la une ni une roue
         de charrette sur une vignette de flux. -->
    <span
      v-if="src && !chargee"
      class="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      <TambouilleLoader class="h-1/3 max-h-14 w-1/3 max-w-14 opacity-60" />
    </span>

    <!-- Sans pochette, ce que le composant appelant veut mettre à la place. -->
    <slot v-if="!src" name="vide" />
  </div>
</template>
