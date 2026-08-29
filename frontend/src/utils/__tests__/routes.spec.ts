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
  user: { username: 'nota2k' },
}

describe('adresses de mix', () => {
  it("place l'username avant l'identifiant", () => {
    expect(router.resolve(mixRoute(MIX)).path).toBe(`/mixes/nota2k/${MIX.id}`)
    expect(router.resolve(mixEditRoute(MIX)).path).toBe(`/mixes/nota2k/${MIX.id}/edit`)
  })

  it('résout la nouvelle adresse vers la page du mix', () => {
    const r = router.resolve(`/mixes/nota2k/${MIX.id}`)
    expect(r.name).toBe('mix-detail')
    expect(r.params).toEqual({ username: 'nota2k', id: MIX.id })
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

  /**
   * Le piège de ce chantier : `/mixes/<a>/<b>` décrit à la fois la nouvelle
   * adresse d'un mix et l'ancienne adresse d'édition. Vue Router classe le
   * segment fixe `edit` avant un paramètre, donc l'ancien signet gagne — et il a
   * raison, puisqu'aucun identifiant de mix ne vaut « edit ».
   */
  it("n'avale pas l'ancienne adresse d'édition", () => {
    const r = router.resolve(`/mixes/${MIX.id}/edit`)
    expect(r.name).toBe('mix-edit-heritee')
    expect(r.params).toEqual({ id: MIX.id })
  })

  /** Et inversement : un username ne doit pas se faire lire comme un mix. */
  it("laisse la nouvelle adresse d'édition à sa route", () => {
    const r = router.resolve(`/mixes/nota2k/${MIX.id}/edit`)
    expect(r.name).toBe('mix-edit')
    expect(r.params).toEqual({ username: 'nota2k', id: MIX.id })
  })

  /** Les profils sont voisins ; rien ne doit déborder sur eux. */
  it('ne mord pas sur les autres routes à deux segments', () => {
    expect(router.resolve('/users/nota2k').name).toBe('profile')
    expect(router.resolve('/auth/callback').name).toBe('oidc-callback')
  })
})
