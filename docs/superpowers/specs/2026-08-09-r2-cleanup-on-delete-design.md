# Deleting a mix deletes its R2 objects — design

**Date:** 2026-08-09
**Status:** Approved, ready for implementation

## Context

Nothing in this codebase deletes an R2 object. `upload.utils.ts` imports
`PutObjectCommand` and nothing else. Deleting a mix removes its row and leaves
its audio and cover on R2 for good.

The gap is already written down in `mixes.controller.ts:130-146`, as a comment
explaining why the audio-source check sits in the controller rather than only in
the service: a refused create would otherwise strand an object nothing deletes.
That comment describes the symptom. This design closes one of its causes.

Two orphans from import testing were removed by hand on 2026-08-09
(`covers/678f73c1-…png`, `covers/0fa21f63-…jpg`). Doing that by hand is what
prompted this work.

### Where objects come from

Four places write to R2 today:

| Writer | Prefix |
|---|---|
| `MixesController.create` (multer-s3) | `audio/`, `covers/` |
| `MixesController.update` (multer-s3) | `covers/` |
| `CoverImportService.importFromUrl` | `covers/` |
| `UsersController` avatar and banner | `avatars/`, `banners/` |

### Three leaks, one in scope

1. **Deleting a mix** strands its audio and cover. **In scope.**
2. **Replacing a cover** via `PATCH /mixes/:id` stranded the previous one.
   **Closed as a follow-up**, once the helper existed — see "Leak 2" below. It
   is the most frequent of the three: a cover is changed more often than a mix
   is deleted.
3. **Deleting an account** strands everything the account owned. Out of scope,
   and the hardest: `onDelete: Cascade` removes the mix rows in SQL without
   ever calling `MixesService`, so the keys have to be collected before the
   delete, inside a transaction.

Closing leak 1 alone is the ask. The helper it introduces is what leaks 2 and 3
would reuse.

### What is actually stored where

Of the seventeen mixes in the local database at the time of writing:

- **audio** — 7 legacy disk paths (`/uploads/…`), 10 remote sources, **0 on R2**
- **cover** — 7 on R2, 2 legacy disk paths, 8 absent

So the R2 audio path exists in code and has no live data yet: it applies to
future uploads. The cover path has data now. Both must be handled; neither can
be assumed present.

## Decisions

### The row goes first, R2 second, and an R2 failure is not raised

The caller asked for a mix to disappear. A storage hiccup is not a reason to
refuse that, and the failure is not information they can act on.

Order matters for more than tidiness. Deleting from R2 first and failing on the
row would leave a mix that still exists with dead audio and a dead cover —
visibly broken, and worse than an orphan nobody sees. Deleting the row first
caps the worst case at what already happens today: an unreferenced object. This
change cannot regress that.

An R2 failure is caught and logged at `warn` with the keys involved, so the
objects can be swept by hand if it ever matters.

### `sourceRef` is never touched

`audioUrl` and `coverUrl` are R2 keys this server wrote. `sourceRef` is a URL on
somebody else's host — Mixcloud, Archive.org, Ouïedire, a podcast CDN. The
server does not own it, never fetched the audio behind it, and deleting a mix
means removing Tambouille's copy of the metadata, not reaching into the source.

This is the invariant the whole multi-source feature rests on: the audio is
played where it lives and is never copied. Nothing here may weaken it.

### Legacy `/uploads/…` paths are skipped, explicitly

Seven mixes still carry disk paths from before the R2 migration. They are not
bucket keys and must not be sent to R2.

The check is worth stating rather than leaving implicit, because R2 does not
merely stay quiet about a key that was never there — it reports it as removed.
Measured against the real bucket on 2026-08-09:

```
DeleteObject  on a missing key  → 204
DeleteObjects on two missing keys → 200
  Deleted: [{"Key":"covers/ceci-nexiste-pas-…jpg"},
            {"Key":"/uploads/covers/chemin-herite-probe.jpg"}]
  Errors : []
```

So without the filter, handing R2 a disk path would come back listed under
`Deleted`, with no error, forever. The API would actively confirm a deletion
that never happened. No amount of logging downstream can recover from that —
only not asking in the first place.

The discriminator is `startsWith('/uploads/')`, copied verbatim from
`mediaUrl()` in `frontend/src/utils/media.ts`, which already splits the two
storages exactly this way. Using the same rule on both sides is what stops the
server and the client from reading the same column differently.

### One batched call

`DeleteObjectsCommand` takes both keys at once and reports failures per key, so
a partial failure names the object it could not remove. Two `DeleteObject`
calls would work equally well; the batch is chosen because its result shape is
the one that makes the log line useful.

## Interface

```ts
/** Deletes objects this server wrote. Keys that are not R2 keys are skipped.
 *  Never throws: a storage failure must not fail the caller's own operation. */
export async function deleteFromR2(keys: (string | null | undefined)[]): Promise<void>
```

Lives in `backend/src/common/upload.utils.ts`, beside `putBufferToR2`, and is
called from `MixesService.remove` after `prisma.mix.delete`.

Filtering — null, undefined, and `/uploads/…` — happens inside the helper, not
at the call site, so every future caller inherits it. An empty list after
filtering issues no request at all.

## Error handling

| Situation | Behaviour |
|---|---|
| Both keys deleted | Nothing logged |
| R2 rejects the request | `warn` naming the keys; `remove()` still succeeds |
| R2 reports per-key errors | `warn` naming those keys; `remove()` still succeeds |
| Mix has a remote source and no cover | No request issued |
| Key is a legacy `/uploads/…` path | Skipped, no request for it |
| Mix not found, or not the caller's | Existing 404/403, raised before anything is deleted |

## Testing

`upload.utils` is mocked, as `mixes.controller.spec.ts` already does.

- Both keys are passed together in one call.
- A mix with no cover passes one key.
- A mix with a remote source and no cover issues no call at all.
- A `/uploads/…` key is filtered out; a mix carrying only such keys issues no call.
- A rejected R2 call leaves `remove()` resolving, and the row still deleted.
- Ownership and existence are checked before any deletion — a `ForbiddenException`
  must not be accompanied by a storage call.

No test talks to R2. The S3 client is never constructed in tests.

## Leak 2, closed as a follow-up

`MixesService.update` deletes the cover it replaced, after the write lands.

Only the cover can leak here: `update` never touches `audioUrl` — that route
accepts no audio upload — and a `PATCH` can only *replace* a cover, never clear
one. So the condition is narrow: a new key was uploaded, the mix had one
before, and the two differ.

The identity check is the one part that looks redundant. Multer mints a fresh
UUID per upload, so old and new can never match today. It is there because the
cost of being wrong is deleting the cover that was just installed — a
comparison against a bug that would otherwise be silent and destructive.

Legacy `/uploads/…` covers need no special handling: `r2KeysOnly` already drops
them, so replacing a pre-migration cover deletes nothing and asks R2 nothing.

Verified against the real bucket: old cover `200` → `404`, new cover `200`,
`HeadObject` confirming both; then deleting the mix removed the new cover too.

## Out of scope

- Account deletion (leak 3).
- The orphan a *refused* request leaves behind. Multer streams an upload to R2
  during interception, before the handler runs, so a `PATCH` that then 403s or
  404s has already written a cover nothing will collect. Same shape as the gap
  documented in `mixes.controller.ts` for `create`, and the same fix: restaging
  uploads. A separate job.
- Sweeping the orphans that already exist.
- Any retry, queue, or deferred-cleanup table. Best-effort was chosen
  deliberately; adding infrastructure to guarantee what we accepted losing
  would be building for a case we agreed to tolerate.
