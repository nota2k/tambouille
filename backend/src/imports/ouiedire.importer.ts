import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { safeFetch } from '../common/safe-fetch';
import { stripHtml } from '../common/strip-html';
import {
  type MixImport,
  type SourceImporter,
  type SourceItem,
} from './source-importer';

const PAGE_MAX_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;

const HOSTS = ['ouiedire.net', 'www.ouiedire.net'];

/** Preference order when a page offers the same show in several formats. */
const AUDIO_PREFERENCE = ['mp3', 'm4a', 'aac', 'ogg', 'flac', 'wav'];

export interface OuiedireEmission {
  title: string;
  author?: string;
  coverUrl?: string;
  audioUrl: string;
  tracklist: { artist: string; title: string; timecodeSec: number }[];
}

/**
 * Ouïedire publishes each show on its own page, and the RSS feed only carries
 * the twenty-five most recent — so the feed cannot reach a show from 2014,
 * which is most of a radio that has been running since 2005. The page also
 * carries the timed tracklist, which the feed does not, and which Tambouille
 * has a model for. Hence a dedicated importer rather than leaning on the feed.
 *
 * It claims `/emission/...` only. `/feed` stays with `PodcastImporter`, which
 * handles it properly.
 */
export function isEmissionUrl(url: URL): boolean {
  if (!HOSTS.includes(url.hostname.toLowerCase())) return false;
  const segments = url.pathname.split('/').filter(Boolean);
  return segments[0] === 'emission' && Boolean(segments[1]);
}

/** "00:03:20" or "3:20" into seconds. Null when it is not a timecode. */
export function parseTimecode(raw: string): number | null {
  const parts = raw.trim().split(':');
  if (parts.length < 2 || parts.length > 3) return null;
  const numbers = parts.map(Number);
  if (numbers.some((part) => !Number.isInteger(part) || part < 0)) return null;
  return numbers.reduce((acc, part) => acc * 60 + part, 0);
}

/**
 * The site writes its own titles as
 * `Ouïedire <Série> - Émission #NNN : <Titre>, par <Auteur>`.
 *
 * The split is on the LAST ", par" because a title may well contain one, and
 * an author never does — a wrong split there would put half a title in the
 * tags. Anything that does not match this shape is kept whole as the title
 * rather than chopped on a guess.
 */
