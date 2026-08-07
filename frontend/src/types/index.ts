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

export interface UserProfile {
  id: string
  username: string
  displayName: string
  bio: string | null
  avatarUrl: string | null
  createdAt: string
  mixesCount: number
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
