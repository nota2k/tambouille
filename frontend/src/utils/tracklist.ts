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
  | { ok: true; entries: TracklistEntryPayload[] }
  | { ok: false; error: string }

/** Validates and converts editable rows into the payload sent to the API. Blank rows are skipped. */
export function buildTracklist(rows: TrackRow[]): BuildTracklistResult {
  const entries: TracklistEntryPayload[] = []

  for (const row of rows) {
    const timecodeRaw = row.timecode.trim()
    const artist = row.artist.trim()
    const title = row.title.trim()

    if (!timecodeRaw && !artist && !title) continue

    if (!timecodeRaw || !artist || !title) {
      return { ok: false, error: 'Chaque morceau de la tracklist doit avoir un timecode, un artiste et un titre.' }
    }

    const timecodeSec = parseTimecode(timecodeRaw)
    if (timecodeSec === null) {
      return { ok: false, error: `Timecode invalide : "${row.timecode}" (utilisez mm:ss ou hh:mm:ss).` }
    }

    entries.push({ artist, title, timecodeSec })
  }

  return { ok: true, entries }
}
