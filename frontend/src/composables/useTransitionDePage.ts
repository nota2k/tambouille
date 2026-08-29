import { onUnmounted, readonly, ref } from 'vue'

/**
 * Le voile rose qui couvre la page tant que ses pochettes ne sont pas là.
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
 * Vrai dès l'évaluation du module, et non allumé par un appel.
 *
 * C'est ce qui évite le double allumage du démarrage — `main.ts` puis
 * l'`afterEach` de la navigation initiale — sans avoir à s'en garder. La
 * version d'avant s'en gardait par un retour anticipé, et ce retour tombait
 * aussi sur les navigations rapides : le compte n'était pas remis à zéro,
 * les pochettes de la vue précédente restaient dues, et le voile tenait quatre
 * secondes au lieu d'une et demie. Mesuré.
 */
const visible = ref(true)
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

/** Le temps que le voile met à s'effacer une fois relâché. */
const DUREE_DU_FONDU_MS = 550

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

function nettoyer() {
  clearTimeout(minuterieMaximum)
  clearTimeout(minuterieDeSortie)
  clearTimeout(minuterieDeGrace)
}

/** Lève le voile, une seule fois, quelle qu'en soit la raison. */
function lever() {
  if (!visible.value || sortie.value) return
  sortie.value = true
  // Le retrait ne dépend pas de `animationend` : un onglet en arrière-plan ne
  // fait pas tourner ses animations, et l'événement ne viendrait qu'au retour.
  minuterieDeSortie = setTimeout(() => {
    visible.value = false
    sortie.value = false
    enAttente.value = 0
  }, DUREE_DU_FONDU_MS)
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
 * Baisse le voile pour la vue qui arrive.
 *
 * Appelé à chaque navigation, avant que la nouvelle vue ne monte : le compte
 * repart de zéro, puisque les pochettes de la vue précédente ne concernent plus
 * personne.
 */
export function couvrirLaPage() {
  nettoyer()
  enAttente.value = 0
  sortie.value = false
  visible.value = true
  armer()
}

/** Les deux minuteries qui garantissent que le voile se lève. */
function armer() {
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
  visible.value = true
}

/**
 * Le premier chargement n'a pas encore d'`afterEach` derrière lui : le voile est
 * déjà baissé, mais aucune minuterie ne le relèverait si la navigation initiale
 * n'aboutissait pas — une garde de routeur qui pend, et le site reste rose.
 * On arme donc dès l'import, ce que l'`afterEach` refera quelques
 * millisecondes plus tard sans dommage.
 */
armer()

export function useTransitionDePage() {
  onUnmounted(nettoyer)
  return {
    visible: readonly(visible),
    sortie: readonly(sortie),
    dureeDuFondu: DUREE_DU_FONDU_MS,
  }
}
