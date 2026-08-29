<script setup lang="ts">
import { onMounted, ref, useTemplateRef, watch } from 'vue'
import { signalerImage } from '@/composables/useTransitionDePage'

/**
 * Une pochette et sa place réservée.
 *
 * La boîte est occupée dès le premier rendu, avant que l'image ne soit
 * demandée : c'est elle qui empêche la carte de grandir d'un coup quand la
 * pochette arrive. Les conteneurs d'appel imposent presque tous un format
 * carré, `min-height` n'est qu'un garde-fou pour ceux qui ne contraindraient
 * rien.
 *
 * Ce qui se passe pendant l'attente ne se joue plus ici mais à l'échelle de la
 * page : le voile rose de `useTransitionDePage` couvre l'écran entier tant que
 * les pochettes ne sont pas là. Ce composant se contente de lui dire où il en
 * est.
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
    /**
     * Les largeurs disponibles, construites par `mediaSrcset`.
     *
     * Facultatif, et c'est délibéré : un appelant qui ne le passe pas garde
     * exactement le comportement d'avant — une seule image, en pleine taille.
     * Rien ne casse tant que tous les appels ne sont pas repris.
     */
    srcset?: string
    /**
     * La place que la pochette occupe réellement, pour que le navigateur
     * choisisse. Sans `sizes`, il suppose 100vw et prend systématiquement la
     * plus grande — ce qui annulerait tout le gain.
     *
     * En cas de doute, surestimer : le navigateur prend alors une image trop
     * grande, c'est-à-dire le comportement actuel. Sous-estimer donne une
     * pochette floue, qui est un vrai défaut.
     */
    sizes?: string
  }>(),
  { alt: '', priority: false, imgClass: '', srcset: undefined, sizes: undefined },
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
  if (el?.complete && el.naturalWidth > 0) marquerArrivee()
}

/** Une seule annonce par pochette, quoi qu'il arrive ensuite. */
function marquerArrivee() {
  if (chargee.value) return
  chargee.value = true
  signalerImage.arrivee()
}

onMounted(() => {
  // Annoncé avant la vérification du cache : une pochette déjà en cache passe
  // alors immédiatement de « attendue » à « arrivée », ce qui est vrai, plutôt
  // que de n'être jamais comptée.
  if (props.src) signalerImage.attendue()
  verifierLeCache()
})

// La même carte peut servir deux mix de suite — une bande qui défile, une
// recherche qui se relance. Le rouage doit alors revenir.
watch(
  () => props.src,
  () => {
    chargee.value = false
    if (props.src) signalerImage.attendue()
    // Le `src` de l'élément n'est à jour qu'après le rendu.
    requestAnimationFrame(verifierLeCache)
  },
)

/**
 * Une pochette qui ne répond pas laisse la boîte grise plutôt que le rouage :
 * un rouage éternel dit « ça arrive » à quelqu'un qui attendrait pour rien.
 */
function surEchec() {
  marquerArrivee()
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
      :srcset="srcset"
      :sizes="sizes"
      :alt="alt"
      :loading="priority ? 'eager' : 'lazy'"
      :fetchpriority="priority ? 'high' : 'auto'"
      decoding="async"
      class="h-full w-full object-cover"
      :class="imgClass"
      @load="marquerArrivee"
      @error="surEchec"
    />

    <!-- Sans pochette, ce que le composant appelant veut mettre à la place. -->
    <slot v-if="!src" name="vide" />
  </div>
</template>
