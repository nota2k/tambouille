import { describe, it, expect } from 'vitest'
import { mixCredit } from '../useMixCredit'

const compte = { id: 'u1', username: 'nelly', displayName: 'Nelly Babillon', avatarUrl: null }

describe('mixCredit', () => {
  it('sans artiste, ne montre que le compte', () => {
    expect(mixCredit({ artist: null, user: compte })).toEqual({
      primary: 'Nelly Babillon',
      secondary: null,
    })
  })

  it('avec un artiste différent, le met devant et le compte derrière', () => {
    expect(mixCredit({ artist: 'Dj PUTE ACIER', user: compte })).toEqual({
      primary: 'Dj PUTE ACIER',
      secondary: 'Nelly Babillon',
    })
  })

  it("quand l'artiste est le compte, ne montre qu'un nom", () => {
    // Sinon on lirait « Nelly Babillon — importé par Nelly Babillon ».
    expect(mixCredit({ artist: 'Nelly Babillon', user: compte })).toEqual({
      primary: 'Nelly Babillon',
      secondary: null,
    })
  })

  it('compare sans tenir compte de la casse ni des espaces de bordure', () => {
    const credit = mixCredit({ artist: '  nelly babillon  ', user: compte })
    expect(credit.secondary).toBeNull()
    // La casse du compte l'emporte quand c'est la même personne — une
    // décision de conception, pas un hasard de comparaison.
    expect(credit.primary).toBe('Nelly Babillon')
  })

  it("garde la casse de l'artiste telle que la source l'écrit", () => {
    expect(mixCredit({ artist: 'dj PUTE acier', user: compte }).primary).toBe('dj PUTE acier')
  })

  it('traite un artiste vide comme absent', () => {
    const credit = mixCredit({ artist: '   ', user: compte })
    expect(credit.secondary).toBeNull()
    expect(credit.primary).toBe('Nelly Babillon')
  })
})
