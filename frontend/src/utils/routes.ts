import type { RouteLocationNamedRaw } from 'vue-router'
import type { Mix } from '@/types'

/**
 * Où vit un mix, en un seul endroit.
 *
 * L'adresse d'un mix tient désormais en deux paramètres — le compte qui l'a
 * déposé, puis l'identifiant — et douze surfaces la construisaient. Une seule
 * qui oublie l'username produit une URL qui ne résout plus, et le typage ne
 * l'attrape pas : `params` est un dictionnaire libre côté Vue Router.
 *
 * D'où ces fonctions : le seul endroit du code qui connaisse la forme.
 */

/**
 * Le strict nécessaire pour situer un mix.
 *
 * Volontairement plus étroit que `Mix` : la barre de lecture, les cartes et les
 * suggestions manipulent des objets différents, et rien ici ne demande une
 * pochette ou une tracklist.
 */
export type MixLocalisable = Pick<Mix, 'id'> & { user: Pick<Mix['user'], 'username'> }

/** L'adresse canonique d'un mix. */
export function mixRoute(mix: MixLocalisable): RouteLocationNamedRaw {
  return { name: 'mix-detail', params: { username: mix.user.username, id: mix.id } }
}

/** L'adresse de son formulaire d'édition. */
export function mixEditRoute(mix: MixLocalisable): RouteLocationNamedRaw {
  return { name: 'mix-edit', params: { username: mix.user.username, id: mix.id } }
}
