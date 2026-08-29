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
/**
 * L'instance en cours, tenue au niveau du module et non dans la fermeture.
 *
 * Le routeur a besoin de la joindre pour poser la page au changement de route,
 * et il n'est pas un composant : il ne peut pas appeler `useSmoothScroll`.
 * Une seule instance existe de toute façon — `App.vue` monte le composable une
 * fois, pour toute la durée de vie de l'application.
 */
let lenis: Lenis | null = null

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * S'ABONNER AU DÉFILEMENT — ET POURQUOI `window` NE SUFFIT PAS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Quand Lenis tourne, `window` NE REÇOIT AUCUN ÉVÉNEMENT `scroll`. Mesuré :
 * `document.documentElement.scrollTop` passe bien de 0 à 900, et un écouteur
 * posé sur `window` compte zéro événement. Lenis anime la position lui-même,
 * frame par frame, et publie son avancement par son propre émetteur.
 *
 * Tout ce qui veut suivre le défilement doit donc passer par ici. Un
 * `addEventListener('scroll')` posé ailleurs dans l'application a l'air correct,
 * ne lève aucune erreur, et ne se déclenche jamais — c'est le genre de panne
 * qui coûte une heure.
 *
 * La position est relue à chaque frame par la boucle de `useSmoothScroll`, qui
 * explique pourquoi ni Lenis ni `window` ne suffisent.
 */
type Abonne = (y: number) => void

const abonnes = new Set<Abonne>()

/**
 * Prévient les abonnés, si la page a bougé.
 *
 * Le garde sur la position est ce qui rend l'appel par frame gratuit : sans
 * défilement, la boucle ne fait qu'une comparaison de nombres.
 */
let dernierY = -1

function diffuser() {
  const y = window.scrollY
  if (y === dernierY) return
  dernierY = y
  for (const abonne of abonnes) abonne(y)
}

/**
 * S'abonne à la position de défilement. Rend la fonction qui désabonne.
 *
 * L'abonnement fonctionne avant que Lenis n'existe : les `onMounted` des
 * enfants courent AVANT celui du parent, et `App.vue` est le parent qui monte
 * Lenis. Les abonnés sont donc tenus dans un ensemble au niveau du module, que
 * Lenis alimente une fois créé.
 */
export function ecouterLeDefilement(abonne: Abonne): () => void {
  abonnes.add(abonne)
  abonne(window.scrollY)
  return () => {
    abonnes.delete(abonne)
  }
}

/**
 * Pose la page à `cible` sans l'y conduire : un changement de route n'est pas
 * un défilement, c'est une autre page.
 *
 * Passe par Lenis quand il tourne. C'est l'essentiel de cette fonction : Lenis
 * tient sa propre position et la réapplique à chaque frame, si bien qu'un
 * `window.scrollTo` peut être rattrapé — et l'est d'autant plus sûrement que la
 * roulette n'a pas fini sa course quand le lien est cliqué. Lui demander à lui
 * met sa position interne d'accord avec celle du document, ce qu'aucun appel
 * extérieur ne fait.
 *
 * `immediate` pour ne pas animer, `force` pour que la demande passe même si
 * Lenis est arrêté ou verrouillé à cet instant.
 *
 * Le repli sert au mouvement réduit, où Lenis ne démarre pas. `'instant'` y est
 * nécessaire : `main.css` pose `scroll-behavior: smooth` sur `html:not(.lenis)`,
 * et `'auto'` s'en remettrait à cette valeur — donc animerait, chez les
 * lecteurs qui ont demandé qu'on ne leur anime rien.
 */
export function poserLaPage(cible: number | string) {
  poser(cible)

  // Une seconde fois à la frame suivante, et ce n'est pas une ceinture avec des
  // bretelles : `scrollBehavior` court avant que la vue qui arrive ait été
  // mesurée. Le premier appel sert le cas courant, celui-ci rattrape les pages
  // dont la hauteur n'était pas encore connue — c'est là que la limite périmée
  // de Lenis faisait échouer la pose. L'opération est idempotente : les deux
  // visent le même point.
  requestAnimationFrame(() => poser(cible))
}

function poser(cible: number | string) {
  if (lenis) {
    // `resize()` d'abord, sans quoi Lenis pose la page contre une limite
    // mesurée pour la vue précédente. Observé : une limite de 421 px sur un
    // document de 4093, et une remise en haut qui ne bougeait pas le document —
    // la position interne passait bien à 0, le défilement réel restait où il
    // était, puis remontait à la valeur rognée par la nouvelle hauteur.
    lenis.resize()
    lenis.scrollTo(cible, { immediate: true, force: true })
    return
  }

  if (typeof cible === 'number') {
    window.scrollTo({ top: cible, left: 0, behavior: 'instant' })
    return
  }

  document.querySelector(cible)?.scrollIntoView({ behavior: 'instant' })
}

export function useSmoothScroll() {
  let frame = 0

  onMounted(() => {
    /*
     * Les DEUX sources, toujours, et ce n'est pas une ceinture avec des
     * bretelles.
     *
     * Chacune a un angle mort. L'écouteur natif ne voit rien de ce que Lenis
     * anime lui-même. L'émetteur de Lenis, lui, ne connaît que SES
     * déplacements : un `window.scrollTo` venu d'ailleurs — le navigateur qui
     * restaure une position, une ancre, du code tiers — bouge le document sans
     * qu'il en sache rien.
     *
     * Les deux appellent le même `diffuser`, qui relit `window.scrollY` : une
     * double notification pour un même déplacement ne coûte qu'un calcul
     * identique, alors qu'un déplacement manqué fige la couche pour de bon.
     */
    window.addEventListener('scroll', diffuser, { passive: true })

    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduit.matches) return

    lenis = new Lenis({
      // Assez court pour que la page réponde, assez long pour qu'elle glisse.
      duration: 1.1,
      smoothWheel: true,
      syncTouch: false,
    })

    // C'est cet abonnement qui rattrape ce que `window` ne dit pas.
    lenis.on('scroll', diffuser)

    /*
     * `diffuser` est appelé DEPUIS la boucle, et c'est la seule façon fiable.
     *
     * Ni l'émetteur de Lenis ni l'événement `scroll` de `window` ne suffisent.
     * Mesuré sur ce site : un `window.scrollTo(0, 700)` déplace bien le
     * document — le contenu monte de 700 pixels — et un écouteur posé sur
     * `window` compte ZÉRO événement. L'émetteur de Lenis, lui, ne connaît que
     * ce qu'il a animé, donc rien de ce déplacement-là.
     *
     * La boucle, en revanche, tourne déjà à chaque frame pour Lenis. Y ajouter
     * une lecture de `window.scrollY` ne coûte rien et ne peut rien manquer :
     * peu importe qui a bougé la page, on lit où elle est.
     *
     * `diffuser` ne fait rien quand la position n'a pas changé.
     */
    const boucle = (temps: number) => {
      lenis?.raf(temps)
      diffuser()
      frame = requestAnimationFrame(boucle)
    }
    frame = requestAnimationFrame(boucle)
  })

  onBeforeUnmount(() => {
    // La boucle `raf` tourne tant qu'on ne l'arrête pas : sans ceci, elle
    // survivrait au composant et continuerait d'animer un document démonté.
    if (frame) cancelAnimationFrame(frame)
    window.removeEventListener('scroll', diffuser)
    lenis?.destroy()
    lenis = null
  })
}
