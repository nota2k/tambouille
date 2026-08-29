import { describe, it, expect } from 'vitest'
import { positionDeDefilement } from '../scroll'

/** Le strict nécessaire de ce que le routeur passe : seul le fragment est lu. */
const versLaPage = (hash = '') => ({ hash })

describe('positionDeDefilement', () => {
  it('remet en haut de page une navigation ordinaire', () => {
    expect(positionDeDefilement(versLaPage(), versLaPage(), null)).toEqual({
      top: 0,
      behavior: 'instant',
    })
  })

  /**
   * `behavior: 'instant'` et non `'auto'` : sous mouvement réduit, Lenis ne
   * démarre pas, `html` n'a donc pas sa classe et la feuille de style rend
   * `scroll-behavior: smooth`. Un `'auto'` s'en remettrait à cette valeur et
   * animerait le retour en haut — précisément l'animation que ces lecteurs ont
   * demandé de ne pas voir.
   */
  it('remonte sans animer, quel que soit le réglage de la feuille de style', () => {
    expect(positionDeDefilement(versLaPage(), versLaPage(), null)).toMatchObject({
      behavior: 'instant',
    })
    expect(positionDeDefilement(versLaPage('#commentaires'), versLaPage(), null)).toMatchObject({
      behavior: 'instant',
    })
  })

  /**
   * Le retour arrière rend sa place au lecteur. Sans cette branche, remettre
   * toujours en haut remplacerait une gêne par une autre : revenir de la page
   * d'un mix à la liste où on l'avait pris ferait perdre le fil.
   */
  it('rend au retour arrière la position qu’il avait quittée', () => {
    const enregistree = { left: 0, top: 1840 }

    expect(positionDeDefilement(versLaPage(), versLaPage(), enregistree)).toBe(enregistree)
  })

  it('vise l’ancre quand l’adresse en porte une', () => {
    expect(positionDeDefilement(versLaPage('#commentaires'), versLaPage(), null)).toEqual({
      el: '#commentaires',
      behavior: 'instant',
    })
  })

  /** Le retour arrière prime : une adresse enregistrée porte souvent son ancre. */
  it('préfère la position enregistrée à l’ancre', () => {
    const enregistree = { left: 0, top: 300 }

    expect(positionDeDefilement(versLaPage('#commentaires'), versLaPage(), enregistree)).toBe(
      enregistree,
    )
  })
})
