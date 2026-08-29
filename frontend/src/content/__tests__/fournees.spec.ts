import { describe, it, expect } from 'vitest'
import { parseFournee, parseLocalDate, FourneeParseError, selectFournee } from '../fournees'
import type { FourneeSource } from '../fournees'

const CINQ =
  '[djnelly/tabouiedire, djnelly/vorwerk-2, Lenta-po/antimythes, djnelly/absorbed, djnelly/passages-pas-sages]'
const QUATRE = '[djnelly/tabouiedire, djnelly/vorwerk-2, Lenta-po/antimythes, djnelly/absorbed]'

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
mixes: ${CINQ}
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
    expect(source.mixRefs).toEqual([
      { username: 'djnelly', slug: 'tabouiedire' },
      { username: 'djnelly', slug: 'vorwerk-2' },
      { username: 'Lenta-po', slug: 'antimythes' },
      { username: 'djnelly', slug: 'absorbed' },
      { username: 'djnelly', slug: 'passages-pas-sages' },
    ])
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
    expect(() => parseFournee(VALIDE.replace(CINQ, QUATRE), 'x.md')).toThrow(/cinq/)
  })

  it('exige quatre mix pour `large`', () => {
    const large = VALIDE.replace('layout: tall', 'layout: large')
    expect(() => parseFournee(large, 'x.md')).toThrow(/quatre/)
    expect(parseFournee(large.replace(CINQ, QUATRE), 'x.md').mixRefs).toHaveLength(4)
  })

  it('affiche la fournée quand `display` est absent', () => {
    expect(parseFournee(VALIDE, 'x.md').display).toBe(true)
  })

  it('met la fournée en veille sur `display: false`', () => {
    const veille = VALIDE.replace('inverted: false', 'inverted: false\ndisplay: false')
    expect(parseFournee(veille, 'x.md').display).toBe(false)
  })

  it('refuse un `display` qui n’est ni `true` ni `false`', () => {
    const faute = VALIDE.replace('inverted: false', 'inverted: false\ndisplay: fasle')
    expect(() => parseFournee(faute, 'x.md')).toThrow(/display/)
  })

  it('refuse un mix cité sans son compte, en le nommant', () => {
    // Le format d'avant : un UUID nu. Il ne désigne plus rien.
    const nu = VALIDE.replace('djnelly/tabouiedire', '7578d396-c389-48de-905e-c688c1040864')
    expect(() => parseFournee(nu, 'x.md')).toThrow(/7578d396-c389-48de-905e-c688c1040864/)
    expect(() => parseFournee(nu, 'x.md')).toThrow(/compte\/titre/)
  })

  it('refuse une référence dont une moitié manque', () => {
    expect(() =>
      parseFournee(VALIDE.replace('djnelly/tabouiedire', '/tabouiedire'), 'x.md'),
    ).toThrow(/compte\/titre/)
    expect(() => parseFournee(VALIDE.replace('djnelly/tabouiedire', 'djnelly/'), 'x.md')).toThrow(
      /compte\/titre/,
    )
  })

  it('refuse une référence à plus de deux segments', () => {
    expect(() =>
      parseFournee(VALIDE.replace('djnelly/tabouiedire', 'djnelly/mixes/tabouiedire'), 'x.md'),
    ).toThrow(/compte\/titre/)
  })
})

function source(from: string, to: string, title = 'x', display = true): FourneeSource {
  return {
    layout: 'tall',
    number: 1,
    title,
    period: 'p',
    color: '#000000',
    inverted: false,
    curator: 'c',
    intro: 'i',
    display,
    from: new Date(from),
    to: new Date(to),
    mixRefs: [
      { username: 'n', slug: 'a' },
      { username: 'n', slug: 'b' },
      { username: 'n', slug: 'c' },
      { username: 'n', slug: 'd' },
      { username: 'n', slug: 'e' },
    ],
  }
}

/** Un instant dans la journée, pour éprouver les bornes ailleurs qu'à minuit. */
function midi(jour: string): Date {
  const d = new Date(jour)
  d.setHours(12, 0, 0, 0)
  return d
}

describe('selectFournee', () => {
  const hiver = source('2026-12-01T00:00:00', '2027-02-28T00:00:00', 'hiver')

  it(`rend null sur un dossier vide`, () => {
    expect(selectFournee([], midi('2026-12-15T00:00:00'))).toBeNull()
  })

  it(`rend null avant l'ouverture`, () => {
    expect(selectFournee([hiver], midi('2026-11-30T00:00:00'))).toBeNull()
  })

  it(`rend la fournée pendant la fenêtre`, () => {
    expect(selectFournee([hiver], midi('2027-01-15T00:00:00'))?.title).toBe('hiver')
  })

  it(`inclut le jour d'ouverture, dès minuit`, () => {
    expect(selectFournee([hiver], new Date('2026-12-01T00:00:00'))?.title).toBe('hiver')
  })

  it(`inclut le jour de clôture jusqu'à son dernier instant`, () => {
    expect(selectFournee([hiver], midi('2027-02-28T00:00:00'))?.title).toBe('hiver')
    const finDeJournee = new Date('2027-02-28T23:59:59')
    expect(selectFournee([hiver], finDeJournee)?.title).toBe('hiver')
  })

  it(`rend null le lendemain de la clôture`, () => {
    expect(selectFournee([hiver], new Date('2027-03-01T00:00:00'))).toBeNull()
  })

  it(`écarte une fournée en veille, même en pleine fenêtre`, () => {
    const veille = source('2026-12-01T00:00:00', '2027-03-31T00:00:00', 'veille', false)
    expect(selectFournee([veille], midi('2027-01-15T00:00:00'))).toBeNull()
  })

  it(`laisse la place à une fournée en cours quand la plus récente est en veille`, () => {
    // Sans quoi mettre une fournée en veille éteindrait le bandeau au lieu de
    // rendre la main à celle d'avant.
    const ancienne = source('2026-12-01T00:00:00', '2027-03-31T00:00:00', 'ancienne')
    const veille = source('2027-01-01T00:00:00', '2027-03-31T00:00:00', 'veille', false)
    expect(selectFournee([ancienne, veille], midi('2027-02-01T00:00:00'))?.title).toBe('ancienne')
  })

  it(`départage un recouvrement par le \`from\` le plus récent`, () => {
    const ancienne = source('2026-12-01T00:00:00', '2027-03-31T00:00:00', 'ancienne')
    const recente = source('2027-01-01T00:00:00', '2027-03-31T00:00:00', 'recente')
    expect(selectFournee([ancienne, recente], midi('2027-02-01T00:00:00'))?.title).toBe('recente')
    // L'ordre du tableau ne doit rien changer.
    expect(selectFournee([recente, ancienne], midi('2027-02-01T00:00:00'))?.title).toBe('recente')
  })

  it(`ignore les fournées hors fenêtre pour en élire une en cours`, () => {
    const passee = source('2026-01-01T00:00:00', '2026-03-01T00:00:00', 'passee')
    expect(selectFournee([passee, hiver], midi('2027-01-15T00:00:00'))?.title).toBe('hiver')
  })
})
