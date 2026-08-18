import { describe, it, expect } from 'vitest'
import { parseFournee, parseLocalDate, FourneeParseError } from '../fournees'

const VALIDE = `---
layout: tall
number: 18
title: Nuit de quinze heures
period: Tout l'hiver
color: "#2D5FA8"
inverted: false
curator: pierrot
from: 2026-12-01
to: 2027-02-28
mixes: [a, b, c, d, e]
---

Il fait noir à 16 h et ça nous va.
`

describe('parseLocalDate', () => {
  it('rend une date à minuit dans le fuseau local', () => {
    const date = parseLocalDate('2026-12-01')
    expect(date?.getFullYear()).toBe(2026)
    expect(date?.getMonth()).toBe(11)
    expect(date?.getDate()).toBe(1)
    expect(date?.getHours()).toBe(0)
  })

  it('refuse une date qui n’existe pas plutôt que de glisser au mois suivant', () => {
    // `new Date(2026, 1, 31)` rend le 3 mars sans se plaindre.
    expect(parseLocalDate('2026-02-31')).toBeNull()
  })

  it('refuse un format qui n’est pas AAAA-MM-JJ', () => {
    expect(parseLocalDate('01/12/2026')).toBeNull()
    expect(parseLocalDate('2026-12')).toBeNull()
  })
})

describe('parseFournee', () => {
  it('lit un fichier valide', () => {
    const source = parseFournee(VALIDE, 'valide.md')
    expect(source.layout).toBe('tall')
    expect(source.number).toBe(18)
    expect(source.title).toBe('Nuit de quinze heures')
    expect(source.period).toBe("Tout l'hiver")
    expect(source.color).toBe('#2D5FA8')
    expect(source.inverted).toBe(false)
    expect(source.curator).toBe('pierrot')
    expect(source.mixIds).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(source.intro).toBe('Il fait noir à 16 h et ça nous va.')
  })

  it('prend `tall` par défaut quand `layout` est absent', () => {
    const source = parseFournee(VALIDE.replace('layout: tall\n', ''), 'defaut.md')
    expect(source.layout).toBe('tall')
  })

  it('nomme le fichier fautif dans le message', () => {
    expect(() => parseFournee(VALIDE.replace('number: 18\n', ''), 'sans-numero.md')).toThrow(
      /sans-numero\.md/,
    )
  })

  it('refuse un fichier sans frontmatter', () => {
    expect(() => parseFournee('juste du texte', 'nu.md')).toThrow(FourneeParseError)
  })

  it('refuse une clé obligatoire absente', () => {
    expect(() =>
      parseFournee(VALIDE.replace('title: Nuit de quinze heures\n', ''), 'x.md'),
    ).toThrow(/title/)
  })

  it('refuse une couleur qui n’est pas un hexadécimal à six chiffres', () => {
    expect(() => parseFournee(VALIDE.replace('"#2D5FA8"', 'bleu'), 'x.md')).toThrow(/color/)
    expect(() => parseFournee(VALIDE.replace('"#2D5FA8"', '"#2D5"'), 'x.md')).toThrow(/color/)
  })

  it('refuse une date illisible', () => {
    expect(() => parseFournee(VALIDE.replace('2026-12-01', 'décembre'), 'x.md')).toThrow(/from/)
  })

  it('refuse une fenêtre qui se termine avant de commencer', () => {
    expect(() => parseFournee(VALIDE.replace('to: 2027-02-28', 'to: 2026-11-01'), 'x.md')).toThrow(
      /avant/,
    )
  })

  it('refuse un texte d’intention vide', () => {
    expect(() =>
      parseFournee(VALIDE.replace('Il fait noir à 16 h et ça nous va.', ''), 'x.md'),
    ).toThrow(/intention/)
  })

  it('refuse un gabarit inconnu', () => {
    expect(() => parseFournee(VALIDE.replace('layout: tall', 'layout: bandeau'), 'x.md')).toThrow(
      /layout/,
    )
  })

  it('refuse `carousel`, dont le composant n’existe pas encore', () => {
    expect(() => parseFournee(VALIDE.replace('layout: tall', 'layout: carousel'), 'x.md')).toThrow(
      /pas encore/,
    )
  })

  it('exige cinq mix pour `tall`', () => {
    expect(() => parseFournee(VALIDE.replace('[a, b, c, d, e]', '[a, b, c, d]'), 'x.md')).toThrow(
      /cinq/,
    )
  })

  it('exige quatre mix pour `large`', () => {
    const large = VALIDE.replace('layout: tall', 'layout: large')
    expect(() => parseFournee(large, 'x.md')).toThrow(/quatre/)
    expect(
      parseFournee(large.replace('[a, b, c, d, e]', '[a, b, c, d]'), 'x.md').mixIds,
    ).toHaveLength(4)
  })
})
