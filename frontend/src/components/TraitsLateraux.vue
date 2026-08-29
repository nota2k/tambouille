<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { ecouterLeDefilement } from '@/composables/useSmoothScroll'
import trait01 from '@/assets/img/trait-01.svg'
import trait02 from '@/assets/img/trait-02.svg'
import triangle from '@/assets/img/triangle.svg'

/**
 * Les traits roses qui bordent la page, à gauche et à droite.
 *
 * Une couche décorative posée par-dessus le contenu, hors du flux : elle ne
 * décale rien, n'intercepte aucun clic, et n'est pas lue par les lecteurs
 * d'écran. Elle n'a pas de contenu — seulement des traits.
 *
 * ── La répétition, sans connaître la hauteur de la page ─────────────────────
 *
 * Les traits sont tirés une fois dans une BANDE de hauteur fixe, et cette bande
 * est rendue deux fois, l'une sous l'autre. Le défilement translate la pile, et
 * quand elle a monté d'exactement une bande on repart de zéro : la seconde
 * occupe alors la place de la première, et la boucle est invisible.
 *
 * C'est ce qui permet de border une page de n'importe quelle hauteur sans la
 * mesurer — une page dont la hauteur change quand les images arrivent, ou quand
 * une liste se charge, n'aurait de toute façon pas donné une mesure stable.
 */

/** Hauteur d'une bande. Doit dépasser la plus haute fenêtre, sinon la boucle se voit. */
const HAUTEUR_BANDE = 1600

/**
 * La part du défilement que les traits suivent.
 *
 * À 1 ils colleraient au contenu et le parallaxe n'existerait pas ; à 0 ils
 * seraient figés à l'écran. À 0,35 ils montent trois fois moins vite que la
 * page : par rapport à ce qu'on lit, ils descendent — c'est l'effet cherché,
 * et il reste léger.
 */
const FACTEUR_PARALLAXE = 0.35

