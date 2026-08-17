import { parseTimecode } from './time'

export interface TrackRow {
  timecode: string
  artist: string
  title: string
}

export interface TracklistEntryPayload {
  artist: string
  title: string
  timecodeSec: number
}

export type BuildTracklistResult =
  { ok: true; entries: TracklistEntryPayload[] } | { ok: false; error: string }

/**
 * Converts editable rows into the payload sent to the API. Blank rows are
 * skipped.
 *
 * No field is required. A source publishes what it publishes — "Intro" with no
 * artist, an artist with no track named — and a tracklist that refused to save
 * over one such row took the whole mix down with it. An empty field is stored
 * empty. The only rejection left is a timecode that was typed and cannot be
 * read: that is not an empty value, it is a wrong one.
 */
export function buildTracklist(rows: TrackRow[]): BuildTracklistResult {
  const entries: TracklistEntryPayload[] = []

  for (const row of rows) {
    const timecodeRaw = row.timecode.trim()
    const artist = row.artist.trim()
    const title = row.title.trim()

    // The editor always shows one spare row. Untouched, it is not an entry.
    if (!timecodeRaw && !artist && !title) continue

    // No timecode means the start of the mix — the row still has to sit
    // somewhere on the timeline.
    const timecodeSec = timecodeRaw ? parseTimecode(timecodeRaw) : 0
    if (timecodeSec === null) {
      return {
        ok: false,
        error: `Timecode invalide : "${row.timecode}" (utilisez mm:ss ou hh:mm:ss).`,
      }
    }

    entries.push({ artist, title, timecodeSec })
  }

  return { ok: true, entries }
}
