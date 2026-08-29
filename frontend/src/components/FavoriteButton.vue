<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { toggleMixFavorite } from '@/utils/favorites'
import type { Mix } from '@/types'

/**
 * Le cœur, extrait de la page du mix pour que les cartes l'aient aussi.
 *
 * Il était écrit à la main dans `MixDetailView`, seul endroit qui le portait.
 * Les cartes avaient déjà le partage et la playlist en composants ; le favori
 * manquait, et le recopier en aurait fait deux versions à tenir d'accord — le
 * chemin le plus court vers deux cœurs qui ne se ressemblent plus.
 *
 * Le libellé passe dans `aria-label` et `title` : sans texte visible, ce sont
 * eux qui portent l'action et son état. Le cœur plein ou creux le dit à qui
 * voit l'icône.
 */
const props = withDefaults(
  defineProps<{
    /** Le mix lui-même, et non son identifiant : `toggleMixFavorite` le met à jour sur place. */
    mix: Mix
    variant?: 'overlay' | 'pill'
  }>(),
  { variant: 'pill' },
)

const router = useRouter()
const authStore = useAuthStore()

function basculer(event: Event) {
  // La carte enveloppe ce bouton dans un RouterLink.
  event.preventDefault()
  event.stopPropagation()

  if (!authStore.isAuthenticated) {
    router.push({ name: 'login' })
    return
  }

  // L'échec est déjà défait par `toggleMixFavorite`, qui remet le compte et le
  // drapeau comme ils étaient : il n'y a rien à annoncer de plus ici.
  toggleMixFavorite(props.mix).catch(() => {})
}
</script>

<template>
  <button
    type="button"
    :class="
      variant === 'overlay'
        ? [
            'flex h-8 w-8 shrink-0 items-center justify-center bg-black/60 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/80',
            mix.isFavorited ? 'text-tambouille-accent' : '',
          ]
        : [
            'tb-btn-outline tb-btn-icone rounded-full',
            mix.isFavorited ? '!border-tambouille-accent !text-tambouille-accent' : '',
          ]
    "
    :aria-pressed="mix.isFavorited"
    :aria-label="mix.isFavorited ? 'Retirer des favoris' : 'Mettre en favori'"
    :title="mix.isFavorited ? 'Retirer des favoris' : 'Mettre en favori'"
    @click="basculer"
  >
    <svg v-if="mix.isFavorited" viewBox="0 0 24 24" class="h-[18px] w-[18px] fill-current">
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      />
    </svg>
    <svg
      v-else
      viewBox="0 0 24 24"
      class="h-[18px] w-[18px] fill-none stroke-current"
      stroke-width="2"
    >
      <path
        d="M12 20.6l-1.1-1C5.9 15 2.8 12.2 2.8 8.7 2.8 5.9 5 3.8 7.7 3.8c1.6 0 3.1.7 4.3 2 1.2-1.3 2.7-2 4.3-2 2.7 0 4.9 2.1 4.9 4.9 0 3.5-3.1 6.3-8.1 10.9l-1.1 1z"
      />
    </svg>
  </button>
</template>
