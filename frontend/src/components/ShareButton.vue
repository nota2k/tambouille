<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref } from 'vue'
import { copyLink } from '@/utils/share'
import { embedCode } from '@/utils/embed'
import { usePlayerStore } from '@/stores/player'

/**
 * Le bouton de partage, sous deux formes selon ce qu'on lui donne.
 *
 * Sans `embedUrl`, il copie le lien d'un clic — c'est ce qu'il a toujours fait,
 * et ce qu'il faut au survol d'une carte, où une fenêtre qui s'ouvre sous le
 * curseur serait une gêne.
 *
 * Avec `embedUrl`, il ouvre une fenêtre à deux onglets : le lien, et le code à
 * coller. L'intégration demande de lire et de choisir, donc une surface où
 * s'arrêter ; les pages de détail sont le seul endroit qui en laisse la place.
 */
const props = withDefaults(
  defineProps<{
    url: string
    /** L'adresse du lecteur intégrable. Fournie, elle transforme le bouton en fenêtre. */
    embedUrl?: string
    /** La hauteur d'iframe qu'il faut à ce lecteur — voir `HAUTEUR_EMBED_*`. */
    embedHeight?: number
    variant?: 'overlay' | 'pill'
  }>(),
  { variant: 'pill', embedUrl: undefined, embedHeight: 200 },
)

const playerStore = usePlayerStore()

const avecMenu = computed(() => !!props.embedUrl)
const code = computed(() => (props.embedUrl ? embedCode(props.embedUrl, props.embedHeight) : ''))

const open = ref(false)
const onglet = ref<'lien' | 'integration'>('lien')

/**
 * Ce qui vient d'être copié, pour n'accuser réception qu'au bon endroit : les
 * deux onglets ont chacun leur bouton, et un « copié » qui s'allume sur les
 * deux ne dirait pas ce qui est dans le presse-papier.
 */
const copie = ref<'lien' | 'integration' | null>(null)

/**
 * L'aperçu n'est monté qu'une fois l'onglet ouvert, et le reste ensuite.
 *
 * C'est un vrai cadre sur la vraie adresse — le seul aperçu qui ne puisse pas
 * mentir. Mais c'est aussi une page complète à charger : la monter à
 * l'ouverture la ferait payer à tous ceux qui ne venaient que copier un lien.
 * `v-show` sur les onglets ne suffirait pas, il monte les deux.
 */
const apercuMonte = ref(false)

/**
 * L'aperçu est plafonné, la fenêtre n'étant pas haute à l'infini.
 *
 * Un lecteur de playlist fait 460 pixels de haut : au-delà du plafond, l'aperçu
 * en montre moins que l'intégration réelle. Il défile à l'intérieur, donc il
 * reste juste — c'est un aperçu, pas une maquette à l'échelle.
 */
const hauteurApercu = computed(() => Math.min(props.embedHeight, 260))
let minuterie: ReturnType<typeof setTimeout> | undefined

const trigger = ref<HTMLButtonElement | null>(null)
const champLien = ref<HTMLInputElement | null>(null)

const libelle = computed(() => {
  if (avecMenu.value) return 'Partager'
  return copie.value ? 'Lien copié' : 'Copier le lien'
})

async function auClic(event: Event) {
  // La carte enveloppe ce bouton dans un RouterLink.
  event.preventDefault()
  event.stopPropagation()

  if (!avecMenu.value) {
    await copier('lien', props.url)
    return
  }

  if (open.value) {
    fermer()
    return
  }

  open.value = true
  onglet.value = 'lien'
  apercuMonte.value = false

  /*
   * La lecture en cours s'arrête à l'ouverture.
   *
   * L'onglet « Intégration » monte un second lecteur, celui de l'aperçu : deux
   * mix qui jouent en même temps, l'un derrière la fenêtre et l'autre dedans,
   * sont inécoutables et on ne sait plus lequel mettre en pause. Couper ici
   * tranche avant que la question ne se pose, et le fait de façon visible —
   * la barre montre « lecture », pas une pause mystérieuse.
   */
  playerStore.pause()

  document.addEventListener('keydown', auClavier)
  // Le lien est sélectionné à l'ouverture : Ctrl+C marche sans toucher à rien,
  // pour qui n'a pas envie de viser un bouton.
  await nextTick()
  champLien.value?.select()
}

function fermer(rendreLeFocus = false) {
  open.value = false
  copie.value = null
  clearTimeout(minuterie)
  document.removeEventListener('keydown', auClavier)
  if (rendreLeFocus) trigger.value?.focus()
}

function auClavier(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    fermer(true)
  }
}

function ouvrirOnglet(id: 'lien' | 'integration') {
  onglet.value = id
  if (id === 'integration') apercuMonte.value = true
}

async function copier(quoi: 'lien' | 'integration', texte: string) {
  try {
    await copyLink(texte)
  } catch {
    return
  }

  copie.value = quoi
  clearTimeout(minuterie)
  minuterie = setTimeout(() => (copie.value = null), 2000)
}

onUnmounted(() => {
  clearTimeout(minuterie)
  document.removeEventListener('keydown', auClavier)
})
</script>

