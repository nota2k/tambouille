# Mixcloud-hosted mixes — design

**Date:** 2026-08-08
**Status:** Scoped, awaiting approval

## Context

The Mixcloud import brings in a mix's metadata but not its audio: Mixcloud does not expose audio, and this project does not rip streams. The user therefore still has to find and upload each audio file by hand.

Mixcloud publishes an embeddable player and a JavaScript control API — `Mixcloud.PlayerWidget()`, with `play()`, `pause()`, `togglePlay()`, `seek()`, `getPosition()`, `getDuration()`, `getIsPaused()`, and the events `progress`, `buffering`, `play`, `pause`, `ended`, `error`. A mix can therefore be listed, browsed and played on Tambouille while the audio stays on Mixcloud.

That removes the whole problem rather than working around it: plays are counted and royalties reported by Mixcloud, nothing is re-hosted, no licence is needed, and R2 stores nothing.

The widget is an iframe, so **its interior cannot be styled** — same-origin forbids it, and no workaround is honest. The design below therefore hides the widget and drives it from Tambouille's own controls, so the visible player is the site's and only the audio pipeline is Mixcloud's.

## Scope

In scope:
- A mix whose audio lives on Mixcloud: listed, searchable, commentable and playable like any other.
- Playback through the hidden widget, driven by the existing `PlayerBar` controls: play, pause, scrub, and the timecode jumps that tracklist entries and timed comments already perform.
- Creating such a mix from the existing Mixcloud import, with no audio file.

Out of scope:
- Converting an existing R2-hosted mix to Mixcloud-hosted, or the reverse.
- Downloading, caching or proxying Mixcloud audio in any form.
- Waveform analysis of Mixcloud audio. The waveform is generated from a seeded pseudo-random function, not from the file, so it already works without the audio being reachable.
- Counting plays on Tambouille for these mixes — see Known limitations.

## Data model

```prisma
audioUrl     String?  // R2 object key; null when the mix is hosted on Mixcloud
mixcloudKey  String?  // e.g. "/Notamusic/vorwerk-7-passages-pas-sages/"
```

**Exactly one of the two must be set.** Prisma cannot express that as a constraint, so the rule lives in `MixesService` on create and update, and is unit-tested. A mix with neither is unplayable; a mix with both is ambiguous about which wins.

Making `audioUrl` nullable is the change that reaches furthest: every consumer must stop assuming a string. The known sites are `mixes.service.ts`'s response mapping, the frontend `Mix` type, `PlayerBar`, `MixCard`/`MixListItem`, and the delete path that removes R2 objects — which must skip a mix that has none. Each has to be visited deliberately, not silenced with a non-null assertion.

## Playback

`PlayerBar` is the only component that touches the audio element today, and the player store already describes playback in backend-agnostic terms. That seam is where the second backend goes: `PlayerBar` renders **either** the existing `<audio>` **or** a hidden Mixcloud widget, chosen by whether `currentMix.mixcloudKey` is set. The store does not change.

The widget maps onto the store as follows:

| Store | Widget |
|---|---|
| `isPlaying` → | `play()` / `pause()` |
| `pendingSeekSec` → | `seek()` |
| ← `setCurrentTime` | `progress` event |
| ← `setDuration` | `getDuration()` once ready |
| ← stop | `ended` event |

Three constraints the implementation must respect:

**One widget at a time.** The iframe belongs to `PlayerBar`, which persists across navigation. Rendering a widget inside a mix page would stop playback on every route change.

**Playback must follow a user gesture.** Browsers block programmatic playback otherwise. `play()` may only be called on the tick of a real click, never from a watcher reacting to state restored on load.

**The widget's script loads lazily, once**, when a Mixcloud mix is first played — not on every page.

## Creating a Mixcloud-hosted mix

The import screen already fetches a cloudcast's key alongside its metadata. It gains a choice: host the audio on Tambouille as today, or leave it on Mixcloud. Choosing the latter drops the audio file requirement and stores `mixcloudKey`; the cover is still imported into R2, so listings stay fast and stay ours.

## Verification

`MixesService`'s exactly-one-of rule is unit-tested in the existing style, including both failure cases, and mutation-checked.

The widget cannot be exercised in a unit test — it is a third-party iframe. Playback is therefore verified in a browser against a real mix: play, pause, scrub, a tracklist timecode jump, and navigating between pages mid-playback without the audio stopping. That list is the acceptance criteria, not a suggestion.

## Known limitations

**A Mixcloud mix disappears if Mixcloud does.** If the mix is deleted, made private, or the widget changes, playback breaks and Tambouille has no copy. The mix row remains, pointing at nothing. The player must show a clear error rather than a silent dead control.

**Plays are counted by Mixcloud, not by Tambouille.** `playsCount` will stay at zero for these mixes, so it stops being comparable across the catalogue. Either accept it, or stop displaying the count on Mixcloud-hosted mixes; the design does not decide this.

**Every mix page loads an iframe from Mixcloud** once playback starts, which tells Mixcloud who is listening from where. That is a third-party request added to the page, and worth stating plainly to the site's visitors if a privacy notice ever exists.

**No offline or range behaviour of our own.** Scrubbing accuracy, buffering and mobile behaviour become Mixcloud's, not ours.
