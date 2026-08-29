import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mix } from '@/types'

const get = vi.fn()
vi.mock('@/api/client', () => ({ apiClient: { get: (...args: unknown[]) => get(...args) } }))

const { resolveMixes } = await import('../useFournee')

function mix(id: string): Mix {
  return {
    id,
    title: `mix ${id}`,
    slug: `mix-${id}`,
    description: null,
    artist: null,
    audioUrl: `${id}.mp3`,
    sourceType: null,
    sourceRef: null,
    coverUrl: null,
    durationSec: 600,
    playsCount: 0,
    favoritesCount: 0,
    commentsCount: 0,
    isFavorited: false,
    tags: [],
    tracklist: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    userId: `u-${id}`,
    user: { id: `u-${id}`, username: id, displayName: id, avatarUrl: null },
  }
}

describe('resolveMixes', () => {
  beforeEach(() => {
    // Accolades nécessaires : `() => get.mockReset()` renvoie le mock
    // lui-même (mockReset() renvoie `this`), et Vitest traite la valeur de
    // retour d'un hook comme un callback de nettoyage — il rappellerait
    // `get` sans argument juste après le test.
    get.mockReset()
  })

  it('rend les mix dans l’ordre du fichier, pas celui des réponses', async () => {
    get.mockImplementation((url: string) => {
      const id = url.split('/').pop() as string
      const delai = id === 'a' ? 20 : 0
      return new Promise((resolve) => setTimeout(() => resolve({ data: mix(id) }), delai))
    })
    const resolus = await resolveMixes(['a', 'b', 'c'])
    expect(resolus.map((m) => m.id)).toEqual(['a', 'b', 'c'])
  })

  it('retire sans bruit un mix supprimé depuis l’écriture du fichier', async () => {
    get.mockImplementation((url: string) => {
      const id = url.split('/').pop() as string
      return id === 'b' ? Promise.reject(new Error('404')) : Promise.resolve({ data: mix(id) })
    })
    const resolus = await resolveMixes(['a', 'b', 'c'])
    expect(resolus.map((m) => m.id)).toEqual(['a', 'c'])
  })

  it('interroge chaque identifiant une fois', async () => {
    get.mockImplementation((url: string) =>
      Promise.resolve({ data: mix(url.split('/').pop() as string) }),
    )
    await resolveMixes(['a', 'b'])
    expect(get).toHaveBeenCalledTimes(2)
    expect(get).toHaveBeenCalledWith('/mixes/a')
    expect(get).toHaveBeenCalledWith('/mixes/b')
  })
})
