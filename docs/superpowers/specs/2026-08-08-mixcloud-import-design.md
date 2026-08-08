# Mixcloud import — design

**Date:** 2026-08-08
**Status:** Approved, ready for implementation

## Context

The user wants to import their Mixcloud catalogue into Tambouille: audio, cover art, tracklists and descriptions.

**The audio cannot be imported.** Mixcloud's API deliberately does not expose audio streams — their documentation states they need to count plays in order to report usage and pay royalties. Every tool that "downloads from Mixcloud" rips the stream, which circumvents that accounting. This project will not do that. Separately, a DJ mix contains third-party recordings that Mixcloud covers through its own licensing arrangements; re-hosting the same audio elsewhere does not carry those licences, and the exposure would be the site operator's. The user supplies the audio file from their own masters, as they do today.

**The tracklists are empty.** Checked against the real profile (`Notamusic`, 10 public mixes): `sections` is empty on all ten, and descriptions run 31–209 characters. The import therefore saves retyping a title, three tags and a sentence, per mix, once. This was raised before starting; the user reaffirmed the decision, and the feature is built as asked. Should tracklists be filled in on Mixcloud later, the import already handles them.

## Scope

In scope:
- List a Mixcloud user's public cloudcasts.
- Fetch one cloudcast and translate it into Tambouille's shape: title, description, tags, tracklist, cover.
- Pre-fill the existing upload form from it. The user picks the audio file and publishes.
- Import the cover art from Mixcloud's CDN at publish time.

Out of scope:
- Audio, for the reasons above.
- OAuth. Public profiles need none; a username is enough. Nothing is stored about the Mixcloud account.
- Bulk import and drafts. The user chose one mix at a time, which keeps `audioUrl` required and the schema untouched.
- Any write to Mixcloud.
- Re-importing or syncing a mix already imported.

## API surface

Two authenticated read endpoints, in a new `mixcloud` module. They exist as a relay because the browser calling `api.mixcloud.com` directly would be blocked by CORS.

### `GET /api/mixcloud/:username/cloudcasts`

Relays `https://api.mixcloud.com/{username}/cloudcasts/?limit=50`. Returns, per cloudcast: `key`, `name`, `tags`, `pictureUrl`, `audioLengthSec`, `createdAt`.

`username` must match `^[A-Za-z0-9_-]{1,64}$`. Anything else is a 400, before any outbound request — this is the first half of the path-injection guard.

Upstream 404 becomes 404; any other upstream failure or a timeout becomes 502. The user must be able to tell "no such Mixcloud account" from "Mixcloud is down".

### `GET /api/mixcloud/cloudcast?key=…`

Relays `https://api.mixcloud.com{key}` and returns the shape the upload form consumes:

```
{ title, description, tags: string[], coverSourceUrl, tracklist: [{ artist, title, timecodeSec }] }
```

`key` must match `^/[A-Za-z0-9_-]+/[A-Za-z0-9_.-]+/$`. This is the second half of the guard: `key` comes from the client, and without it a crafted value would turn this endpoint into a request-forgery tool pointed at whatever the caller likes.

**`sections` is parsed defensively.** Mixcloud documents the *upload* parameters (`sections-X-artist`, `sections-X-song`, `sections-X-start_time`) but publishes no example of the read shape, and the ten mixes checked all have empty sections, so it could not be observed. The parser must accept both plausible forms — fields nested under `track` and fields flat on the section — take `start_time` as the timecode, skip sections that carry only a `chapter`, and drop anything missing an artist or a title rather than importing a half-entry.

## Cover art

The picture lives on Mixcloud's CDN. It is fetched **server-side, at mix creation**, not at import: the mix does not exist until the user submits with the audio.

`CreateMixDto` gains an optional `coverSourceUrl`. When present and no cover file was uploaded, the backend fetches it and stores it in R2 through the existing upload path.

This makes the server fetch a URL supplied by the client, which is a request-forgery primitive if left open — a caller could point it at `http://localhost:5432` or cloud metadata and use the backend as a probe. Four constraints, all enforced before the request leaves:

- the URL parses, and its scheme is `https`;
- its host ends in `.mixcloud.com`, matched against the parsed hostname, never by substring;
- the response's `Content-Type` is an image type the project already accepts;
- the body is capped at the existing cover size limit and the request has a timeout.

A cover file uploaded by the user always wins over `coverSourceUrl`.

## Frontend

The upload view gains an import step above the existing form: a Mixcloud username field, a list of that account's mixes, and a selection that fills title, description, tags and tracklist, and remembers the cover URL. The form remains fully editable afterwards — the import is a starting point, not a lock. The audio file is chosen as it is today.

Nothing is persisted about the Mixcloud account: the username is only a query parameter.

## Verification

Backend service logic is unit-tested in the existing style, with `fetch` mocked: the username and key guards, the mapping of a cloudcast, the tracklist parser across both shapes and the chapter case, and each rejected URL family for the cover guard. Those guards are the part where being wrong is expensive, so each must be mutation-checked — deleting it has to fail a test for the right reason.

The relay is then verified against the real profile `Notamusic`, whose ten mixes are public.

## Known limitations

**No tracklists to import today.** Documented above; the parser is ready if that changes.

**Only public cloudcasts.** Private or unlisted mixes are invisible without OAuth, which is out of scope.

**No duplicate detection.** Importing the same mix twice creates two mixes. The user is importing ten mixes once, so the bookkeeping is not worth it.

**Mixcloud's read shape for `sections` is unverified.** If it differs from both forms handled, tracklists import empty rather than wrongly — the parser drops what it cannot read instead of guessing.
