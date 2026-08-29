/**
 * Ce que cette fonction lit d'une route : son fragment, et rien d'autre.
 *
 * Déclaré ici plutôt que d'emprunter `RouteLocationNormalized` à vue-router :
 * le type large obligerait sa spec à fabriquer une route entière — nom, chemin,
 * `matched`, `query` — pour vérifier une décision qui ne regarde qu'un
 * fragment. Un paramètre plus large reste accepté par `createRouter`, les
 * paramètres de fonction étant contravariants.
 */
interface RouteAvecFragment {
  hash: string
}

/** La position que le navigateur a retenue pour une entrée de l'historique. */
interface PositionEnregistree {
  left: number
  top: number
}

/**
 * Où poser la page à chaque navigation.
 *
 * Sans cette fonction, Vue Router ne touche pas au défilement : arriver sur la
 * page d'un mix depuis une liste où l'on avait descendu de deux mille pixels
 * l'ouvrait deux mille pixels plus bas, sur sa tracklist. Le voile rose
 * masquait le déplacement, ce qui rendait l'effet d'autant plus déroutant — la
 * page apparaissait, déjà défilée, sans qu'on ait rien fait.
 *
 * ── Pourquoi `instant`, et jamais `auto` ───────────────────────────────────
 *
 * `auto` s'en remet à la feuille de style, et `main.css` y pose
 * `scroll-behavior: smooth` sur `html:not(.lenis)`. Lenis ne démarre pas sous
 * `prefers-reduced-motion`, donc l'exception ne s'applique pas là : le retour
 * en haut s'animerait, chez les lecteurs qui ont demandé qu'on ne leur anime
 * rien. `instant` passe outre la feuille de style dans les deux cas.
 *
 * Avec Lenis en marche, le `window.scrollTo` que le routeur exécute tient :
 * Lenis relit la position réelle à la frame suivante et se recale dessus.
 *
 * ── Le retour arrière garde sa place ───────────────────────────────────────
 *
 * `savedPosition` prime sur tout le reste, ancre comprise. Remettre toujours en
 * haut échangerait une gêne contre une autre : revenir à la liste d'où l'on a
 * pris un mix ferait perdre le fil de sa lecture.
 */
export function positionDeDefilement(
  to: RouteAvecFragment,
  from: RouteAvecFragment,
  savedPosition: PositionEnregistree | null,
) {
  if (savedPosition) return savedPosition

  // Aucun lien du site ne porte d'ancre aujourd'hui, mais un lien partagé peut
  // en porter une : `MixDetailView` reconduit délibérément le fragment quand il
  // réécrit une ancienne adresse. Sans cette branche, la remise en haut
  // annulerait l'ancre au moment même où l'on suit le lien.
  if (to.hash) return { el: to.hash, behavior: 'instant' as const }

  return { top: 0, behavior: 'instant' as const }
}
