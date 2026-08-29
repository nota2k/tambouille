import { describe, it, expect } from 'vitest'
import { cibleDeDefilement } from '../scroll'

/** Le strict nécessaire de ce que le routeur passe : seul le fragment est lu. */
const versLaPage = (hash = '') => ({ hash })

describe('cibleDeDefilement', () => {
  it('vise le haut de page pour une navigation ordinaire', () => {
    expect(cibleDeDefilement(versLaPage(), null)).toBe(0)
  })

  /**
   * Le retour arrière rend sa place au lecteur. Sans cette branche, remettre
   * toujours en haut remplacerait une gêne par une autre : revenir de la page
   * d'un mix à la liste où on l'avait pris ferait perdre le fil.
   */
  it('rend au retour arrière la position qu’il avait quittée', () => {
    expect(cibleDeDefilement(versLaPage(), { left: 0, top: 1840 })).toBe(1840)
  })

  it('vise l’ancre quand l’adresse en porte une', () => {
    expect(cibleDeDefilement(versLaPage('#commentaires'), null)).toBe('#commentaires')
  })

  /** Le retour arrière prime : une adresse enregistrée porte souvent son ancre. */
  it('préfère la position enregistrée à l’ancre', () => {
    expect(cibleDeDefilement(versLaPage('#commentaires'), { left: 0, top: 300 })).toBe(300)
  })
})
