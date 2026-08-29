<script setup lang="ts">
import { onUnmounted, watchEffect } from 'vue'

/**
 * Le lien d'abonnement d'une page, sous ses deux formes : celle que voit un
 * visiteur, et celle que lisent les lecteurs RSS et les extensions de
 * navigateur — la balise `<link rel="alternate">` du document.
 *
 * Les deux ensemble dans un seul composant parce qu'elles disent la même chose
 * et qu'aucune page n'en veut une sans l'autre. Le projet n'embarque pas de
 * gestionnaire de `<head>` ; ces quelques lignes évitent d'en ajouter un pour
 * une balise.
 */
const props = withDefaults(
  defineProps<{
    href: string
    title: string
    /**
     * Ne poser que la balise du `<head>`, sans bouton visible.
     *
     * Sert au flux du site sur l'accueil, où celui de la fournée garde seul son
     * bouton : les deux étaient jumeaux — même icône, même taille — et rien à
     * l'œil ne disait lequel menait où. Le flux, lui, reste annonçable : c'est
     * par cette balise que les lecteurs RSS et les extensions le trouvent, sans
     * qu'il encombre la barre de titre.
     */
    headOnly?: boolean
  }>(),
  { headOnly: false },
)

let balise: HTMLLinkElement | undefined

watchEffect(() => {
  balise ??= document.head.appendChild(document.createElement('link'))
  balise.rel = 'alternate'
  balise.type = 'application/rss+xml'
  balise.href = props.href
  balise.title = props.title
})

// Sans ce retrait, naviguer d'un profil à l'autre laisserait s'accumuler les
// flux de tous les profils visités — une SPA ne recharge pas son document.
onUnmounted(() => balise?.remove())
</script>

<template>
  <a
    v-if="!headOnly"
    :href="href"
    :title="`S’abonner : ${title}`"
    :aria-label="`S’abonner au flux podcast — ${title}`"
    class="flex items-center justify-center rounded-none border border-tambouille-muted px-2 text-sm hover:bg-tambouille-surface-hover"
  >
    <svg viewBox="0 0 24 24" class="h-4 w-4 fill-current">
      <circle cx="6.18" cy="17.82" r="2.18" />
      <path
        d="M4 4.44v2.83c7.03 0 12.73 5.7 12.73 12.73h2.83c0-8.59-6.97-15.56-15.56-15.56zm0 5.66v2.83c3.9 0 7.07 3.17 7.07 7.07h2.83c0-5.47-4.43-9.9-9.9-9.9z"
      />
    </svg>
  </a>
</template>
