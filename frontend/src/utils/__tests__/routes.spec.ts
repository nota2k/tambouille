import { describe, it, expect } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import { routes } from '@/router/routes'
import { mixRoute, mixEditRoute } from '../routes'

/**
 * L'adresse d'un mix a gagné un segment, et c'est le genre de changement qui se
 * casse en silence : une URL mal formée ne lève rien, elle mène ailleurs.
 *
 * Ces tests résolvent de vraies adresses contre le vrai routeur — pas une copie
 * du tableau de routes, qui ne prouverait rien de l'ordre réel.
 */

/**
 * Un historique mémoire plutôt que le routeur du site : `createWebHistory`
 * demande un `window` que les tests n'ont pas. La table résolue est la même,
 * dans le même ordre — c'est tout ce que ces tests interrogent.
 */
const router = createRouter({ history: createMemoryHistory(), routes })

const MIX = {
  id: '900a15f2-8fe1-4d4b-9c31-0f2e6a5b7c88',
  slug: 'tabouiedire',
  user: { username: 'nota2k' },
}

describe('adresses de mix', () => {
  it("place l'username avant le slug du titre", () => {
    expect(router.resolve(mixRoute(MIX)).path).toBe('/mixes/nota2k/tabouiedire')
    expect(router.resolve(mixEditRoute(MIX)).path).toBe('/mixes/nota2k/tabouiedire/edit')
  })

  it('résout la nouvelle adresse vers la page du mix', () => {
    const r = router.resolve('/mixes/nota2k/tabouiedire')
    expect(r.name).toBe('mix-detail')
    expect(r.params).toEqual({ username: 'nota2k', slug: 'tabouiedire' })
  })

  /**
   * Les liens déjà partagés. Ils doivent continuer d'arriver sur la page, qui
   * réécrira l'URL une fois le mix connu.
   */
  it("fait vivre l'ancienne adresse à un seul segment", () => {
    const r = router.resolve(`/mixes/${MIX.id}`)
    expect(r.name).toBe('mix-detail-heritee')
    expect(r.params).toEqual({ id: MIX.id })
  })

  it("laisse la nouvelle adresse d'édition à sa route", () => {
    const r = router.resolve('/mixes/nota2k/tabouiedire/edit')
    expect(r.name).toBe('mix-edit')
    expect(r.params).toEqual({ username: 'nota2k', slug: 'tabouiedire' })
  })

  /**
   * Le piège que le slug a créé, et qui n'existait pas avec un identifiant.
   *
   * Un mix intitulé « Edit » a pour slug `edit`, et `/mixes/nota2k/edit` a
   * exactement la forme de l'ancienne adresse d'édition. Vue Router classe le
   * segment fixe avant un paramètre : cette route-là aurait gagné, et le mix
   * serait devenu inatteignable. Elle a donc été retirée — ce test est ce qui
   * empêche de la remettre sans y penser.
   */
  it("n'est pas avalée par un ancien chemin d'édition", () => {
    const r = router.resolve('/mixes/nota2k/edit')
    expect(r.name).toBe('mix-detail')
    expect(r.params).toEqual({ username: 'nota2k', slug: 'edit' })
  })

  /** Les profils sont voisins ; rien ne doit déborder sur eux. */
  it('ne mord pas sur les autres routes à deux segments', () => {
    expect(router.resolve('/users/nota2k').name).toBe('profile')
    expect(router.resolve('/auth/callback').name).toBe('oidc-callback')
  })
})
