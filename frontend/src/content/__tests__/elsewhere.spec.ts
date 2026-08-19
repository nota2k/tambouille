import { describe, it, expect } from 'vitest'
import { parseElsewhere, ElsewhereParseError } from '../elsewhere'

const VALIDE = `---
title: Écoutez ailleurs
note: 4 radios · 1 label
---

## Radio Panik
Bruxelles · 105.4 FM
https://www.radiopanik.org

## LYL Radio
Lyon · en ligne
https://lyl.live
`

describe('parseElsewhere', () => {
  it('lit un fichier valide', () => {
    const list = parseElsewhere(VALIDE, 'elsewhere.md')
    expect(list.title).toBe('Écoutez ailleurs')
    expect(list.note).toBe('4 radios · 1 label')
    expect(list.entries).toHaveLength(2)
  })

  it('rattache contexte et lien à la bonne entrée', () => {
    const [panik, lyl] = parseElsewhere(VALIDE, 'elsewhere.md').entries
    expect(panik).toEqual({
      name: 'Radio Panik',
      note: 'Bruxelles · 105.4 FM',
      url: 'https://www.radiopanik.org',
    })
    expect(lyl?.name).toBe('LYL Radio')
  })

  it('accepte le lien avant le contexte — la forme suffit à les distinguer', () => {
    const inverse = VALIDE.replace(
      'Bruxelles · 105.4 FM\nhttps://www.radiopanik.org',
      'https://www.radiopanik.org\nBruxelles · 105.4 FM',
    )
    const panik = parseElsewhere(inverse, 'x.md').entries[0]
    expect(panik?.note).toBe('Bruxelles · 105.4 FM')
    expect(panik?.url).toBe('https://www.radiopanik.org')
  })

  it('rend `allUrl` indéfini quand la page complète n’existe pas encore', () => {
    expect(parseElsewhere(VALIDE, 'x.md').allUrl).toBeUndefined()
    const avec = VALIDE.replace('note: 4 radios · 1 label', 'note: x\nallUrl: https://exemple.fr')
    expect(parseElsewhere(avec, 'x.md').allUrl).toBe('https://exemple.fr')
  })

  it('nomme le fichier fautif dans le message', () => {
    expect(() => parseElsewhere('juste du texte', 'elsewhere.md')).toThrow(/elsewhere\.md/)
  })

  it('refuse un fichier sans frontmatter', () => {
    expect(() => parseElsewhere('juste du texte', 'x.md')).toThrow(ElsewhereParseError)
  })

  it('refuse une clé obligatoire absente', () => {
    expect(() => parseElsewhere(VALIDE.replace('note: 4 radios · 1 label\n', ''), 'x.md')).toThrow(
      /note/,
    )
  })

  it('refuse un fichier sans aucune entrée', () => {
    expect(() => parseElsewhere(VALIDE.slice(0, VALIDE.indexOf('## Radio')), 'x.md')).toThrow(
      /aucune entrée/,
    )
  })

  it('refuse une entrée sans ligne de contexte', () => {
    expect(() => parseElsewhere(VALIDE.replace('Bruxelles · 105.4 FM\n', ''), 'x.md')).toThrow(
      /pas de ligne de contexte/,
    )
  })

  it('refuse une entrée sans lien', () => {
    expect(() =>
      parseElsewhere(VALIDE.replace('https://www.radiopanik.org\n', ''), 'x.md'),
    ).toThrow(/pas de lien/)
  })

  it('refuse une ligne posée avant la première entrée', () => {
    expect(() =>
      parseElsewhere(VALIDE.replace('## Radio Panik', 'Bruxelles\n## Radio Panik'), 'x.md'),
    ).toThrow(/précède la première entrée/)
  })
})
