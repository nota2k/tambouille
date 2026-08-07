# Timed comments — design

**Date:** 2026-08-07
**Status:** Approved, ready for implementation planning

## Context

Tambouille (Vue 3 + NestJS + PostgreSQL) already supports favorites and follows. The next feature area is social/community, starting with **comments**, which is itself a prerequisite for a future notifications project (comment notifications were explicitly deferred until this feature exists).

Given Tambouille already has a timecode system for tracklists (capture-while-listening, click-to-seek), comments are **timed**: each top-level comment is anchored to a moment in the mix, following the SoundCloud-style pattern rather than a generic flat discussion thread.

## Scope

In scope:
- Timed top-level comments, with one level of replies (no nested replies)
- Comment composer with "capture current playback position" (mirrors the existing tracklist capture UX)
- Moderation: comment author or mix owner can delete a comment
- Comment counts shown on `MixListItem` and the mix detail page

Out of scope (deferred):
- Notifications (separate follow-up project; comment-created events should be easy to hook in later)
- Seek-bar markers showing comment timecodes (would require a separate lightweight timecode fetch; revisit if there's demand)
- Comment counts on the compact `MixCard` slider cards (kept minimal by existing design — title + author only)
- Editing comments (only delete, for v1)
- Rich text / mentions / attachments in comment bodies (plain text only)

## Data model

New Prisma model:

```prisma
model Comment {
  id          String   @id @default(uuid())
  body        String
  timecodeSec Int?
  createdAt   DateTime @default(now())

  mixId String
  mix   Mix    @relation(fields: [mixId], references: [id], onDelete: Cascade)

  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  parentId String?
  parent   Comment?  @relation("Replies", fields: [parentId], references: [id], onDelete: Cascade)
  replies  Comment[] @relation("Replies")

  @@index([mixId])
  @@index([parentId])
  @@map("comments")
}
```

Rules (enforced in the service layer, not just the schema):
- A top-level comment (`parentId == null`) must have a `timecodeSec`.
- A reply (`parentId != null`) has `timecodeSec = null` — it inherits its position from the parent comment's timecode.
- A reply's `parentId` must reference a comment that is itself top-level (`parent.parentId == null`) — this caps threading at one level deep. Reject with a 400 if someone tries to reply to a reply.
- `parentId` must reference a comment on the *same* mix as the one being posted to.

Add `comments Comment[]` to both `Mix` and `User` models (mirrors the existing `favorites`/`playHistory` relations pattern).

## API

Following the existing `mixes` controller conventions (same auth guard patterns as favorites):

- `GET /mixes/:id/comments` — public, paginated (`page`/`limit`, same `PaginationDto`/`QueryMixesDto`-style pattern already used elsewhere). Returns top-level comments ordered by `timecodeSec` ascending, each with a nested `replies` array ordered by `createdAt` ascending. Author summary (`id`, `username`, `displayName`, `avatarUrl`) embedded per comment, same shape as `AuthorSummary` used elsewhere.
- `POST /mixes/:id/comments` — `JwtAuthGuard`. Body: `{ body: string, timecodeSec?: number }` for a top-level comment, or `{ body: string, parentId: string }` for a reply. `body` is required, 1–1000 characters (same `class-validator` pattern as `CreateMixDto`/`UpdateProfileDto`). Service validates the top-level/reply rules above.
- `DELETE /comments/:id` — `JwtAuthGuard`. Allowed if `req.user.id === comment.userId` OR `req.user.id === comment.mix.userId` (mix owner). Deleting a top-level comment cascades to its replies (handled by `onDelete: Cascade`).
- `Mix` API responses (list + detail) gain a `commentsCount` field, computed the same way `favoritesCount` is today (`_count.comments` in the existing `buildMixInclude`/`toMixResponse` helpers in `mixes.service.ts`).

## Frontend

**Layout** (mix detail page): a new "Commentaires" section directly below the existing "Tracklist" section — same visual pattern (bordered card list), not merged into the tracklist and not a separate tab.

Each top-level comment row shows:
- A clickable timecode badge (same style as tracklist rows) that seeks the player to that moment
- Author avatar + display name (linking to their profile)
- Comment body
- Its replies, indented, each with author + body (no timecode badge on replies)
- A "Répondre" action opening an inline reply composer (text only, no timecode picker)
- A "Supprimer" action, visible only to the comment's author or the mix owner

**Composer (top-level comments):**
- If `playerStore.currentMix?.id === mix.id` (this mix is the one currently loaded in the player), show a "Commenter cet instant" affordance that pre-fills the timecode from the player's live position and lets the user type the comment body.
- Otherwise (mix not currently playing), fall back to a manual `mm:ss` timecode input next to the body field — reuse `parseTimecode`/`formatTime` from `utils/time.ts`.

**Required refactor:** `PlayerBar.vue` currently tracks `currentTime` as local component state, not exposed anywhere else. Lift it into the `player` Pinia store (e.g., `playerStore.currentTime`, updated on the `timeupdate` handler) so `MixDetailView` can read the live position for the "capture this moment" composer. No visible behavior change to the player itself — purely making existing state accessible.

**Counts:** `commentsCount` displayed next to `playsCount`/`favoritesCount` on `MixListItem` and on the mix detail page header. Not added to the compact `MixCard` (slider card) — that component intentionally stays to title + author only.

## Testing / verification plan

Consistent with how every other feature in this project has been verified:
1. `npx prisma migrate dev` for the new `Comment` model, then `npx prisma generate`.
2. `npm run build` on the backend to confirm the service/controller compile against the generated Prisma types.
3. `curl`-based end-to-end pass covering: post a top-level comment, post a reply, attempt a reply-to-a-reply (expect 400), delete as author, delete as mix owner, delete as a third party (expect 403), verify `commentsCount` updates on the mix payload.
4. `npm run type-check` on the frontend.
5. Browser pass: post a comment while a mix is playing (verify the captured timecode matches), post one manually via the mm:ss fallback, reply to a comment, delete a comment, click a timecode badge to confirm it seeks the player.
