# Multi-source import — design

**Date:** 2026-08-08
**Status:** Approved, ready for implementation

## Context

Tambouille can import mixes from Mixcloud. The user wants to import from other sites too.

The existing Mixcloud import is two independent things that happen to ship together:

1. **A metadata relay.** `MixcloudService` is a read-only proxy over Mixcloud's public API, because the browser cannot call `api.mixcloud.com` directly (CORS). It carries deliberate request-forgery guards: regexes on the username and cloudcast key, `redirect: 'error'`, a request deadline, and a 404-vs-502 distinction so the caller can tell "no such account" from "Mixcloud is down". `cover-source.ts` fetches the cover art, accepting only `.mixcloud.com` hosts.
2. **A playback backend.** `frontend/src/utils/mixcloud.ts` lazily loads Mixcloud's widget JS API, and `PlayerBar` drives a hidden iframe through it. `Mix` carries a dedicated `mixcloudKey` column, mutually exclusive with `audioUrl`.

Point 2 is what constrains the choice of new sources: every site has a different playback mechanism, or none at all.

### Sources considered

**Archive.org — in scope.** Open metadata API (`https://archive.org/metadata/<identifier>`), and audio files are served directly. The existing `<audio>` element plays them, with native `Range` support, so scrubbing works with no new code. It is also a preservation archive, which matches one of the user's stated motives.

**Podcast RSS feeds — in scope.** Radio shows (Ouïedire, Radio Canut and the like). A feed gives title, description, publication date, duration and an `<enclosure>` URL pointing at a directly playable audio file.

**SoundCloud — not selected.** Would have fit (public API plus an embeddable widget), but the user did not pick it. Nothing in this design prevents adding it later; it would be a third `SourceImporter` plus a third playback engine.

**YouTube — out of scope, deliberately.** It was considered and dropped. Playback there is only possible through YouTube's own iframe player, whose embedding policy requires a visible player — so the 1-pixel-hidden-iframe trick used for Mixcloud is not available. Extracting the audio to store and re-serve it was raised and declined: it circumvents YouTube's delivery in breach of their terms, and it republishes recordings the site does not hold rights to. The user then noted the intent was private listening and media preservation; that intent is real, but Tambouille has no private-visibility concept — every imported mix lands in the public Discover feed, on a public profile, with a share link — so the mechanism would not be private whatever the intent. The capability already exists by another route: Tambouille accepts an audio file upload, so anything archived locally can be published through the existing form without the server fetching anything.

## Scope

In scope:

- A single paste-a-URL field as the entry point for all imports.
- Recognising the source from the URL and dispatching to the right importer.
- Resolving a URL to either one mix or a list to choose from.
- Generalising the data model so a mix's audio can live somewhere other than R2, without a new column per source.
- Playing remote audio through the existing `<audio>` element.
- Copying the cover art to R2 at publish time, as the Mixcloud import already does.
- Surfacing the source on the mix page, with a link back to it.

Out of scope:

- Copying remote audio onto R2. The audio is played where it already lives.
- Bulk-importing a whole feed, and feed subscriptions that update over time.
- YouTube, for the reasons above.
- Any new visibility model (private or unlisted mixes).

## Decisions

### Audio is streamed from its source, never copied

This follows the design-doc mockup ("l'audio n'est jamais copié"), and it is the right call on three counts: no R2 storage or bandwidth cost; a podcast feed authorises playing an episode, not necessarily mirroring a public copy of it; and it keeps the server out of the audio path entirely, which shrinks the security surface (see below).

The existing "host the audio on Tambouille" option is unchanged — a user can still upload their own file instead.

### One URL field, with a list when the URL is a collection

The user pastes any URL and clicks Go. If it identifies one mix, the form fills. If it identifies a collection — an RSS feed, an Archive.org item holding several audio files, a Mixcloud account — the entries appear below the field and the user picks one.

A non-URL input is treated as a Mixcloud username, so the current usage keeps working without a mode switch or an extra button.

## Data model

`Mix` loses `mixcloudKey` and gains a source pair:

```prisma
/// R2 object key. Null when the audio lives elsewhere.
audioUrl   String?
/// 'mixcloud' | 'remote'. Null when the audio is on R2.
sourceType String?
/// Interpreted according to sourceType: a cloudcast key
/// ("/Notamusic/antimythes/") or an audio file URL.
sourceRef  String?
```

