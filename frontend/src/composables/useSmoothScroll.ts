import { onBeforeUnmount, onMounted } from 'vue'
import Lenis from 'lenis'

/**
 * Défilement inertiel : la page continue sur sa lancée et rattrape la molette
 * avec un amorti.
 *
 * Le CSS ne sait pas faire ça — `scroll-behavior: smooth` n'agit que sur les
 * sauts programmés (ancres, `scrollIntoView`), jamais sur la molette, dont
 * l'inertie appartient au navigateur. Lenis intercepte l'événement et anime la
 * position lui-même.
 *
 * Deux réglages sont volontairement laissés au système :
 *
 * - **Le tactile.** `syncTouch` reste à `false` : l'inertie native d'un
 *   téléphone est meilleure que tout ce qu'on réimplémenterait, et la
 *   remplacer se sent immédiatement.
 * - **Le mouvement réduit.** Qui a demandé moins d'animations à son système
 *   garde le défilement natif : on ne démarre simplement pas Lenis. C'est le
 *   seul recours de ceux à qui un défilement animé donne la nausée.
 */
export function useSmoothScroll() {
  let lenis: Lenis | null = null
  let frame = 0

  onMounted(() => {
    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduit.matches) return

    lenis = new Lenis({
      // Assez court pour que la page réponde, assez long pour qu'elle glisse.
      duration: 1.1,
      smoothWheel: true,
      syncTouch: false,
    })

    const boucle = (temps: number) => {
      lenis?.raf(temps)
      frame = requestAnimationFrame(boucle)
    }
    frame = requestAnimationFrame(boucle)
  })

  onBeforeUnmount(() => {
    // La boucle `raf` tourne tant qu'on ne l'arrête pas : sans ceci, elle
    // survivrait au composant et continuerait d'animer un document démonté.
    if (frame) cancelAnimationFrame(frame)
    lenis?.destroy()
    lenis = null
  })
}
