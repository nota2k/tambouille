import {
  BadGatewayException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { COVER_MAX_BYTES } from '../common/mime.constants';
import { safeFetch } from '../common/safe-fetch';
import { stripHtml } from '../common/strip-html';
import {
  encodeRef,
  type MixImport,
  type SourceImporter,
  type SourceItem,
} from './source-importer';

const METADATA_MAX_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;

/** Archive.org's `format` strings for audio. Matched case-insensitively on a
 *  substring, because they carry qualifiers ("VBR MP3", "24bit Flac"). */
const AUDIO_FORMAT_HINTS = ['mp3', 'ogg', 'flac', 'wave', 'aiff', 'm4a', 'aac'];

/** Preference order when one track exists in several formats. MP3 first: every
 *  browser plays it, and it is an order of magnitude smaller than the lossless
 *  file beside it — the audio is streamed to the listener, not to us. */
const FORMAT_PREFERENCE = ['mp3', 'm4a', 'aac', 'ogg', 'wave', 'aiff', 'flac'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAudioFormat(format: unknown): boolean {
  if (typeof format !== 'string') return false;
  const lower = format.toLowerCase();
  return AUDIO_FORMAT_HINTS.some((hint) => lower.includes(hint));
}

/** `format` values Archive.org uses for images, plus its own generated tile. */
const IMAGE_FORMAT_HINTS = ['jpeg', 'jpg', 'png', 'gif', 'webp', 'item tile'];

/** Archive.org's generated square tile — a fallback, never a first choice. */
const ITEM_TILE = '__ia_thumb.jpg';

function isImageFormat(format: unknown): boolean {
  if (typeof format !== 'string') return false;
  const lower = format.toLowerCase();
  return IMAGE_FORMAT_HINTS.some((hint) => lower.includes(hint));
}

function downloadUrl(identifier: string, fileName: string): string {
  return `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(fileName)}`;
}

/**
 * The item's cover, or undefined when it has none worth using.
 *
 * Every audio item on Archive.org is full of images that are not covers: one
 * PNG spectrogram per track, plus a thumbnail beside every uploaded photo.
 * Both are derivatives and say so in `original` — a spectrogram points at an
 * audio file, a thumbnail at the image it shrank. Taking anything with an
 * `original` out of the running leaves the genuine uploads and the tile.
 *
 * The tile (`__ia_thumb.jpg`) is Archive.org's own square crop, around 9 kB.
 * It works, but it is small enough to look poor at cover size, so it is the
 * fallback rather than the pick.
 *
 * An image over `COVER_MAX_BYTES` is skipped rather than chosen: `fetchCover`
 * would refuse it, and since the cover import is best-effort the mix would end
 * up with no cover at all while a usable one sat in the same item.
 */
export function pickCoverUrl(
  identifier: string,
  payload: unknown,
): string | undefined {
  const files =
    isRecord(payload) && Array.isArray(payload.files) ? payload.files : [];

  const candidates = files.filter(
    (file): file is Record<string, unknown> =>
      isRecord(file) &&
      typeof file.name === 'string' &&
      isImageFormat(file.format) &&
      // A derivative: a spectrogram of a track, or a thumbnail of a photo.
      file.original === undefined &&
      !oversized(file.size),
  );

  const uploaded = candidates.find((file) => file.name !== ITEM_TILE);
  const chosen = uploaded ?? candidates.find((file) => file.name === ITEM_TILE);

  return chosen ? downloadUrl(identifier, chosen.name as string) : undefined;
}

function oversized(size: unknown): boolean {
  if (typeof size !== 'string') return false;
  const bytes = Number(size);
  return Number.isFinite(bytes) && bytes > COVER_MAX_BYTES;
}

function formatRank(format: unknown): number {
  const lower = typeof format === 'string' ? format.toLowerCase() : '';
  const rank = FORMAT_PREFERENCE.findIndex((hint) => lower.includes(hint));
  return rank === -1 ? FORMAT_PREFERENCE.length : rank;
}

/** Archive.org gives `length` either as seconds ("125.4") or as "mm:ss" / "h:mm:ss". */
export function parseLength(raw: unknown): number | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  const parts = raw.trim().split(':').map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return undefined;
  const seconds = parts.reduce((acc, part) => acc * 60 + part, 0);
  return seconds > 0 ? Math.round(seconds) : undefined;
}

export function extractIdentifier(url: URL): string | null {
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments[0] !== 'details' && segments[0] !== 'download') return null;
  return segments[1] ? decodeURIComponent(segments[1]) : null;
}

/**
 * One entry per *track*, not per file.
 *
 * A concert on Archive.org carries every track twice or more — a lossless
 * master plus the derivatives Archive.org generates from it — and listing all
 * of them would show the same title over and over with no way to tell the
 * copies apart. The derivatives say which file they came from in `original`,
 * so that field is what groups them; the format preference picks the one to
 * keep. `original` is only trusted when it names another *audio* file in the
 * same item: spectrograms and waveform images carry it too, and grouping on it
 * blindly would fold unrelated tracks together.
 */
