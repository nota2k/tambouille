import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { safeFetch } from '../common/safe-fetch';
import { stripHtml } from '../common/strip-html';
import {
  encodeRef,
  type MixImport,
  type SourceImporter,
  type SourceItem,
} from './source-importer';

const API_MAX_BYTES = 4 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;

const HOSTS = ['lyl.live', 'www.lyl.live'];
const API = 'https://strapi.lyl.live/api/episodes';

/** How many episodes of a show the chooser offers. The longest-running shows
 *  are around sixty, so this is a ceiling, not a page. */
const SHOW_EPISODE_LIMIT = 100;

/** A slug is the only thing that reaches the API from a pasted URL, so it is
 *  held to the shape LYL actually mints — never a path, never a query. */
const SLUG_PATTERN = /^[A-Za-z0-9._-]+$/;

/**
 * lyl.live is a React app that ships an empty document: there is no HTML to
 * read, unlike Ouïedire. Its Strapi back-office is public in read mode, and
 * answers a plain GET on `/api/episodes` — where the GraphQL endpoint the app
 * itself uses demands an `apollo-require-preflight` header that `safeFetch`
 * has no way to send. So the REST flavour it is, and `safeFetch` stays as is.
 *
 * An episode carries everything the upload form wants: title, description,
 * artist, styles, cover, duration, a text tracklist, and LYL's own mp3 — plus
 * the Mixcloud and SoundCloud mirrors, which are deliberately ignored. The mp3
 * is the original and plays without a third-party widget.
 */
export interface LylEpisode {
  title: string;
  slug: string;
  artists?: string;
  description?: string;
  startAt?: string;
  duration?: string;
  tracks?: string;
  audio?: { url?: string } | null;
  image?: { url?: string } | null;
  styles?: { name?: string }[] | null;
}

export function parseLylUrl(
  url: URL,
): { kind: 'episode' | 'show'; slug: string } | null {
  if (!HOSTS.includes(url.hostname.toLowerCase())) return null;

  const segments = url.pathname.split('/').filter(Boolean);
  const [route, slug] = segments;
  if (!slug || !SLUG_PATTERN.test(slug)) return null;

  if (route === 'episode') return { kind: 'episode', slug };
  // The app routes `/show/:id` and `/shows/:id` to the same page; a link may
  // carry either.
  if (route === 'show' || route === 'shows') return { kind: 'show', slug };
  return null;
}

/**
 * `"01:00:00"` into seconds — the GraphQL flavour of the same field adds
 * milliseconds, so those are tolerated too.
 *
 * Anything outside what `CreateMixDto` accepts comes back undefined rather
 * than being passed on: a duration over 24 h is a misreading, not a long show,
 * and sending it would fail validation at the far end of the import with no
 * one able to say why.
 */
export function parseLylDuration(raw: unknown): number | undefined {
  if (typeof raw !== 'string') return undefined;
  const match = raw.trim().match(/^(\d{1,2}):([0-5]\d):([0-5]\d)(?:\.\d+)?$/);
  if (!match) return undefined;
  const seconds =
    Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
  return seconds >= 1 && seconds <= 24 * 3600 ? seconds : undefined;
}

/**
 * The `tracks` field is free text, one bulleted line per track, in the shape
 * `- ARTISTE - Titre`. No timecodes: the site publishes none, so every track
 * lands at zero rather than being invented.
 *
 * The split is on the FIRST separator, the mirror of the Ouïedire rule — there
 * the author never contains one, here the artist rarely does and the title
 * often does ("Nord - Sud"). A line with no separator at all names the track
 * and not who made it, so it becomes the title with an empty artist, exactly
 * as a bare "Jingle" row does on Ouïedire.
 */
export function parseLylTracks(
  raw: unknown,
): { artist: string; title: string; timecodeSec: number }[] {
  if (typeof raw !== 'string') return [];

  const tracks: { artist: string; title: string; timecodeSec: number }[] = [];
  for (const line of raw.split('\n')) {
    // The bullet is optional: some shows write their tracklist without one.
    const body = line
      .trim()
      .replace(/^[-–—•*]\s*/, '')
      .trim();
    if (!body) continue;

    // The site uses a hyphen and, on some lines, an en dash.
    const separator = body.match(/\s[-–—]\s/);
    if (!separator || separator.index === undefined) {
      tracks.push({ artist: '', title: body, timecodeSec: 0 });
      continue;
    }

    const artist = body.slice(0, separator.index).trim();
    const title = body.slice(separator.index + separator[0].length).trim();
    if (!artist && !title) continue;
    tracks.push({ artist, title, timecodeSec: 0 });
  }
  return tracks;
}

