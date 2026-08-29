import { describe, expect, it } from 'vitest'
import { mediaSrcset, mediaUrl } from '../media'

/**
 * Les attentes se construisent à partir de `mediaUrl` plutôt que d'un hôte
 * écrit en dur : la base vient de `VITE_R2_PUBLIC_URL`, et un test qui la
 * figerait tomberait au premier changement d'environnement sans rien dire
 * d'utile sur la règle qu'il vérifie.
 */
describe('mediaSrcset', () => {
  it('propose les deux variantes puis l’originale, par largeur croissante', () => {
    expect(mediaSrcset('covers/abc.webp')).toBe(
      [
        `${mediaUrl('covers/abc-400.webp')} 400w`,
        `${mediaUrl('covers/abc-800.webp')} 800w`,
        `${mediaUrl('covers/abc.webp')} 1400w`,
      ].join(', '),
    )
  })

  it('applique les largeurs propres aux avatars', () => {
    const srcset = mediaSrcset('avatars/abc.webp')
    expect(srcset).toContain('128w')
    expect(srcset).toContain('256w')
    expect(srcset).toContain('512w')
    expect(srcset).not.toContain('400w')
  })

  it.each([
    // Les chemins hérités n'ont jamais eu de variantes : demander
    // `/uploads/covers/abc-400.jpg` donnerait un 404, et un candidat en 404
    // n'en fait pas essayer un autre — le navigateur n'affiche rien.
    '/uploads/covers/abc.jpg',
    // Une pochette distante ne nous appartient pas.
    'https://exemple.test/pochette.jpg',
    // Répertoire inconnu : rien n'y produit de variantes.
    'audio/abc.mp3',
    'divers/abc.webp',
    // Sans répertoire, ni sans extension, il n'y a pas de nom à dériver.
    'abc.webp',
    'covers/abc',
  ])('ne propose aucun srcset pour %s', (chemin) => {
    expect(mediaSrcset(chemin)).toBeUndefined()
  })

  it.each([null, undefined, ''])('ne propose rien pour %s', (chemin) => {
    expect(mediaSrcset(chemin)).toBeUndefined()
  })

  it('ne se laisse pas tromper par un point dans le nom', () => {
    expect(mediaSrcset('covers/a.b.webp')).toContain('covers/a.b-400.webp')
  })
})
