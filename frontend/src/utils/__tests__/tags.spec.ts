import { describe, expect, it } from 'vitest'
import { fragmentEnCours, proposerTags, remplacerLeFragment, tagsPoses } from '@/utils/tags'

const CONNUS = ['house', 'house-music', 'acid-house', 'dub', 'new wave', 'Ouïedire']

describe('fragmentEnCours', () => {
  it('prend ce qui suit la dernière virgule, pas toute la saisie', () => {
    expect(fragmentEnCours('dub, hou')).toBe('hou')
  })

  it('ignore la casse et les espaces, comme la comparaison qui suit', () => {
    expect(fragmentEnCours('dub,   HOU  ')).toBe('hou')
  })

  it('rend une chaîne vide juste après une virgule : tout est encore proposable', () => {
    expect(fragmentEnCours('dub, ')).toBe('')
  })
})

describe('tagsPoses', () => {
  it('écarte les vides que laissent une virgule finale ou double', () => {
    expect(tagsPoses('dub, , house,')).toEqual(['dub', 'house'])
  })
})

describe('proposerTags', () => {
  it('place les tags qui COMMENCENT par la saisie avant ceux qui la contiennent', () => {
    // Sans cet ordre, « acid-house » passerait devant « house » par ordre
    // alphabétique, et la correspondance exacte serait enterrée.
    expect(proposerTags(CONNUS, 'hous')).toEqual(['house', 'house-music', 'acid-house'])
  })

  it('ne repropose pas un tag déjà posé', () => {
    expect(proposerTags(CONNUS, 'house, hous')).toEqual(['house-music', 'acid-house'])
  })

  it('ignore la casse des deux côtés', () => {
    expect(proposerTags(CONNUS, 'ouïe')).toEqual(['Ouïedire'])
    expect(proposerTags(CONNUS, 'OUÏEDIRE, du')).toEqual(['dub'])
  })

  it('propose tout, plafonné, quand rien n’est encore tapé', () => {
    expect(proposerTags(CONNUS, '', 3)).toEqual(['house', 'house-music', 'acid-house'])
  })

  it('ne rend rien quand aucun tag ne correspond', () => {
    expect(proposerTags(CONNUS, 'zzz')).toEqual([])
  })
})

describe('remplacerLeFragment', () => {
  it('remplace le fragment en cours et non toute la saisie', () => {
    expect(remplacerLeFragment('dub, hou', 'house')).toBe('dub, house, ')
  })

  it('part de zéro quand il n’y a pas encore de virgule', () => {
    expect(remplacerLeFragment('hou', 'house')).toBe('house, ')
  })

  it('laisse une virgule finale : sans elle, le tag suivant se collerait au précédent', () => {
    expect(remplacerLeFragment('dub, ', 'house')).toBe('dub, house, ')
  })

  it('conserve les tags déjà posés à l’identique', () => {
    expect(remplacerLeFragment('new wave, acid-house, ho', 'house')).toBe(
      'new wave, acid-house, house, ',
    )
  })
})