@Injectable()
export class LylImporter implements SourceImporter {
  readonly name = 'lyl';

  matches(url: URL): boolean {
    return parseLylUrl(url) !== null;
  }

  async resolve(url: URL): Promise<MixImport | SourceItem[]> {
    const target = parseLylUrl(url);
    if (!target) throw new BadRequestException('Adresse LYL Radio invalide');
    return target.kind === 'episode'
      ? this.fromSlug(target.slug)
      : this.listShow(target.slug);
  }

  async importItem(slug: string): Promise<MixImport> {
    // `POST /imports/item` is reachable with an arbitrary `ref` — a
    // `lyl:<anything>` gets here without ever passing through `matches()`.
    if (!SLUG_PATTERN.test(slug)) {
      throw new BadRequestException('Référence LYL Radio invalide');
    }
    return this.fromSlug(slug);
  }

  private async fromSlug(slug: string): Promise<MixImport> {
    const episodes = await this.readEpisodes(
      `${API}?${new URLSearchParams({
        'filters[slug][$eq]': slug,
        'populate[0]': 'image',
        'populate[1]': 'styles',
        'populate[2]': 'audio',
        'populate[3]': 'show',
      }).toString()}`,
    );

    const episode = episodes[0];
    if (!episode) {
      throw new NotFoundException(
        'Cette adresse ne correspond à aucune émission LYL Radio',
      );
    }

    const audioUrl = episode.audio?.url;
    if (!audioUrl || !audioUrl.startsWith('https://')) {
      // Some episodes exist only as a Mixcloud or SoundCloud mirror. Those
      // links are on the page; the person can paste one of them instead.
      throw new BadRequestException(
        'Cette émission LYL Radio ne propose aucun fichier audio lisible. Essaie son lien Mixcloud ou SoundCloud.',
      );
    }

    const styles = (episode.styles ?? [])
      .map((style) => style?.name)
      .filter((name): name is string => Boolean(name));

    return {
      title: episode.title || 'Sans titre',
      description: stripHtml(episode.description ?? ''),
      // L'artiste a désormais son champ : le laisser aussi dans les tags ferait
      // deux sources pour la même information.
      tags: [...styles, 'LYL Radio'],
      artist: episode.artists?.trim(),
      coverSourceUrl: episode.image?.url,
      durationSec: parseLylDuration(episode.duration),
      tracklist: parseLylTracks(episode.tracks),
      sourceType: 'remote',
      sourceRef: audioUrl,
      sourceLabel: 'LYL Radio',
      sourcePageUrl: `https://lyl.live/episode/${episode.slug || slug}`,
    };
  }

  private async listShow(slug: string): Promise<SourceItem[]> {
    const episodes = await this.readEpisodes(
      `${API}?${new URLSearchParams({
        'filters[show][slug][$eq]': slug,
        sort: 'startAt:desc',
        'pagination[limit]': String(SHOW_EPISODE_LIMIT),
        'populate[0]': 'image',
      }).toString()}`,
    );

    if (episodes.length === 0) {
      throw new NotFoundException(
        'Cette adresse ne correspond à aucune émission LYL Radio',
      );
    }

    return episodes.map((episode) => ({
      ref: encodeRef(this.name, episode.slug),
      // A show reuses one title across every episode — "Temple Of Faitiche"
      // sixty times over. The chooser shows the title and nothing else, so the
      // date goes in it or the list is unusable.
      title: datedTitle(episode),
      durationSec: parseLylDuration(episode.duration),
      coverUrl: episode.image?.url,
      publishedAt: episode.startAt,
    }));
  }

  private async readEpisodes(endpoint: string): Promise<LylEpisode[]> {
    const { body } = await safeFetch(endpoint, {
      maxBytes: API_MAX_BYTES,
      timeoutMs: FETCH_TIMEOUT_MS,
      accept: 'application/json',
    });

    let parsed: unknown;
    try {
      parsed = JSON.parse(body.toString('utf8'));
    } catch {
      throw new BadGatewayException('Réponse illisible depuis LYL Radio');
    }

    const data = (parsed as { data?: unknown })?.data;
    if (!Array.isArray(data)) {
      throw new BadGatewayException('Réponse inattendue depuis LYL Radio');
    }
    return data as LylEpisode[];
  }
}

/** "Temple Of Faitiche — 2026-08-14". The date is the broadcast day, which is
 *  how LYL itself distinguishes two episodes of the same show. */
function datedTitle(episode: LylEpisode): string {
  const title = episode.title || 'Sans titre';
  const day = episode.startAt?.slice(0, 10);
  return day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? `${title} — ${day}` : title;
}
