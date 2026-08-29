import { describe, it, expect } from 'vitest'
import { nomDeLaSource } from '@/utils/source'

describe('nomDeLaSource', () => {
  it('nomme les deux moteurs de lecture sans regarder l’adresse', () => {
    expect(nomDeLaSource('mixcloud', '/Notamusic/vorwerk-2/')).toBe('Mixcloud')
    expect(nomDeLaSource('soundcloud', 'https://soundcloud.com/a/b')).toBe('SoundCloud')
  })

  it('écrit Ouïedire comme le site l’écrit', () => {
    expect(
      nomDeLaSource('remote', 'https://www.ouiedire.net/assets/emission/ailleurs-54/x.mp3'),
    ).toBe('Ouïedire')
  })

  it('reconnaît le sous-domaine de fichiers de LYL', () => {
    expect(nomDeLaSource('remote', 'https://static.lyl.live/uploads/x.mp3')).toBe('LYL Radio')
  })

  /**
   * L'entrée était écrite `www.thebrainradio.com`, que la recherche ne pouvait
   * pas atteindre : elle retire `www.` avant de consulter la table. La page
   * annonçait donc « thebrainradio.com ».
   */
  it('écrit The Brain Radioshow, et non son domaine nu', () => {
    expect(nomDeLaSource('remote', 'https://www.thebrainradio.com/mp3/thebrain044.mp3')).toBe(
      'The Brain Radioshow',
    )
    expect(nomDeLaSource('remote', 'https://thebrainradio.com/mp3/thebrain044.mp3')).toBe(
      'The Brain Radioshow',
    )
  })

  it('se rabat sur le domaine nu pour un site non répertorié', () => {
    expect(nomDeLaSource('remote', 'https://www.exemple.test/un.mp3')).toBe('exemple.test')
  })

  it('ne nomme rien sans source, ni sur une adresse illisible', () => {
    expect(nomDeLaSource('remote', null)).toBeNull()
    expect(nomDeLaSource(null, null)).toBeNull()
    expect(nomDeLaSource('remote', 'pas une url')).toBeNull()
  })
})
