import { apiClient } from '@/api/client'
import type { Mix } from '@/types'

/** Toggles a mix's favorite status, optimistically updating the given Mix object in place. */
export async function toggleMixFavorite(mix: Mix) {
  const wasFavorited = mix.isFavorited

  mix.isFavorited = !wasFavorited
  mix.favoritesCount += wasFavorited ? -1 : 1

  try {
    if (wasFavorited) {
      await apiClient.delete(`/mixes/${mix.id}/favorite`)
    } else {
      await apiClient.post(`/mixes/${mix.id}/favorite`)
    }
  } catch (err) {
    mix.isFavorited = wasFavorited
    mix.favoritesCount += wasFavorited ? 1 : -1
    throw err
  }
}
