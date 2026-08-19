import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue'
import type { Fournee } from '@/types'

/**
 * Les couleurs d'une zone du bandeau. Chaque gabarit compose les siennes à
 * partir des primitives du thème : `tall` peint tout à la couleur de saison,
 * `large` ne la met que dans sa moitié droite et garde du papier à gauche.
 */
export interface FourneeZone {
  /** Le fond de la zone. */
  surface: string
  /** L'encre sur ce fond — et le fond de la carte en lecture, qui s'inverse. */
  ink: string
  /** La couleur de saison, qui remplit boutons et pastilles. */
  season: string
  /** L'encre qui tient sur la couleur de saison. */
  inkOnSeason: string
  /** La teinte claire qui duotone les pochettes. */
  wash: string
}

/**
 * Luminance relative WCAG, pour choisir l'encre posée sur la couleur de saison.
 * Celle-ci est une donnée éditoriale : elle ne peut pas être vérifiée à la main.
 */
function luminance(hex: string): number {
  const raw = hex.replace('#', '')
  const full =
    raw.length === 3
      ? raw
          .split('')
          .map((c) => c + c)
          .join('')
      : raw
  const channels = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
  const linear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const [r = 0, g = 0, b = 0] = channels.map(linear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Contraste WCAG entre deux couleurs, à partir de leurs luminances relatives.
 */
function contraste(l1: number, l2: number): number {
  const [clair, sombre] = l1 >= l2 ? [l1, l2] : [l2, l1]
  return (clair + 0.05) / (sombre + 0.05)
}

export function useFourneeTheme(source: MaybeRefOrGetter<Fournee>): {
  season: ComputedRef<string>
  inkOnSeason: ComputedRef<string>
  paper: ComputedRef<string>
  inkOnPaper: ComputedRef<string>
  seasonOnPaper: ComputedRef<string>
  wash: ComputedRef<string>
} {
  const fournee = computed(() => toValue(source))
  const inverted = computed(() => fournee.value.inverted === true)

  const season = computed(() => fournee.value.color)

  /**
   * L'encre sur la couleur de saison : celle des deux qui contraste le mieux.
   *
   * Le seuil de 4,5:1 du gabarit est ainsi toujours tenu, et ne peut pas ne pas
   * l'être — la couleur qui contrasterait mal avec les deux encres à la fois
   * n'existe pas : au pire, à luminance 0,179, la meilleure vaut encore 4,58:1.
   * Il n'y a donc aucun repli à prévoir, et l'inversion de 3c est ce qu'elle est
   * dans la maquette, un choix éditorial porté par le champ `inverted`.
   */
  const inkOnSeason = computed(() => {
    const l = luminance(season.value)
    return 1.05 / (l + 0.05) >= (l + 0.05) / 0.05 ? '#ffffff' : '#000000'
  })

  /** Le fond neutre du bandeau : papier, ou noir quand la fournée s'inverse. */
  const paper = computed(() => (inverted.value ? '#000000' : '#ffffff'))
  const inkOnPaper = computed(() => (inverted.value ? '#ffffff' : '#000000'))

  /**
   * La couleur de saison utilisée comme encre sur le papier — pour un titre,
   * en gros caractères, le seuil applicable est 3:1 et non 4,5:1. Contrairement
   * à `inkOnSeason`, rien ne garantit que la couleur du rédacteur tienne ce
   * seuil sur le papier (une couleur claire comme `#FFD700` sur blanc ne fait
   * que 1,4:1) : on ne l'éclaircit ni ne l'assombrit jamais — renoncer à
   * l'appliquer est moins surprenant que la modifier — et on retombe sur
   * `inkOnPaper`.
   */
  const seasonOnPaper = computed(() => {
    const tient = contraste(luminance(season.value), luminance(paper.value)) >= 3
    return tient ? season.value : inkOnPaper.value
  })

  const wash = computed(() => `color-mix(in srgb, ${season.value} 55%, #ffffff)`)

  return { season, inkOnSeason, paper, inkOnPaper, seasonOnPaper, wash }
}
