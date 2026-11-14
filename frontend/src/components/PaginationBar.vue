<script setup lang="ts">
/**
 * Précédent / page X sur Y / Suivant.
 *
 * Un composant plutôt que quatre copies : trois pages en avaient besoin en même
 * temps, et `DiscoverView` portait déjà ce bloc à la main. Quatre exemplaires
 * d'une même barre finissent par diverger — sur le libellé, sur la borne, sur
 * ce qui est désactivé.
 *
 * `DiscoverView` n'a PAS été repris ici : son fichier porte un travail en cours
 * au moment de cet ajout, et le reprendre aurait mêlé deux chantiers. C'est un
 * suivi à faire, pas un oubli.
 *
 * Le composant ne charge rien et ne connaît aucune requête : il annonce la page
 * demandée, l'appelant décide quoi en faire. C'est ce qui lui permet de servir
 * une liste de mix comme une liste de playlists.
 */
const props = defineProps<{
  /** La page affichée, à partir de 1. */
  page: number
  /** Le nombre total de pages. Rien ne s'affiche en dessous de deux. */
  totalPages: number
  /** Grise les deux boutons pendant un chargement, sans faire disparaître la barre. */
  disabled?: boolean
}>()

const emit = defineEmits<{ 'update:page': [page: number] }>()

/**
 * Le clic est borné ici, en plus des attributs `disabled`.
 *
 * Un bouton désactivé n'empêche pas un appel déclenché autrement — et surtout,
 * une page hors bornes se traduirait par une liste vide sans message : la
 * requête réussirait, elle ne rendrait simplement rien.
 */
function aller(vers: number) {
  const cible = Math.min(Math.max(vers, 1), props.totalPages)
  if (cible !== props.page) emit('update:page', cible)
}
</script>

<template>
  <!-- Une seule page : la barre ne dit rien qu'on ne voie déjà, elle disparaît. -->
  <nav
    v-if="totalPages > 1"
    class="mt-8 flex items-center justify-center gap-4"
    aria-label="Pagination"
  >
    <button
      type="button"
      class="tb-btn-outline tb-btn-sm"
      :disabled="disabled || page <= 1"
      @click="aller(page - 1)"
    >
      Précédent
    </button>
    <!-- `aria-live` : au clavier, le focus reste sur le bouton et rien ne
         signalerait que la page a changé. Poli, pour ne pas couper une lecture
         en cours. -->
    <span class="text-sm text-tambouille-muted" aria-live="polite">
      Page {{ page }} / {{ totalPages }}
    </span>
    <button
      type="button"
      class="tb-btn-outline tb-btn-sm"
      :disabled="disabled || page >= totalPages"
      @click="aller(page + 1)"
    >
      Suivant
    </button>
  </nav>
</template>
