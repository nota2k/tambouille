# Playlists — design

**Date:** 2026-08-07
**Status:** Draft, awaiting user review

## Context

Tambouille (Vue 3 + NestJS + PostgreSQL) lets users favorite mixes: a flat, unordered, single-bucket collection stored in the `Favorite` model. Users now want to group mixes into named collections of their own.

Playlists are a **new, independent mechanism**. Favorites are explicitly unchanged: the `Favorite` model, the heart button, the favorites count and the profile Favorites tab all stay exactly as they are. A mix can be favorited, in several playlists, both, or neither. Nothing in this project reads or writes `Favorite`.

## Scope

In scope:

- Create, rename, describe and delete a playlist
- Add a mix to a playlist, and remove it, from the mix detail page and from `MixCard`
- A public playlist detail page listing its mixes
- A Playlists section on user profiles
- Sharing a playlist by link, reusing the existing share button

Out of scope (deferred):

- **Queue playback.** Playing a playlist does not chain mixes. `usePlayerStore` holds a single `currentMix` with no queue; adding one means a queue in the store, end-of-track handling in `PlayerBar`, and previous/next controls. Decided against for v1; the data model does not block it later.
- **Uploaded playlist covers.** The thumbnail is a mosaic built from the covers of the playlist's first four mixes, falling back to the existing disc icon. Avoids a column, an upload route and multer wiring.
- **Manual reordering.** Mixes sit in insertion order. `position` exists in the schema so drag-and-drop can be added without a migration.
- **Per-playlist visibility.** All playlists are public, like mixes. No `isPublic` column, no access filtering beyond ownership checks on writes.
- **Collaborative playlists**, follower counts on playlists, and playlist-level play counts.

## Data model

Two new Prisma models, following the conventions of the existing schema (uuid ids, `@@map` to snake_case tables, cascade deletes):

```prisma
model Playlist {
  id          String   @id @default(uuid())
  title       String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  items PlaylistItem[]

  @@index([userId])
  @@index([createdAt])
  @@map("playlists")
}

model PlaylistItem {
  id       String   @id @default(uuid())
  position Int
  addedAt  DateTime @default(now())

  playlistId String
  playlist   Playlist @relation(fields: [playlistId], references: [id], onDelete: Cascade)

  mixId String
  mix   Mix      @relation(fields: [mixId], references: [id], onDelete: Cascade)

  @@unique([playlistId, mixId])
  @@index([playlistId, position])
  @@map("playlist_items")
}
```

Inverse relations to add: `playlists Playlist[]` on `User`, `playlistItems PlaylistItem[]` on `Mix`.

Decisions worth stating explicitly:

- `@@unique([playlistId, mixId])` means a mix appears at most once per playlist. Adding it twice is a no-op, not an error, so the UI checkbox is the source of truth.
- Cascade on `mixId` means deleting a mix silently removes it from every playlist. This matches how `Favorite` behaves today.
- `position` is assigned as `(max position in playlist) + 1` on insert. Removal leaves gaps; nothing depends on positions being contiguous because reads always `orderBy: { position: 'asc' }`.

## API — `playlists` module

A new NestJS module mirroring the structure of `mixes/` (controller, service, dto/, registered in `app.module.ts`). Guards reused as-is: `JwtAuthGuard`, `OptionalJwtAuthGuard`, `@CurrentUserId()`.

| Method | Route | Auth | Behaviour |
|---|---|---|---|
| GET | `/playlists/me` | required | The caller's playlists. Accepts `?mixId=` — when present, each playlist carries `containsMix: boolean`. This single call powers the add-to-playlist menu. |
| GET | `/playlists/:id` | none | Playlist with its mixes, ordered by `position`. 404 if unknown. |
| GET | `/users/:username/playlists` | none | A profile's playlists. Lives in the `users` module, alongside the existing profile routes. |
| POST | `/playlists` | required | Create from `{ title, description? }`. |
| PATCH | `/playlists/:id` | owner | Update title/description. 403 for non-owners. |
| DELETE | `/playlists/:id` | owner | Delete; items cascade. |
| POST | `/playlists/:id/mixes` | owner | Add `{ mixId }`. Idempotent — re-adding returns success without duplicating. 404 if the mix does not exist. |
| DELETE | `/playlists/:id/mixes/:mixId` | owner | Remove. Idempotent. |

