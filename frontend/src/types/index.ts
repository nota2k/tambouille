import type { FourneeLayout } from '@/content/fournees'

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

export interface CommentReply {
  id: string
  body: string
  createdAt: string
  userId: string
  user: AuthorSummary
}

export interface Comment {
  id: string
  body: string
  timecodeSec: number
  createdAt: string
  userId: string
  user: AuthorSummary
  replies: CommentReply[]
}

export interface Mix {
  id: string
  title: string
  /** Le titre rendu passable dans une URL. Figé à la création : un titre corrigé ne casse pas les liens. */
  slug: string
  description: string | null
  /** Le nom de l'artiste. Null sur les mix déposés à la main et sur les anciens. */
  artist: string | null
  /** R2 object key. Null when the audio lives elsewhere. */
  audioUrl: string | null
  /** `'mixcloud' | 'remote'`. Null when the audio is on R2. */
  sourceType: string | null
  /** Cloudcast key, or a directly playable audio URL. Null when the audio is on R2. */
  sourceRef: string | null
  /** La page où la source publie ce mix — l'émission, l'épisode. Distincte de
   *  `sourceRef`, qui ne désigne que le fichier : d'un mp3 nu on ne remonte pas
   *  toujours à sa page. Null quand elle n'a pas pu être retrouvée. */
  sourcePageUrl: string | null
  coverUrl: string | null
  durationSec: number | null
  playsCount: number
  favoritesCount: number
  commentsCount: number
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
  username: string | null
  displayName: string
  bio: string | null
  avatarUrl: string | null
  createdAt: string
  hasPassword: boolean
  /** Whether a Google account is attached. The identifier itself is never sent. */
  hasGoogle: boolean
  /** Idem pour la carte de membre du club : jamais le sujet, seulement s'il y en a une. */
  hasKeycloak: boolean
}

export interface AuthResponse {
  accessToken: string
  user: AuthUser
}

/** Une entrée d'une collection — compte Mixcloud, item Archive.org, flux RSS —
 *  parmi lesquelles il reste à choisir. `ref` est opaque et repart telle quelle. */
export interface SourceItem {
  ref: string
  title: string
  durationSec?: number
  coverUrl?: string
  publishedAt?: string
}

/** De quoi préremplir le formulaire à partir d'une entrée de source. */
export interface MixImport {
  title: string
  description: string
  tags: string[]
  artist?: string
  coverSourceUrl?: string
  durationSec?: number
  tracklist: { artist: string; title: string; timecodeSec: number }[]
  sourceType: 'mixcloud' | 'remote' | 'soundcloud'
  sourceRef: string
  sourceLabel: string
  sourcePageUrl?: string
}

/** Un corps JSON ne se filtre pas comme une union TypeScript : les deux issues
 *  de `POST /imports/resolve` sont donc discriminées explicitement. */
export type ResolveResponse =
  { kind: 'mix'; mix: MixImport } | { kind: 'list'; items: SourceItem[] }

/**
 * Une fournée : la sélection éditoriale mise en avant sur la home. Le gabarit
 * (maquette 3e) impose ce qui ne change jamais — un numéro, une période, un
 * titre de trois mots, trois phrases, une durée cumulée et le nom de qui a
 * choisi. Le reste est laissé libre.
 *
 * Pas encore un modèle en base : l'objet est écrit à la main dans la vue, et
 * seuls les mix sont réels. Le composant qui l'affiche ne sait rien de cette
 * provenance, pour qu'une API puisse s'y substituer sans le toucher.
 */
export interface Fournee {
  /** Le gabarit de mise en page. */
  layout: FourneeLayout
  /** Affiché « LA FOURNÉE N°18 ». */
  number: number
  /** Période libre, rendue en capitales : « TOUT L'HIVER ». */
  period: string
  /** Trois mots au maximum. */
  title: string
  /** Trois phrases, pas quatre. */
  intro: string
  /**
   * La couleur de saison, en hexadécimal (`#2D5FA8`). Le bandeau est le seul
   * endroit du site où une couleur hors palette maison est autorisée : elle ne
   * doit déborder sur aucun autre bloc de la page.
   */
  color: string
  /**
   * Bascule le bandeau en fond noir, la couleur ne servant plus que d'accent —
   * la variante 3c du gabarit. C'est un choix éditorial et non un repli
   * technique : sur l'aplat de saison, l'encre est choisie automatiquement et
   * tient toujours le seuil de 4,5:1.
   */
  inverted?: boolean
  /** Qui a choisi — un pseudo, ou « la rédaction ». */
  curator: string
  /** Les mix retenus, dans l'ordre d'affichage. Cinq dans le gabarit. */
  mixes: Mix[]
}
