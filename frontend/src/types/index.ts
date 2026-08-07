export interface AuthorSummary {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
}

export interface TracklistEntry {
  id: string
  artist: string
  title: string
  timecodeSec: number
}

export interface Mix {
  id: string
  title: string
  description: string | null
  audioUrl: string
  coverUrl: string | null
  durationSec: number | null
  playsCount: number
  favoritesCount: number
  isFavorited: boolean
  tags: string[]
  tracklist: TracklistEntry[]
  createdAt: string
  updatedAt: string
  userId: string
  user: AuthorSummary
}

export interface MixListResponse {
  items: Mix[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface UserListResponse {
  items: AuthorSummary[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface UserProfile {
  id: string
  username: string
  displayName: string
  bio: string | null
  avatarUrl: string | null
  coverUrl: string | null
  createdAt: string
  mixesCount: number
  followersCount: number
  followingCount: number
  isFollowing: boolean
}

export interface PlaylistSummary {
  id: string
  title: string
  description: string | null
  createdAt: string
  updatedAt: string
  userId: string
  user: AuthorSummary
  mixesCount: number
  /** Covers of the first few mixes that have one, for the mosaic thumbnail. May be empty. */
  coverUrls: string[]
  /** Only present on GET /playlists/me?mixId=. */
  containsMix?: boolean
}

export interface Playlist extends PlaylistSummary {
  /** Ordered by position. */
  mixes: Mix[]
}

export interface PlaylistListResponse {
  items: PlaylistSummary[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface AuthUser {
  id: string
  email: string
  username: string
  displayName: string
  bio: string | null
  avatarUrl: string | null
  createdAt: string
}

export interface AuthResponse {
  accessToken: string
  user: AuthUser
}