`GET /users/:username/playlists` is paginated, following the existing shape (`QueryPlaylistsDto` modelled on `QueryMixesDto`, returning `{ items, total, page, limit, totalPages }`).

`GET /playlists/me` is **not** paginated and returns a bare array. The add-to-playlist menu must show every playlist the user owns — a paginated menu could silently hide the one they are looking for. Per-user playlist counts are small enough that this is safe.

Response shapes, added to `frontend/src/types/index.ts`:

```ts
interface PlaylistSummary {
  id, title, description, createdAt, updatedAt
  mixesCount: number
  // Covers of the first four items (by position) that actually have one, for the
  // mosaic. Fewer than four — or none — is normal and the UI handles it.
  coverUrls: string[]
  user: AuthorSummary
  containsMix?: boolean    // only on GET /playlists/me?mixId=
}

interface Playlist extends PlaylistSummary {
  mixes: Mix[]             // ordered by position
}
```

## Frontend

**`components/AddToPlaylistButton.vue`** — the core of the feature. A button that opens a dropdown listing the caller's playlists, each with a checkbox reflecting `containsMix`; toggling one calls add or remove. Below the list, a "New playlist…" input creates a playlist and adds the mix in one gesture. Unauthenticated users are redirected to login, matching `toggleFavorite` in `MixDetailView`. Props mirror `ShareButton`: `mixId` plus a `variant` (`'overlay'` for cards, `'pill'` for the detail page).

The project has **no dropdown component**; this one is written here, closing on outside click and on Escape, with focus returned to the trigger.

**`views/PlaylistDetailView.vue`** (route `/playlists/:id`) — title, author link, description, mosaic thumbnail, share button, and the mixes rendered with the existing `MixListItem`. The owner additionally gets a remove control per row, plus rename and delete for the playlist itself. Deletion confirms via `confirm()`, as `removeMix` does today.

**`components/PlaylistCard.vue`** — mosaic thumbnail, title, mix count. Used in profile listings.

**`views/ProfileView.vue`** — a Playlists section listing the profile owner's playlists, plus a "New playlist" affordance when viewing your own profile.

**`utils/playlists.ts`** — API calls, following `utils/favorites.ts`: plain functions over `apiClient`, no Pinia store. Optimistic updates where the mutation is a simple toggle.

## Changes to existing code

- **`ShareButton.vue`** is currently coupled to mixes (prop `mixId`, builds the URL via `mixShareUrl`). Generalise it to take a `url` (or a route location), so playlists can reuse it. `utils/share.ts` gains `playlistShareUrl(id)` alongside `mixShareUrl(id)`; `copyMixLink` becomes `copyLink(url)`. Call sites in `MixCard` and `MixDetailView` are updated accordingly.
- **`MixCard.vue`** gains the add-to-playlist button in the hover overlay, next to share.
- **`app.module.ts`** registers `PlaylistsModule`.
- **`router/index.ts`** gains the `/playlists/:id` route.

## Error handling

- Ownership violations return 403 from the service layer, checked the same way `MixesService.update` does today.
- Add/remove are idempotent so a double click or a stale checkbox cannot produce a 409.
- The frontend has no toast system. Failed mutations revert their optimistic update and leave the UI unchanged, as `toggleMixFavorite` does. This is a known limitation, not an oversight.

## Testing

- Service-level tests for ownership enforcement on update, delete, add and remove.
- A test that adding the same mix twice leaves one row and does not throw.
- A test that deleting a mix removes its playlist items.
- A test that `GET /playlists/me?mixId=` sets `containsMix` correctly across playlists that do and do not contain it.

## Open questions

None. Deferred items are listed under Scope.
