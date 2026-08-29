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
 * Le couple (compte, slug) et non l'identifiant : c'est lui qui est dans
 * l'adresse. Un slug n'est unique que par compte — deux personnes ont le droit
 * de publier « mix 57 » — donc l'username n'est pas décoratif ici, il fait
 * partie de la désignation.
 */
export type MixLocalisable = Pick<Mix, 'slug'> & { user: Pick<Mix['user'], 'username'> }

/** L'adresse canonique d'un mix. */
export function mixRoute(mix: MixLocalisable): RouteLocationNamedRaw {
  return { name: 'mix-detail', params: { username: mix.user.username, slug: mix.slug } }
}

/** L'adresse de son formulaire d'édition. */
export function mixEditRoute(mix: MixLocalisable): RouteLocationNamedRaw {
  return { name: 'mix-edit', params: { username: mix.user.username, slug: mix.slug } }
}