interface Trait {
  src: string
  /** Position dans la bande, en pixels depuis son haut. */
  y: number
  /** Distance au bord de la fenêtre. Légèrement négative, le trait l'effleure. */
  x: number
  rotation: number
  /** Hauteur rendue, en pixels. La largeur suit le rapport du `viewBox`. */
  hauteur: number
  opacite: number
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * LA HAUTEUR EST EXPLICITE, ET ELLE DOIT L'ÊTRE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Les deux SVG sont déclarés `width="100%" height="100%"` : ils n'ont AUCUNE
 * taille intrinsèque. Une `<img>` qui en affiche un ne sait donc pas quelle
 * place prendre et s'étire jusqu'aux bords de son conteneur — mesuré à
 * 1263 × 2089 pixels pour un trait censé en faire 40 de large.
 *
 * Un `scale()` n'y pouvait rien : il multipliait une taille déjà fausse. D'où
 * une hauteur en pixels et `width: auto`, qui laisse le `viewBox` donner le
 * rapport.
 */
const HAUTEUR_MIN = 100
const HAUTEUR_MAX = 250

/** Le triangle est un accent, pas un trait : il tient dans la moitié de la place. */
const TRIANGLE_MIN = 45
const TRIANGLE_MAX = 95

const auHasard = (min: number, max: number) => min + Math.random() * (max - min)

/**
 * Traits par côté et par bande.
 *
 * Quatre, soit huit par bande de 1600 pixels : un trait tous les 400 pixels en
 * moyenne, donc jamais un écran entier sans bordure, sans que cela devienne un
 * motif régulier non plus.
 */
const PAR_COTE = 4

/**
 * Le tirage d'un côté.
 *
 * Il a lieu une fois, au montage : les traits ne doivent pas sauter d'une
 * navigation à l'autre — la couche vit dans `App.vue` et ne se démonte pas.
 */
/** Ce qui varie d'un trait à l'autre, une fois la source et la place décidées. */
function habiller(src: string, y: number, min = HAUTEUR_MIN, max = HAUTEUR_MAX): Trait {
  return {
    src,
    y,
    // Collés au bord. À -34 le trait était tranché en deux et ne se lisait plus
    // comme un trait ; à 46 il empiétait sur la colonne de texte. Ce couloir-ci
    // le tient contre le bord sans jamais le couper vraiment.
    x: auHasard(-4, 8),
    // Un tour complet : chaque trait tombe comme il veut. Un intervalle étroit
    // (±14°) donnait quatre traits presque parallèles par bord, et la
    // répétition se lisait au premier coup d'œil.
    rotation: auHasard(0, 360),
    // Du simple au double entre le plus petit et le plus grand : une fourchette
    // étroite donnait des traits tous de même taille, et la répétition se
    // voyait au lieu de passer pour du hasard.
    hauteur: auHasard(min, max),
    opacite: auHasard(0.5, 0.9),
  }
}

function tirerUnCote(): Trait[] {
  const creneau = HAUTEUR_BANDE / PAR_COTE

  // Un seul `trait-01` par bord, `trait-02` sur toutes les autres places.
  //
  // C'était écrit `i % 3 === 0`, censé en donner un sur trois. Sur QUATRE
  // places le modulo tombe sur les indices 0 et 3, soit deux de chaque : la
  // proportion voulue et celle obtenue divergeaient dès que `PAR_COTE` n'était
  // pas un multiple de 3. Une comparaison directe ne dépend de rien.
  const traits = Array.from({ length: PAR_COTE }, (_, i) =>
    habiller(
      i === 0 ? trait01 : trait02,
      // Un créneau chacun, avec du jeu à l'intérieur : un pur `Math.random()`
      // sur toute la hauteur laisse des paquets et des trous. Les pixels
      // retirés au jeu sont la place du trait lui-même, pour qu'il ne déborde
      // pas sur le créneau suivant.
      i * creneau + auHasard(0, creneau - HAUTEUR_MAX),
    ),
  )

  // Un triangle par bord, soit deux par bande. Posé n'importe où plutôt que
  // dans un créneau : c'est un accident dans la série, pas un cinquième trait.
  traits.push(
    habiller(triangle, auHasard(0, HAUTEUR_BANDE - HAUTEUR_MAX), TRIANGLE_MIN, TRIANGLE_MAX),
  )

  return traits
}

const gauche = ref<Trait[]>([])
const droite = ref<Trait[]>([])

/** De combien la pile est remontée, entre 0 et une bande. */
const decalage = ref(0)

/**
 * Le mouvement réduit fige la couche.
 *
 * Un parallaxe est un mouvement que personne n'a demandé et qui accompagne
 * toute la lecture : c'est exactement ce que ce réglage système sert à couper.
 * Les traits restent, immobiles — la décoration ne dépend pas de l'animation.
 */
const mouvementReduit = ref(false)

/**
 * Appelé à chaque avancée du défilement, par `ecouterLeDefilement`.
 *
 * Surtout PAS par un `addEventListener('scroll')` sur `window` : Lenis pilote
 * le défilement de ce site et `window` ne reçoit alors aucun événement — c'est
 * exactement l'erreur qui a été faite ici, et la couche restait immobile. Le
 * composable est le seul endroit qui sache d'où vient le mouvement.
 *
 * Pas de `requestAnimationFrame` non plus : Lenis publie déjà une fois par
 * frame, et le corps ci-dessous est une multiplication puis une écriture de
 * `ref` que Vue groupe de toute façon.
 */
function surDefilement(y: number) {
  if (mouvementReduit.value) return
  // Le modulo est ce qui referme la boucle : au-delà d'une bande, on est
  // revenu au même endroit.
  decalage.value = (y * FACTEUR_PARALLAXE) % HAUTEUR_BANDE
}

let media: MediaQueryList | undefined
let seDesabonner: (() => void) | undefined

function surPreference(event: MediaQueryListEvent | MediaQueryList) {
  mouvementReduit.value = event.matches
  if (event.matches) decalage.value = 0
}

onMounted(() => {
  gauche.value = tirerUnCote()
  droite.value = tirerUnCote()

  media = window.matchMedia('(prefers-reduced-motion: reduce)')
  surPreference(media)
  media.addEventListener('change', surPreference)

  seDesabonner = ecouterLeDefilement(surDefilement)
})

onBeforeUnmount(() => {
  seDesabonner?.()
  media?.removeEventListener('change', surPreference)
})

const styleDeLaPile = computed(() => ({
  transform: `translate3d(0, ${-decalage.value}px, 0)`,
}))

/**
 * `left` ET `right` sont écrits à chaque fois, l'un des deux à `auto`.
 *
 * N'en poser qu'un laissait l'autre à ce qu'il valait par ailleurs, et une
 * `<img>` absolue qui a ses deux bords fixés s'étire de l'un à l'autre : c'est
 * la seconde moitié du trait de 1263 pixels de large. Les nommer tous les deux
 * ne laisse rien à deviner.
 */
function styleDuTrait(trait: Trait, cote: 'gauche' | 'droite') {
  const aGauche = cote === 'gauche'
  return {
    top: `${trait.y}px`,
    left: aGauche ? `${trait.x}px` : 'auto',
    right: aGauche ? 'auto' : `${trait.x}px`,
    height: `${trait.hauteur}px`,
    width: 'auto',
    // Pas de miroir entre les deux bords : il servait à les faire pencher
    // différemment quand l'angle était petit, et il ne veut plus rien dire sur
    // un tour complet.
    transform: `rotate(${trait.rotation}deg)`,
    /*
     * L'angle est FIGÉ, et cette ligne le garantit.
     *
     * Il est tiré une fois au montage et n'est jamais recalculé — la couche se
     * redessine à chaque frame pendant le défilement, mais avec la même valeur.
     * `transition: none` interdit en plus qu'une règle ajoutée plus tard, ici
     * ou dans la feuille globale, se mette à interpoler cette rotation : le
     * trait doit sauter à sa place, jamais y tourner.
     */
    transition: 'none',
    opacity: trait.opacite,
  }
}
</script>

<template>
  <!--
    `fixed` et non `absolute` : la couche cadre la FENÊTRE, pas le document, et
    n'a donc jamais besoin de connaître la hauteur de la page. `overflow-hidden`
    coupe ce qui dépasse en haut et en bas pendant que la pile coulisse.

