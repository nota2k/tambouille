import { apiClient } from '@/api/client'
import type { UserProfile } from '@/types'

/** Toggles following a user, optimistically updating the given profile object in place. */
export async function toggleUserFollow(profile: UserProfile) {
  const wasFollowing = profile.isFollowing

  profile.isFollowing = !wasFollowing
  profile.followersCount += wasFollowing ? -1 : 1

  try {
    if (wasFollowing) {
      await apiClient.delete(`/users/${profile.username}/follow`)
    } else {
      await apiClient.post(`/users/${profile.username}/follow`)
    }
  } catch (err) {
    profile.isFollowing = wasFollowing
    profile.followersCount += wasFollowing ? 1 : -1
    throw err
  }
}