The invariant enforced by `assertExactlyOneAudioSource` (`backend/src/mixes/mixes.service.ts:75`) becomes: **either `audioUrl` alone, or `sourceType` and `sourceRef` together.** Three invalid states to reject — nothing at all, both, half a pair — against two today. The rule stops growing when a source is added, which is the point.

Prisma still cannot express this, so it stays enforced in the service, in one place, on create and on update.

`sourceType` is a string, not a Prisma enum: adding a source should not need a migration, and the value is only ever compared against known constants.

**Archive.org and RSS both map to `'remote'`**, because `sourceType` answers one question only — which playback engine to use — and both answer `<audio>`. It is deliberately not a provenance field. The source *name* shown on the mix page is derived from the host of `sourceRef` (`archive.org` → "Archive.org", anything else → the bare host), which keeps the model from growing a value per site while still naming where a mix came from.

### Migration

Mechanical and reversible: set `sourceType = 'mixcloud'` and `sourceRef = mixcloudKey` wherever `mixcloudKey` is non-null, then drop the column. No data is lost.

`Mix.mixcloudKey` becomes `Mix.sourceType`/`Mix.sourceRef` in `frontend/src/types/index.ts`, and `PlayerBar` selects its engine on `sourceType`. Two engines only — the existing `<audio>` and the existing Mixcloud widget. No third playback mechanism is written.

### Duration is finally populated

Archive.org reports each file's length; an RSS item carries `<itunes:duration>`. `durationSec` will therefore be **set at import**, where today it stays null and the player reads the duration from `<audio>` after the fact. This lights up the "1 h 12 · 18 morceaux" line already present in the UI, for imported mixes, with no further work.

## Backend architecture

One interface, one module per source:

```ts
interface SourceImporter {
  matches(url: URL): boolean
  /** One mix, or a list to choose from. */
  resolve(url: URL): Promise<MixImport | SourceItem[]>
  importItem(ref: string): Promise<MixImport>
}
```

- **`mixcloud`** — the existing service rearranged behind this interface. `matches` on the host, `resolve` on the path: an account yields a list, a cloudcast yields a mix.
- **`archive`** — `matches` on host `archive.org`, taking the identifier from `/details/<identifier>`. Reads `https://archive.org/metadata/<identifier>`, keeps files whose `format` is audio, and builds `https://archive.org/download/<identifier>/<name>` URLs.
- **`podcast`** — parses the feed XML and turns each `<item>` into an entry, taking the audio from `<enclosure url>`.

**Dispatch order matters, and `podcast` is the fallback.** A feed lives on any host, so it cannot be recognised by host. The importers are tried in order — `mixcloud`, `archive`, then `podcast`, whose `matches` accepts any https URL. A URL that reaches `podcast` and does not parse as a feed produces "lien non reconnu", not "flux illisible", so an unsupported site gets the message that helps.

The two-step shape (`resolve` then `importItem`) is kept from the current Mixcloud flow: the list view needs only a summary, and the full payload — description, tracklist, cover URL — is fetched when an entry is chosen. For RSS and Archive.org, `importItem` re-reads the source document and locates the entry rather than trusting a client round-trip.

On the wire the two outcomes are discriminated explicitly, since a JSON body cannot be pattern-matched the way a TypeScript union can:

```
POST /imports/resolve  { url }  →  { kind: 'mix',  mix:   MixImport }
                                |  { kind: 'list', items: SourceItem[] }
POST /imports/item     { ref }  →  MixImport
```

`SourceItem.ref` is what `POST /imports/item` takes back: a cloudcast key for Mixcloud, and for the other two an opaque string holding the source document URL plus the entry's identifier within it (Archive.org file name, RSS `<guid>`).

Routes `/mixcloud/*` are replaced by `/imports/*`. This is an internal, JWT-guarded API whose only consumer is the upload form; nothing needs deprecating.

### New dependency

`fast-xml-parser`, because Node has no built-in XML parser. Archive.org needs none — its metadata endpoint returns JSON.

## Security

**The audio never passes through the server.** The browser hits the remote URL directly with `<audio>`; media elements are not subject to CORS, and scrubbing works natively through `Range`. The server fetches exactly two things: the source document (feed XML or Archive.org JSON) and the cover image.

Both of those go out to a host the user chose, which is a request-forgery primitive. The guards:

