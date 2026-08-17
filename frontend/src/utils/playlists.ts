import { apiClient } from '@/api/client'
import type { Playlist, PlaylistListResponse, PlaylistSummary } from '@/types'

/** The caller's playlists. Pass a mixId to have each one report `containsMix`. */
export async function fetchMyPlaylists(mixId?: string) {
  const { data } = await apiClient.get<PlaylistSummary[]>('/playlists/me', {
    params: mixId ? { mixId } : undefined,
  })
  return data
}

export async function fetchPlaylist(id: string) {
  const { data } = await apiClient.get<Playlist>(`/playlists/${id}`)
  return data
}

export async function fetchUserPlaylists(
  username: string,
  params?: { page?: number; limit?: number },
) {
  const { data } = await apiClient.get<PlaylistListResponse>(`/users/${username}/playlists`, {
    params,
  })
  return data
}

export async function createPlaylist(input: { title: string; description?: string }) {
  const { data } = await apiClient.post<PlaylistSummary>('/playlists', input)
  return data
}

export async function updatePlaylist(id: string, input: { title?: string; description?: string }) {
  const { data } = await apiClient.patch<PlaylistSummary>(`/playlists/${id}`, input)
  return data
}

export async function deletePlaylist(id: string) {
  await apiClient.delete(`/playlists/${id}`)
}

export async function addMixToPlaylist(playlistId: string, mixId: string) {
  await apiClient.post(`/playlists/${playlistId}/mixes`, { mixId })
}

export async function removeMixFromPlaylist(playlistId: string, mixId: string) {
  await apiClient.delete(`/playlists/${playlistId}/mixes/${mixId}`)
}

/**
 * Adds or removes a mix depending on the playlist's current `containsMix`, updating
 * that flag and the count in place. Reverts both on failure, like toggleMixFavorite.
 */
export async function toggleMixInPlaylist(playlist: PlaylistSummary, mixId: string) {
  const wasIn = playlist.containsMix === true

  playlist.containsMix = !wasIn
  playlist.mixesCount += wasIn ? -1 : 1

  try {
    if (wasIn) {
      await removeMixFromPlaylist(playlist.id, mixId)
    } else {
      await addMixToPlaylist(playlist.id, mixId)
    }
  } catch (err) {
    playlist.containsMix = wasIn
    playlist.mixesCount += wasIn ? 1 : -1
    throw err
  }
}