export function parseOuiedireTitle(raw: string): {
  title: string;
  author?: string;
} {
  const afterNumber = raw.match(/Émission\s*#?\d*\s*:\s*(.+)$/u);
  const body = (afterNumber?.[1] ?? raw).trim();

  const separator = body.lastIndexOf(', par ');
  if (separator < 1) return { title: body, author: undefined };

  const author = body.slice(separator + ', par '.length).trim();
  if (!author) return { title: body, author: undefined };

  return { title: body.slice(0, separator).trim(), author };
}

function metaContent(html: string, property: string): string | undefined {
  const pattern = new RegExp(
    `<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`,
    'i',
  );
  return html.match(pattern)?.[1];
}

function formatRank(type: string, src: string): number {
  const haystack = `${type} ${src}`.toLowerCase();
  const rank = AUDIO_PREFERENCE.findIndex((hint) => haystack.includes(hint));
  return rank === -1 ? AUDIO_PREFERENCE.length : rank;
}

export function parseEmissionPage(html: string): OuiedireEmission {
  const rawTitle = metaContent(html, 'og:title') ?? '';
  const { title, author } = parseOuiedireTitle(stripHtml(rawTitle));

  // The page lists FLAC first and a browser would take it — tens of times
  // heavier for the listener, for a difference no one hears on a DJ set.
  const sources = [
    ...html.matchAll(
      /<source[^>]*src=["']([^"']+)["'][^>]*type=["']([^"']+)["']/gi,
    ),
  ]
    .map((match) => ({ src: match[1]!, type: match[2]! }))
    .sort((a, b) => formatRank(a.type, a.src) - formatRank(b.type, b.src));

  const audioUrl = sources.find((source) =>
    source.src.startsWith('https://'),
  )?.src;
  if (!audioUrl) {
    throw new BadRequestException(
      'Cette page Ouïedire ne propose aucun fichier audio lisible',
    );
  }

  const tracklist: OuiedireEmission['tracklist'] = [];
  const list = html.match(
    /<ol[^>]*class=["'][^"']*mejs-smartplaylist-playlist[^"']*["'][^>]*>([\s\S]*?)<\/ol>/i,
  );
  if (list) {
    for (const row of list[1]!.matchAll(/<li>([\s\S]*?)<\/li>/gi)) {
      const cells = row[1]!;
      const timecode = cells.match(
        /<a[^>]*mejs-smartplaylist-time[^>]*>([\s\S]*?)<\/a>/i,
      );
      const span = cells.match(/<span[^>]*>([\s\S]*?)<\/span>/i);
      if (!timecode || !span) continue;

      const timecodeSec = parseTimecode(stripHtml(timecode[1]!));
      if (timecodeSec === null) continue;

      // The row reads "<span>artiste</span> - titre". Whatever trails the span
      // is the track title, minus the dash the page puts between them. `-` is
      // not a reliable separator inside the title itself, so only the leading
      // one is removed.
      const trailing = cells.slice(cells.indexOf('</span>') + '</span>'.length);
      const trailingText = stripHtml(trailing)
        .replace(/^\s*[-–—]\s*/, '')
        .trim();
      const spanText = stripHtml(span[1]!);

      if (!spanText && !trailingText) continue;

      // Some rows carry a single label and no dash — "Intro", "Jingle
      // Ouïedire". That label names the track, not who made it, so it belongs
      // in the title; the artist stays empty rather than borrowing the title's
      // words.
      tracklist.push(
        trailingText
          ? { timecodeSec, artist: spanText, title: trailingText }
          : { timecodeSec, artist: '', title: spanText },
      );
    }
  }

  return {
    title: title || 'Sans titre',
    author,
    coverUrl: metaContent(html, 'og:image'),
    audioUrl,
    tracklist,
  };
}

@Injectable()
export class OuiedireImporter implements SourceImporter {
  readonly name = 'ouiedire';

  matches(url: URL): boolean {
    return isEmissionUrl(url);
  }

  /** A show page is one mix, never a list — there is nothing to choose from. */
  async resolve(url: URL): Promise<MixImport | SourceItem[]> {
    return this.fromPageUrl(this.canonical(url));
  }

  async importItem(value: string): Promise<MixImport> {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new BadRequestException('Référence Ouïedire invalide');
    }
    if (!isEmissionUrl(url)) {
      throw new BadRequestException('Référence Ouïedire invalide');
    }
    return this.fromPageUrl(this.canonical(url));
  }

  /** Drops the query and fragment: neither selects a show, and both would make
   *  two references to the same page look different. */
  private canonical(url: URL): string {
    return `https://${url.hostname.toLowerCase()}${url.pathname.replace(/\/$/, '')}`;
  }

  private async fromPageUrl(pageUrl: string): Promise<MixImport> {
    const { body } = await safeFetch(pageUrl, {
      maxBytes: PAGE_MAX_BYTES,
      timeoutMs: FETCH_TIMEOUT_MS,
      accept: 'text/html',
    });

    let emission: OuiedireEmission;
    try {
      emission = parseEmissionPage(body.toString('utf8'));
    } catch {
      // The site answers an unknown show with a 404 page that parses as HTML
      // but carries no audio, so "no such show" and "page we cannot read" are
      // the same observation from here.
      throw new NotFoundException(
        'Cette page Ouïedire ne correspond à aucune émission lisible',
      );
    }

    return {
      title: emission.title,
      description: '',
      // Le nom de l'auteur rejoint les tags : le mix appartiendra au compte
      // Tambouille qui l'importe, donc sans ça plus rien ne dit de qui il est.
      tags: emission.author ? [emission.author, 'Ouïedire'] : ['Ouïedire'],
      coverSourceUrl: emission.coverUrl,
      tracklist: emission.tracklist,
      sourceType: 'remote',
      sourceRef: emission.audioUrl,
      sourceLabel: 'Ouïedire',
      sourcePageUrl: pageUrl,
    };
  }
}