export function parseArchiveItem(
  identifier: string,
  payload: unknown,
): SourceItem[] {
  const files =
    isRecord(payload) && Array.isArray(payload.files) ? payload.files : [];

  const audioFiles = files.filter(
    (file): file is Record<string, unknown> =>
      isRecord(file) &&
      typeof file.name === 'string' &&
      isAudioFormat(file.format),
  );
  const audioNames = new Set(audioFiles.map((file) => file.name as string));

  const groups = new Map<string, Record<string, unknown>>();
  for (const file of audioFiles) {
    const original = file.original;
    const key =
      typeof original === 'string' && audioNames.has(original)
        ? original
        : (file.name as string);

    const kept = groups.get(key);
    if (!kept || formatRank(file.format) < formatRank(kept.format)) {
      groups.set(key, file);
    }
  }

  // The cover belongs to the item, not the track, so every entry carries it —
  // otherwise the picker is a wall of grey squares for a whole concert.
  const coverUrl = pickCoverUrl(identifier, payload);

  return [...groups.values()].map((file) => {
    const title = file.title;
    return {
      ref: encodeRef('archive', `${identifier}/${file.name as string}`),
      title:
        typeof title === 'string' && title.trim()
          ? title.trim()
          : (file.name as string),
      durationSec: parseLength(file.length),
      coverUrl,
    };
  });
}

@Injectable()
export class ArchiveImporter implements SourceImporter {
  readonly name = 'archive';

  matches(url: URL): boolean {
    const host = url.hostname.toLowerCase();
    return (
      (host === 'archive.org' || host.endsWith('.archive.org')) &&
      extractIdentifier(url) !== null
    );
  }

  async resolve(url: URL): Promise<MixImport | SourceItem[]> {
    const identifier = extractIdentifier(url);
    if (!identifier) {
      throw new NotFoundException(
        'Cette adresse Archive.org ne désigne aucun item',
      );
    }

    const items = parseArchiveItem(
      identifier,
      await this.readMetadata(identifier),
    );
    if (items.length === 0) {
      // Archive.org answers an unknown identifier with `200 {}`, not a 404, so
      // this one message covers both "no such item" and "item without audio".
      throw new NotFoundException(
        'Cet item Archive.org ne contient aucun fichier audio',
      );
    }
    // A single audio file is not a choice; skip the list and import it.
    return items.length === 1
      ? this.importItem(items[0]!.ref.replace(/^archive:/, ''))
      : items;
  }

  async importItem(value: string): Promise<MixImport> {
    const slash = value.indexOf('/');
    if (slash < 1) {
      throw new NotFoundException('Référence Archive.org invalide');
    }
    const identifier = value.slice(0, slash);
    const fileName = value.slice(slash + 1);

    const payload = await this.readMetadata(identifier);
    const metadata =
      isRecord(payload) && isRecord(payload.metadata) ? payload.metadata : {};
    const item = parseArchiveItem(identifier, payload).find(
      (candidate) => candidate.ref === encodeRef('archive', value),
    );
    if (!item) {
      throw new NotFoundException(
        "Ce fichier n'existe plus dans cet item Archive.org",
      );
    }

    const creator =
      typeof metadata.creator === 'string' ? metadata.creator : undefined;

    return {
      title: item.title,
      // Archive.org writes its description as a run of `<div>` lines.
      description:
        typeof metadata.description === 'string'
          ? stripHtml(metadata.description)
          : '',
      // Le nom du créateur rejoint les tags : le mix appartiendra au compte
      // Tambouille qui l'importe, donc sans ça plus rien ne dit de qui il est.
      tags: creator ? [creator] : [],
      coverSourceUrl: item.coverUrl,
      durationSec: item.durationSec,
      tracklist: [],
      sourceType: 'remote',
      // Each segment is encoded on its own: a file name may contain `#` or `?`,
      // which would otherwise cut the URL short.
      sourceRef: `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(fileName)}`,
      sourceLabel: 'Archive.org',
      sourcePageUrl: `https://archive.org/details/${encodeURIComponent(identifier)}`,
    };
  }

  private async readMetadata(identifier: string): Promise<unknown> {
    const { body } = await safeFetch(
      `https://archive.org/metadata/${encodeURIComponent(identifier)}`,
      {
        maxBytes: METADATA_MAX_BYTES,
        timeoutMs: FETCH_TIMEOUT_MS,
        accept: 'application/json',
      },
    );
    try {
      return JSON.parse(body.toString('utf8'));
    } catch {
      throw new BadGatewayException('Réponse illisible depuis Archive.org');
    }
  }
}
