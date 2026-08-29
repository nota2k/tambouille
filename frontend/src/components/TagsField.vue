<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { apiClient } from '@/api/client'
import { proposerTags, remplacerLeFragment } from '@/utils/tags'

/**
 * Le champ de tags, avec les tags déjà employés sur le site en suggestion.
 *
 * ── Pourquoi suggérer ───────────────────────────────────────────────────────
 *
 * Le champ était libre, et un catalogue de tags libres se fragmente tout seul :
 * « deep house », « deep-house » et « deephouse » désignent la même chose et ne
 * se retrouvent jamais ensemble dans un filtre. Proposer l'existant coûte un
 * appel et évite d'avoir à nettoyer après coup.
 *
 * ── La forme de la valeur ne change pas ─────────────────────────────────────
 *
 * `modelValue` reste la chaîne à virgules que les deux formulaires
 * manipulaient déjà, et qu'ils envoient telle quelle à l'API. Le composant
 * n'introduit pas un modèle de données par-dessus : il ne fait que remplacer le
 * fragment en cours de frappe.
 *
 * Le découpage et le classement vivent dans `utils/tags.ts` : cette vue est
 * derrière une authentification, donc hors d'atteinte d'un essai rapide, et
 * c'est là que se trouve ce qui peut se tromper en silence. Les tests les
 * exercent directement.
 */
const props = defineProps<{ modelValue: string; placeholder?: string }>()
const emit = defineEmits<{ 'update:modelValue': [valeur: string] }>()

const champ = ref<HTMLInputElement | null>(null)
const connus = ref<string[]>([])
const ouvert = ref(false)
/** L'entrée sur laquelle porte la touche Entrée. -1 : aucune. */
const actif = ref(-1)

const propositions = computed(() => proposerTags(connus.value, props.modelValue))

onMounted(async () => {
  try {
    const { data } = await apiClient.get<string[]>('/mixes/tags')
    connus.value = data
  } catch {
    // La liste n'est qu'une aide : sans elle le champ reste un champ libre, ce
    // qu'il était avant. Rien à annoncer.
    connus.value = []
  }
})

function choisir(tag: string) {
  emit('update:modelValue', remplacerLeFragment(props.modelValue, tag))
  actif.value = -1
  // Le champ garde le curseur : on enchaîne sur le tag suivant sans recliquer.
  champ.value?.focus()
}

/**
 * Une fonction nommée, et non trois instructions dans le gabarit.
 *
 * `@input="emit(…, ($event.target as HTMLInputElement).value); …"` ne compile
 * pas : le compilateur de template de Vite analyse l'expression avec un parseur
 * qui n'accepte pas un `as` TypeScript suivi d'autres instructions. Il rendait
 * « Unexpected token, expected "," » au chargement de la page — et ni `vue-tsc`
 * ni ESLint ne le voyaient, aucun des deux ne passant par ce parseur-là.
 */
function auxSaisies(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
  ouvert.value = true
  actif.value = -1
}

function auClavier(event: KeyboardEvent) {
  if (!ouvert.value || !propositions.value.length) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    actif.value = (actif.value + 1) % propositions.value.length
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    actif.value = (actif.value <= 0 ? propositions.value.length : actif.value) - 1
  } else if (event.key === 'Enter' && actif.value >= 0) {
    // Uniquement quand une proposition est visée : sans cela, Entrée cesserait
    // d'envoyer le formulaire pour qui tape un tag qui n'existe pas encore.
    event.preventDefault()
    const choix = propositions.value[actif.value]
    if (choix) choisir(choix)
  } else if (event.key === 'Escape') {
    event.stopPropagation()
    ouvert.value = false
    actif.value = -1
  }
}
</script>

<template>
  <div class="relative">
    <input
      ref="champ"
      :value="modelValue"
      type="text"
      :placeholder="placeholder"
      class="tb-field w-full"
      role="combobox"
      aria-autocomplete="list"
      aria-controls="tb-propositions-tags"
      :aria-expanded="ouvert && propositions.length > 0"
      @input="auxSaisies"
      @focus="ouvert = true"
      @keydown="auClavier"
      @blur="ouvert = false"
    />

    <!--
      `mousedown` et non `click` pour choisir.

      Le `blur` du champ court AVANT le `click` d'un élément qu'on vient de
      cliquer : la liste se serait refermée, et le clic ne serait jamais arrivé
      sur rien. `mousedown` précède `blur`, donc le choix passe.
    -->
    <ul
      v-if="ouvert && propositions.length"
      id="tb-propositions-tags"
      role="listbox"
      class="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto border border-tambouille-border bg-tambouille-surface shadow-lg"
    >
      <li v-for="(tag, i) in propositions" :key="tag">
        <button
          type="button"
          role="option"
          :aria-selected="i === actif"
          class="block w-full px-3 py-2 text-left text-sm transition"
          :class="i === actif ? 'bg-tambouille-surface-hover' : 'hover:bg-tambouille-surface-hover'"
          @mousedown.prevent="choisir(tag)"
        >
          {{ tag }}
        </button>
      </li>
    </ul>
  </div>
</template>