<template>
  <!--
    En variante `overlay`, ce bouton ne se place plus lui-même.

    Il portait sa propre apparence mais AUCUNE position : il restait donc dans
    le flux, en 34 × 18 pixels entre la pochette et le titre, pendant que celui
    de playlist se posait en absolu. Deux boutons voisins réglés chacun à sa
    façon ne pouvaient pas s'aligner.

    C'est désormais l'appelant qui les groupe et les place — voir la colonne de
    `MixCard`. Ici il ne reste que l'allure, et `contents` pour que l'enveloppe
    ne s'interpose pas entre ce groupe et son bouton.
  -->
  <div :class="variant === 'overlay' ? 'contents' : 'relative'">
    <button
      ref="trigger"
      type="button"
      :class="
        variant === 'overlay'
          ? 'flex h-8 w-8 shrink-0 items-center justify-center bg-black/60 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/80'
          : 'tb-btn-outline tb-btn-icone rounded-full'
      "
      :title="libelle"
      :aria-label="libelle"
      :aria-expanded="avecMenu ? open : undefined"
      :aria-haspopup="avecMenu ? 'dialog' : undefined"
      @click="auClic"
    >
      <svg v-if="!avecMenu && copie" viewBox="0 0 24 24" class="h-[18px] w-[18px] fill-current">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
      </svg>
      <svg v-else viewBox="0 0 24 24" class="h-[18px] w-[18px] fill-current">
        <path
          d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"
        />
      </svg>
    </button>

    <!--
      Téléporté à la racine, et centré dans la fenêtre plutôt qu'accroché au
      bouton.

      Accrochée au bouton, la fenêtre héritait de sa place dans la page : elle
      débordait à droite dès que le bouton était un peu loin, et se retrouvait
      sous la barre de lecture quand la page était défilée. Le `teleport`
      l'affranchit aussi des `overflow` et des empilements des conteneurs qui
      l'entourent — c'est ce qui garantit qu'elle passe par-dessus tout.
    -->
    <Teleport to="body">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click="fermer()"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Partager"
          class="max-h-full w-96 max-w-full overflow-y-auto rounded-none border border-tambouille-border bg-tambouille-surface text-tambouille-text shadow-lg"
          @click.stop
        >
          <div class="flex border-b border-tambouille-border" role="tablist">
            <button
              v-for="tab in [
                { id: 'lien' as const, label: 'Lien' },
                { id: 'integration' as const, label: 'Intégration' },
              ]"
              :key="tab.id"
              type="button"
              role="tab"
              :aria-selected="onglet === tab.id"
              class="flex-1 px-4 py-2 text-sm transition"
              :class="
                onglet === tab.id
                  ? 'border-b-2 border-tambouille-accent font-bold'
                  : 'text-tambouille-muted hover:bg-tambouille-surface-hover'
              "
              @click="ouvrirOnglet(tab.id)"
            >
              {{ tab.label }}
            </button>
          </div>

          <div v-show="onglet === 'lien'" class="p-3">
            <input
              ref="champLien"
              type="text"
              readonly
              :value="url"
              class="tb-field w-full text-sm"
              aria-label="Lien à copier"
              @focus="($event.target as HTMLInputElement).select()"
            />
            <button type="button" class="tb-btn mt-2 w-full" @click="copier('lien', url)">
              {{ copie === 'lien' ? 'Lien copié' : 'Copier le lien' }}
            </button>
          </div>

          <div v-show="onglet === 'integration'" class="p-3">
            <!-- L'aperçu est le lecteur lui-même, à sa vraie adresse : ce qu'on
                 y voit est exactement ce que verront les visiteurs de la page
                 hôte. Il illustre, il ne se manipule pas. -->
            <p class="mb-1.5 text-xs uppercase tracking-wide text-tambouille-muted">Aperçu</p>
            <div
              class="relative overflow-hidden border border-tambouille-border"
              :style="{ height: `${hauteurApercu}px` }"
            >
              <iframe
                v-if="apercuMonte"
                :src="embedUrl"
                title="Aperçu du lecteur"
                loading="lazy"
                tabindex="-1"
                class="pointer-events-none h-full w-full border-0"
              ></iframe>
              <!--
                Ce voile transparent est ce qui rend l'aperçu inerte, et
                `pointer-events-none` sur le cadre ne suffisait pas : il ne
                désarmait pas le clic, il le laissait TRAVERSER. Sur la page
                d'un mix, il atterrissait sur la forme d'onde juste derrière —
                la fenêtre se refermait et la lecture démarrait, ce que personne
                n'avait demandé.

                `click.stop` en plus de la position : sans lui, le clic
                remonterait jusqu'au fond de la fenêtre, qui ferme.
              -->
              <div class="absolute inset-0" aria-hidden="true" @click.stop></div>
            </div>

            <!-- `readonly` et non `disabled` : le champ doit rester
                 sélectionnable au clavier, c'est la seule façon de copier sans
                 souris pour qui n'utilise pas le bouton. -->
            <textarea
              readonly
              rows="4"
              :value="code"
              class="tb-field mt-3 w-full resize-none font-mono text-xs"
              aria-label="Code d'intégration à copier"
              @focus="($event.target as HTMLTextAreaElement).select()"
            ></textarea>
            <p class="mt-2 text-xs text-tambouille-muted">
              À coller dans le HTML d'une page. La largeur s'adapte, la hauteur est celle du
              lecteur.
            </p>
            <button type="button" class="tb-btn mt-2 w-full" @click="copier('integration', code)">
              {{ copie === 'integration' ? 'Code copié' : 'Copier le code' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