    z-30 la place au-dessus du contenu, et sous tout ce qui sert : la barre de
    lecture (z-40), les fenêtres (z-50), l'en-tête (z-1001), le voile (z-2000).
    Une décoration ne passe pas devant une commande.
  -->
  <!--
    `hidden md:block` : une décoration de marge a besoin d'une marge.

    Sous 768 pixels le contenu n'a que le `px-4` du gabarit, soit 16 pixels de
    chaque côté ; un trait large de 58 à 101 tombe donc en plein sur le texte et
    le rend pénible à lire. Les traits reviennent dès qu'il y a la place.
  -->
  <div
    class="pointer-events-none fixed inset-0 z-30 hidden overflow-hidden md:block"
    aria-hidden="true"
  >
    <div class="absolute inset-x-0 top-0" :style="styleDeLaPile">
      <!-- Les deux exemplaires de la bande. `n` vaut 0 puis 1 : la seconde est
           posée juste sous la première, et prend sa place à chaque boucle. -->
      <div
        v-for="n in 2"
        :key="n"
        class="absolute inset-x-0"
        :style="{ top: `${(n - 1) * HAUTEUR_BANDE}px`, height: `${HAUTEUR_BANDE}px` }"
      >
        <img
          v-for="(trait, i) in gauche"
          :key="`g-${i}`"
          :src="trait.src"
          alt=""
          class="absolute"
          :style="styleDuTrait(trait, 'gauche')"
        />
        <img
          v-for="(trait, i) in droite"
          :key="`d-${i}`"
          :src="trait.src"
          alt=""
          class="absolute"
          :style="styleDuTrait(trait, 'droite')"
        />
      </div>
    </div>
  </div>
</template>
