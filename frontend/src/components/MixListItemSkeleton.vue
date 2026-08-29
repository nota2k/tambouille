<template>
  <!-- La ligne du flux avant ses données. Elle reprend la boîte de
       `MixListItem` — mêmes marges négatives, même pochette carrée, mêmes
       `py-4`, même filet — parce que sa seule raison d'être est de réserver
       exactement la hauteur que la vraie prendra : 188 px de pochette, 32 px de
       gouttières et le filet, soit les 221 px mesurés sur la vraie ligne.

       C'est la pochette qui donne sa hauteur à la ligne, jamais la colonne de
       texte : les blocs de droite n'ont donc qu'à rester sous elle, pas à
       l'égaler au pixel.

       `aria-hidden` : il n'y a rien à annoncer, et un lecteur d'écran qui
       énumérerait neuf lignes vides desservirait ce qu'il décrit. -->
  <div
    class="-mx-4 flex items-center gap-4 border-b border-black/12 px-4 py-4 sm:gap-5"
    aria-hidden="true"
  >
    <div class="aspect-square w-[122px] shrink-0 bg-tambouille-surface-hover sm:w-[188px]" />

    <div class="min-w-0 flex-1">
      <!-- Le titre : `text-[24px] leading-tight`, une ligne. -->
      <div class="h-[29px] w-3/4 bg-tambouille-surface-hover" />
      <!-- La ligne auteur · durée · morceaux, en `text-sm`. -->
      <div class="mt-1.5 h-5 w-1/2 bg-tambouille-surface-hover" />
      <!-- La forme d'onde, `mt-2` comme le vrai lecteur. -->
      <div class="mt-2 h-10 w-full bg-tambouille-surface-hover" />
    </div>

    <!-- Le bouton « Lire », `tb-btn-sm`. -->
    <div class="h-9 w-[86px] shrink-0 bg-tambouille-surface-hover" />
  </div>
</template>
