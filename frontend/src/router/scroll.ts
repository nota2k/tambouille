import { poserLaPage } from '@/composables/useSmoothScroll'

/**
 * Où poser la page à chaque changement de route.
 *
 * Sans rien, Vue Router ne touche pas au défilement : arriver sur la page d'un
 * mix depuis une liste où l'on avait descendu de deux mille pixels l'ouvrait
 * deux mille pixels plus bas, sur sa tracklist. Le voile rose masquait le
 * déplacement, ce qui rendait l'effet d'autant plus déroutant — la page
 * apparaissait déjà défilée, sans qu'on ait rien fait.
 *
 * ── Pourquoi le routeur ne fait pas le défilement lui-même ─────────────────
 *
 * Rendre une position à Vue Router revient à un `window.scrollTo`, et le site
 * anime son défilement avec Lenis, qui tient sa propre position et la
 * réapplique à chaque frame. Ce que le routeur pose, Lenis peut le reprendre.
 * `positionDeDefilement` rend donc `false` — « ne touche à rien » — et confie
 * la pose à `poserLaPage`, qui passe par Lenis quand il est là.
 */

/** Ce que cette fonction lit d'une route : son fragment, et rien d'autre. */
interface RouteAvecFragment {
  hash: string
}

/** La position que le navigateur a retenue pour une entrée de l'historique. */
interface PositionEnregistree {
  left: number
  top: number
}

/**
 * Le point où poser la page : une hauteur, ou l'ancre à rejoindre.
 *
 * Séparée de la pose pour rester une fonction pure, donc vérifiable sans
 * navigateur ni Lenis — c'est la décision qui porte les règles, la pose n'est
 * qu'un appel.
 *
 * `savedPosition` prime sur tout, ancre comprise : remettre toujours en haut
 * échangerait une gêne contre une autre, en faisant perdre sa place à qui
 * revient à la liste d'où il a pris un mix.
 *
 * Aucun lien du site ne porte d'ancre aujourd'hui, mais un lien partagé peut en
 * porter une : `MixDetailView` reconduit délibérément le fragment quand il
 * réécrit une ancienne adresse. Sans cette branche, la remise en haut
 * annulerait l'ancre au moment même où l'on suit le lien.
 */
export function cibleDeDefilement(
  to: RouteAvecFragment,
  savedPosition: PositionEnregistree | null,
): number | string {
  if (savedPosition) return savedPosition.top
  if (to.hash) return to.hash
  return 0
}

export function positionDeDefilement(
  to: RouteAvecFragment,
  from: RouteAvecFragment,
  savedPosition: PositionEnregistree | null,
) {
  poserLaPage(cibleDeDefilement(to, savedPosition))
  return false as const
}
