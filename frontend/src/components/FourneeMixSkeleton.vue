<script setup lang="ts">
import { computed } from 'vue'
import type { FourneeZone } from '@/composables/useFourneeTheme'

const props = defineProps<{ zone: FourneeZone; layout?: 'large' | 'tall' }>()

/** Le filet de la carte réelle, à l'identique : c'est lui qui dessine la bande. */
const rule = computed(() => `color-mix(in srgb, ${props.zone.ink} 30%, transparent)`)

/**
 * Les blocs qui tiennent la place du texte. Assez visibles pour qu'on lise une
 * carte en train d'arriver, assez discrets pour ne pas passer pour du contenu.
 */
const bloc = computed(() => `color-mix(in srgb, ${props.zone.ink} 12%, transparent)`)
</script>

<template>
  <!-- La carte avant ses données. Elle reprend au pixel la boîte de
       `FourneeMixCard` — mêmes marges, même format de pochette, même bouton en
       bas — parce que sa seule raison d'être est de réserver exactement la
       hauteur que la vraie prendra. Deux lignes de titre et non une : c'est ce
       que la plupart des titres occupent, et réserver au plus court rendrait le
       saut qu'on cherche à supprimer.

       `aria-hidden` : il n'y a rien à annoncer, et un lecteur d'écran qui
       énumérerait cinq cartes vides desservirait ce qu'il décrit. -->
  <div
    class="flex flex-col border-r border-b px-3 py-6 sm:px-5"
    :style="{ color: zone.ink, borderColor: rule }"
    aria-hidden="true"
  >
    <div
      class="w-full"
      :class="layout === 'large' ? 'aspect-2/3' : 'aspect-3/2'"
      :style="{ backgroundColor: zone.wash }"
    />

    <!-- Le titre : `text-[18px] leading-[1.15]`, `sm:text-[22px]`, deux lignes. -->
    <div class="pt-3.5">
      <div class="h-[21px] w-11/12 sm:h-[25px]" :style="{ backgroundColor: bloc }" />
      <div class="mt-1.5 h-[21px] w-2/3 sm:h-[25px]" :style="{ backgroundColor: bloc }" />
    </div>

    <!-- Le crédit : `text-[13px] leading-[1.45]`, deux lignes. -->
    <div class="pt-4 pb-3">
      <div class="h-[19px] w-1/2" :style="{ backgroundColor: bloc }" />
      <div class="mt-1 h-[19px] w-3/4" :style="{ backgroundColor: bloc }" />
    </div>

    <!-- Le bouton « Lire » : `min-h-9`, bordure de deux pixels. -->
    <div
      class="mt-auto min-h-9 w-full"
      :style="{ border: `2px solid ${rule}`, backgroundColor: 'transparent' }"
    />
  </div>
</template>