- **https only.** Not on principle: a browser blocks http audio on an https page (mixed content), so an http source would produce an unplayable mix anyway. Better to refuse it at import with a clear message than to fail silently at playback.
- **Private address ranges rejected** — loopback, `10/8`, `172.16/12`, `192.168/16`, `100.64/10`, and above all `169.254/16`, which carries cloud instance metadata. IPv6 equivalents too: `::1`, `fc00::/7`, `fe80::/10`.
- **The check runs against the address actually connected to**, not the hostname, otherwise DNS rebinding walks straight through. In practice: an undici `dispatcher` whose `connect.lookup` re-validates the resolved address.
- **Redirects followed manually, 3 hops maximum**, re-validating scheme and address at every hop. The current code uses `redirect: 'error'`, which is right for Mixcloud but would break real feeds — podcast hosts redirect constantly.
- **Size and time caps** on the response body, in the shape of the existing `readCappedBody`. A feed going back ten years is large.
- **Content-type checked** — XML-ish for feeds, JSON for Archive.org.

### The guard that gets widened

`assertMixcloudCoverUrl` (`backend/src/mixcloud/cover-source.ts:30`) accepts only `.mixcloud.com` hosts today. That allow-list cannot survive "any feed", and is replaced by the address check above. This is the one deliberately narrow guard this feature loosens, and it should be called out in review. Everything else in the cover path is unchanged: https, size cap, MIME allow-list, deadline.

The cover is still copied to R2 rather than hot-linked. It matches what the Mixcloud import already does, and the copy survives the source disappearing — which serves the preservation motive.

## Error handling

### At import

The existing 404-versus-502 split generalises unchanged: 404 for "this does not exist", 502 for "the source is unreachable or unreadable". Added to it:

- URL matching no importer: "Sources reconnues : Mixcloud, Archive.org, flux RSS".
- http source: an explicit message about mixed content, not a silent failure.
- A valid feed with no audio enclosure, or an Archive.org item with no audio file.

**A blocked address returns the same message whatever the reason.** If "private host" and "nonexistent host" answer differently, the form becomes an internal network scanner — precisely what the guards exist to prevent.

### At creation

Cover import must stop failing the whole mix. Today `CoverImportService.importFromUrl` throws and mix creation falls with it. A missing cover is an annoyance; a lost import is lost work. The cover becomes best-effort, with a note in the form when it could not be fetched.

### At playback

`PlayerBar` does not listen for the `<audio>` element's `error` event (`frontend/src/components/PlayerBar.vue:417` — only `timeupdate`, `loadedmetadata` and `ended` are bound). On R2 the object is either there or not, so this has never shown. With remote URLs, a source that disappears is the common case, and today the player would sit frozen at 0:00 saying nothing — exactly what the Mixcloud path takes great care to avoid.

`@error` must therefore be wired, with a message naming the source and a link back to it.

## Testing

The repository already has the right shape: pure transformation functions tested apart from the service that does I/O (`mixcloud.service.spec.ts` tests `parseSections` and friends without a single network call). The new work follows it.

- **Parsing** — a real feed and a real Archive.org item captured as fixtures, then the awkward cases: missing `<enclosure>`, duration as `hh:mm:ss` versus plain seconds, item with no date, several audio files in one Archive.org item.
- **Network guards** — where tests matter most, with `cover-source.spec.ts` as the model: every private range rejected, http rejected, a redirect chain landing on a private address rejected at the right hop, size and time caps enforced.
- **The invariant** — `assertExactlyOneAudioSource` as a table over valid combinations and the three invalid ones.
- **The migration** — on a seeded row: `mixcloudKey` becomes the pair, nothing else moves.

No integration test that calls Archive.org or a live feed. It breaks offline and on the day a source changes shape, which is noise rather than signal.

## Verify before building

The field names used above for Archive.org (`format`, `length`, `creator`) and for RSS (`<enclosure>`, `<itunes:duration>`, `<itunes:author>`) are written from memory. The opening step of the implementation plan is therefore to **fetch one actual Ouïedire feed and one actual Archive.org item, and freeze both as test fixtures** — before any parsing code is written. If a field turns out to be named or shaped differently, the fixtures are the authority, not this document.

## User-visible copy

- Import field placeholder: `colle un lien Mixcloud, Archive.org, ou un flux RSS…`
- The "Où se trouve l'audio ?" fieldset keeps its two options; "laisser l'audio sur Mixcloud" becomes "laisser l'audio à sa source", and the warning paragraph names the source concerned.
- Attribution follows the existing Mixcloud pattern (`importedArtist` → "Publié sur Mixcloud par X", with the name joining the tags), generalised to `<itunes:author>` for a feed and `creator` for Archive.org.
- The mix page line currently reading "Audio hébergé sur Mixcloud" names the source and becomes a link to the original page.
