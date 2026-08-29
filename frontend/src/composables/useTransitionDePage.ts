import { onUnmounted, readonly, ref } from 'vue'

/**
 * Le voile rose qui couvre une navigation interne tant que ses pochettes ne sont
 * pas là. Le premier chargement, lui, n'en a pas — voir `visible` plus bas.
 *
 * ─── La règle qui prime sur toutes les autres ────────────────────────────────
 *
 * Un voile opaque sur toute la page, c'est le site entier caché. S'il se coince,
 * il n'y a plus de site — pas une animation ratée, une panne. Tout ce qui suit
 * est écrit pour qu'il se lève TOUJOURS : deux délais de sécurité indépendants
 * du compte d'images, une annonce d'arrivée qui part aussi bien sur `error` que
 * sur `load`, et `pointer-events: none` pour qu'il ne retienne jamais un clic
 * même pendant qu'il est visible.
 *
 * Le compte est donc une optimisation — il lève le voile plus tôt quand tout est
 * arrivé — et non la condition de sa disparition.
 */

/** Ce que la page attend encore. Jamais lu comme « tout est fini » sans délai. */
const enAttente = ref(0)
/**
 * Faux au départ : **le premier chargement n'a pas de voile.**
 *
 * C'est là que la mesure se joue. Le Speed Index se calcule sur la progression
 * visuelle de l'écran, et un aplat rose n'est pas du contenu : couvrir l'arrivée
 * sur le site, c'est rendre les 246 ms gagnées sur les polices et le travail
 * fait sur le LCP. Une navigation interne, elle, ne compte dans aucune de ces
 * métriques — c'est là que le fondu est gratuit.
 *
 * L'`afterEach` du routeur écarte donc la navigation initiale (`START_LOCATION`)
 * et n'appelle `couvrirLaPage` qu'à partir de la seconde.
 */
const visible = ref(false)
const sortie = ref(false)

/**
 * Au-delà, le voile se lève quoi qu'il arrive.
 *
 * Une pochette hors écran en `loading="lazy"` n'est demandée que lorsqu'on
 * défile jusqu'à elle : l'attendre, c'est attendre indéfiniment. Et un réseau
 * qui traîne ne doit pas priver de la page ce qui est déjà lisible — le titre,
 * le texte, la navigation sont là bien avant les images.
 */
const DELAI_MAXIMUM_MS = 1400

/** Le temps que le volet met à sortir par le haut, une fois relâché. */
const DUREE_DE_LA_SORTIE_MS = 550

/**
 * Le temps que le volet met à monter du bas de l'écran jusqu'à le couvrir.
 *
 * Pendant cette montée, le haut de la page reste découvert : c'est le prix du
 * mouvement, et ce qu'on y aperçoit est la page qui arrive — `couvrirLaPage`
 * court dans l'`afterEach`, et la vue est remplacée dans la foulée.
 *
 * La valeur est rendue par `useTransitionDePage` et posée en variable CSS par
 * `PageFade`, plutôt que réécrite dans la feuille de style : une montée qui
 * durerait plus longtemps ici que là ferait repartir le volet avant qu'il soit
 * arrivé, ce que ce fichier passe justement son temps à empêcher.
 */
const DUREE_DE_LA_MONTEE_MS = 420

/**
 * Le temps laissé aux pochettes pour s'annoncer.
 *
 * Une page sans images — connexion, réglages, mot de passe oublié — n'appelle
 * jamais `arrivee()`, donc rien ne lèverait le voile avant le délai maximum :
 * une seconde et demie de rose sur un formulaire de quatre champs déjà prêt.
 * Passé ce court sursis, un compte à zéro se lit « il n'y en avait pas » et non
 * « elles ne sont pas encore montées » — les vues se montent dans la foulée de
 * l'`afterEach`, en quelques millisecondes.
 */
const DELAI_DE_GRACE_MS = 200

let minuterieMaximum: ReturnType<typeof setTimeout> | undefined
let minuterieDeSortie: ReturnType<typeof setTimeout> | undefined
let minuterieDeGrace: ReturnType<typeof setTimeout> | undefined
let minuterieDeMontee: ReturnType<typeof setTimeout> | undefined

/** Le volet est en train de monter : il ne peut pas encore repartir. */
let montee = false
/** Une levée a été demandée pendant la montée, et attend qu'elle finisse. */
let leveeEnAttente = false

