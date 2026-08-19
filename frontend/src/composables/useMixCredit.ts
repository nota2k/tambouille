import type { Mix } from '@/types'

/**
 * Qui montrer sur un mix, et dans quel ordre.
 *
 * Deux noms coexistent : l'artiste, quand la source le donne, et le compte
 * Tambouille qui a mis le mix en ligne. La règle vit ici plutôt que sur les
 * quatre surfaces qui l'appliquent, parce qu'une seule d'entre elles qui
 * diverge produit un affichage incohérent que personne ne remarque tout de
 * suite.
 *
 * `secondary` est null dans deux cas très différents mais rendus pareil : pas
 * d'artiste, ou un artiste qui *est* le compte. Le second existe pour éviter
 * « Nelly Babillon — importé par Nelly Babillon » quand quelqu'un importe son
 * propre mix.
 */
export function mixCredit(mix: Pick<Mix, 'artist' | 'user'>): {
  primary: string
  secondary: string | null
} {
  const compte = mix.user.displayName
  const artiste = mix.artist?.trim()

  // Un artiste vide vaut pas d'artiste : le champ est libre dans le formulaire,
  // et une chaîne d'espaces ne doit pas produire une ligne vide à l'écran.
  if (!artiste) return { primary: compte, secondary: null }

  // La comparaison ignore casse et espaces parce que les deux valeurs sont
  // saisies à la main, dans deux formulaires différents.
  const memePersonne = artiste.toLowerCase() === compte.trim().toLowerCase()
  return memePersonne
    ? { primary: compte, secondary: null }
    : { primary: artiste, secondary: compte }
}
