import { describe, it, expect } from 'vitest'
import { useFourneeTheme } from '../useFourneeTheme'
import type { Fournee } from '@/types'

function fournee(color: string, inverted = false): Fournee {
  return {
    layout: 'tall',
    number: 1,
    period: 'p',
    title: 't',
    intro: 'i',
    color,
    inverted,
    curator: 'c',
    mixes: [],
  }
}

describe('useFourneeTheme', () => {
  it('pose l’encre blanche sur un bleu sombre', () => {
    const t = useFourneeTheme(fournee('#2D5FA8'))
    expect(t.season.value).toBe('#2D5FA8')
    expect(t.inkOnSeason.value).toBe('#ffffff')
  })

  it('bascule l’encre en noir sur un or clair, où le blanc ne tiendrait pas', () => {
    // Blanc sur #C9A227 ne donne que 2,42:1 ; noir donne 8,67:1.
    expect(useFourneeTheme(fournee('#C9A227')).inkOnSeason.value).toBe('#000000')
  })

  it('le papier est blanc, et son encre noire', () => {
    const t = useFourneeTheme(fournee('#2D5FA8'))
    expect(t.paper.value).toBe('#ffffff')
    expect(t.inkOnPaper.value).toBe('#000000')
  })

  it('inversé, le papier devient noir et son encre blanche', () => {
    const t = useFourneeTheme(fournee('#C9A227', true))
    expect(t.paper.value).toBe('#000000')
    expect(t.inkOnPaper.value).toBe('#ffffff')
    // La couleur de saison, elle, ne bouge pas : c'est l'accent.
    expect(t.season.value).toBe('#C9A227')
    expect(t.inkOnSeason.value).toBe('#000000')
  })

  it('la teinte des pochettes mélange la saison à du blanc', () => {
    expect(useFourneeTheme(fournee('#2D5FA8')).wash.value).toContain('#2D5FA8')
  })
})