function nettoyer() {
  clearTimeout(minuterieMaximum)
  clearTimeout(minuterieDeSortie)
  clearTimeout(minuterieDeGrace)
  clearTimeout(minuterieDeMontee)
}

/**
 * Lève le volet, une seule fois, quelle qu'en soit la raison.
 *
 * Une levée demandée pendant la montée n'est pas perdue : elle est retenue, et
 * la minuterie de montée l'exécute en arrivant. Sans ce report, une page sans
 * pochette — dont le délai de grâce est plus court que la montée — ferait
 * redescendre le volet du milieu de l'écran.
 */
function lever() {
  if (!visible.value || sortie.value) return

  if (montee) {
    leveeEnAttente = true
    return
  }

  leverMaintenant()
}

function leverMaintenant() {
  if (!visible.value || sortie.value) return
  sortie.value = true
  // Le retrait ne dépend pas de `animationend` : un onglet en arrière-plan ne
  // fait pas tourner ses animations, et l'événement ne viendrait qu'au retour.
  minuterieDeSortie = setTimeout(() => {
    visible.value = false
    sortie.value = false
    enAttente.value = 0
  }, DUREE_DE_LA_SORTIE_MS)
}

/** Ce que les pochettes annoncent. Voir `CoverImage`. */
export const signalerImage = {
  attendue() {
    enAttente.value++
  },
  arrivee() {
    enAttente.value = Math.max(0, enAttente.value - 1)
    if (enAttente.value === 0 && visible.value) lever()
  },
}

/**
 * Une navigation qui ne change pas ce qui est affiché, et qui ne doit donc rien
 * couvrir. Consommé par le premier `couvrirLaPage` qui suit.
 */
let navigationSilencieuse = false

/**
 * Tait le voile de la prochaine navigation.
 *
 * Il existe un cas où l'URL change sans que la page change : la page d'un mix
 * ouverte depuis un ancien lien `/mixes/<id>` se réécrit en `/mixes/<username>/
 * <id>` une fois le mix connu. Sans ce silence, le voile tomberait **après**
 * que le contenu soit déjà à l'écran — l'inverse de ce à quoi il sert, et qui
 * se lirait comme une panne.
 *
 * Un drapeau à usage unique plutôt qu'un paramètre de `couvrirLaPage` : c'est
 * le routeur qui appelle `couvrirLaPage`, pas la vue, et la vue est la seule à
 * savoir que sa navigation est cosmétique.
 */
export function taireLeProchainVoile() {
  navigationSilencieuse = true
}

/**
 * Baisse le voile pour la vue qui arrive.
 *
 * Appelé à chaque navigation, avant que la nouvelle vue ne monte : le compte
 * repart de zéro, puisque les pochettes de la vue précédente ne concernent plus
 * personne.
 */
export function couvrirLaPage() {
  if (navigationSilencieuse) {
    navigationSilencieuse = false
    return
  }
  nettoyer()
  enAttente.value = 0
  sortie.value = false
  visible.value = true
  montee = true
  leveeEnAttente = false
  armer()
}

/** Les minuteries qui font monter le volet, puis garantissent qu'il repart. */
function armer() {
  minuterieDeMontee = setTimeout(() => {
    montee = false
    if (leveeEnAttente) leverMaintenant()
  }, DUREE_DE_LA_MONTEE_MS)

  minuterieMaximum = setTimeout(lever, DELAI_MAXIMUM_MS)
  minuterieDeGrace = setTimeout(() => {
    if (enAttente.value === 0) lever()
  }, DELAI_DE_GRACE_MS)
}

/** Remet le module à neuf. Réservé aux tests, qui partagent son état global. */
export function reinitialiserPourTest() {
  nettoyer()
  enAttente.value = 0
  sortie.value = false
  visible.value = false
  navigationSilencieuse = false
  montee = false
  leveeEnAttente = false
}

export function useTransitionDePage() {
  onUnmounted(nettoyer)
  return {
    visible: readonly(visible),
    sortie: readonly(sortie),
    dureeDeLaMontee: DUREE_DE_LA_MONTEE_MS,
    dureeDeLaSortie: DUREE_DE_LA_SORTIE_MS,
  }
}
