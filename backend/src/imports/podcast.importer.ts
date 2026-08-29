import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { safeFetch } from '../common/safe-fetch';
import { stripHtml } from '../common/strip-html';
import {
  encodeRef,
  type MixImport,
  type SourceImporter,
  type SourceItem,
} from './source-importer';

const FEED_MAX_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;

/** `ref` packs the feed URL and the entry's guid. A space cannot appear in a
 *  URL unescaped, so it separates the two without needing an escape scheme. */
const REF_SEPARATOR = ' ';

export interface FeedEntry {
  guid: string;
  title: string;
  description: string;
  audioUrl: string;
  durationSec?: number;
  publishedAt?: string;
  imageUrl?: string;
  /** La page de l'épisode. Un `<link>` vide ou relatif ne donne pas un lien
   *  utilisable — mieux vaut ne rien afficher qu'un lien mort. */
  pageUrl?: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  // A feed whose titles are years, or whose guids are digits, must not come
  // back as numbers or booleans — every field here is text.
  parseTagValue: false,
  parseAttributeValue: false,
});

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function text(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object' && '#text' in value) {
    return String((value as { '#text': unknown })['#text']).trim();
  }
  return '';
}

/** `<itunes:duration>` is "3600", "mm:ss" or "hh:mm:ss" depending on the host. */
export function parseItunesDuration(raw: unknown): number | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  const parts = raw.trim().split(':').map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return undefined;
  const seconds = parts.reduce((acc, part) => acc * 60 + part, 0);
  return seconds > 0 ? Math.round(seconds) : undefined;
}

function attribute(node: unknown, name: string): string | undefined {
  if (!node || typeof node !== 'object') return undefined;
  const value = (node as Record<string, unknown>)[`@_${name}`];
  return typeof value === 'string' ? value : undefined;
}

export function parseFeed(xml: string): {
  channelTitle: string;
  channelAuthor?: string;
  channelImage?: string;
  items: FeedEntry[];
} {
  const doc: unknown = parser.parse(xml);
  const rss = (doc as Record<string, any>)?.rss;
  const channel = rss?.channel;
  if (!channel || typeof channel !== 'object') {
    throw new BadRequestException(
      'Cette adresse ne renvoie pas un flux RSS lisible',
    );
  }

  const channelImage =
    attribute(channel['itunes:image'], 'href') ||
    text(channel.image?.url) ||
    undefined;

  // Real self-hosted radio feeds often carry no `itunes:` namespace at all.
  // `dc:creator` comes before the channel title because the title is frequently
  // a slogan, and this value becomes a tag on the imported mix.
  const channelAuthor =
    text(channel['itunes:author']) || text(channel['dc:creator']) || undefined;

  const items: FeedEntry[] = [];
  for (const raw of asArray(channel.item)) {
    const enclosure = asArray(raw.enclosure)[0];
    const audioUrl = attribute(enclosure, 'url');
    const type = attribute(enclosure, 'type') ?? '';
    // Some feeds carry video or PDF enclosures alongside audio; a feed with no
    // audio at all is reported as such rather than imported empty.
    if (!audioUrl || !type.toLowerCase().startsWith('audio/')) continue;

    const description = text(raw.description) || text(raw['itunes:summary']);
    const link = text(raw.link);

    items.push({
      guid: text(raw.guid) || audioUrl,
      title: text(raw.title) || 'Sans titre',
      description: stripHtml(description),
      audioUrl,
      durationSec: parseItunesDuration(raw['itunes:duration']),
      publishedAt: text(raw.pubDate) || undefined,
      imageUrl: attribute(raw['itunes:image'], 'href') ?? channelImage,
      pageUrl: link.startsWith('https://') ? link : undefined,
    });
  }

  return {
    channelTitle: text(channel.title),
    channelAuthor,
    channelImage,
    items,
  };
}

/**
 * The fallback importer: a feed lives on any host, so it cannot be recognised
 * by host. It therefore claims every https URL and must be registered last.
 * A URL that reaches it and does not parse is reported as an unrecognised
 * link, which is the message that helps someone who pasted an unsupported site.
 */
@Injectable()
export class PodcastImporter implements SourceImporter {
  readonly name = 'podcast';

  matches(url: URL): boolean {
    return url.protocol === 'https:';
  }

  async resolve(url: URL): Promise<MixImport | SourceItem[]> {
    const feed = await this.readFeed(url.toString());
    if (feed.items.length === 0) {
      throw new NotFoundException('Ce flux ne contient aucun épisode audio');
    }
    // `ref` carries the feed URL and the entry's guid, because `importItem`
    // gets no URL back — only what the client hands it.
    return feed.items.map((entry) => ({
      ref: encodeRef(
        this.name,
        `${url.toString()}${REF_SEPARATOR}${entry.guid}`,
      ),
      title: entry.title,
      durationSec: entry.durationSec,
      coverUrl: entry.imageUrl,
      publishedAt: entry.publishedAt,
      pageUrl: entry.pageUrl,
    }));
  }

  async importItem(value: string): Promise<MixImport> {
    const separator = value.indexOf(REF_SEPARATOR);
    const feedUrl = separator < 0 ? '' : value.slice(0, separator);
    // A guid may itself contain spaces, so only the first one splits.
    const guid = separator < 0 ? '' : value.slice(separator + 1);
    if (!feedUrl || !guid) {
      throw new BadRequestException('Référence de flux invalide');
    }

    const feed = await this.readFeed(feedUrl);
    const entry = feed.items.find((candidate) => candidate.guid === guid);
    if (!entry)
      throw new NotFoundException("Cet épisode n'est plus dans le flux");

    const author = feed.channelAuthor ?? feed.channelTitle;

    return {
      title: entry.title,
      description: entry.description,
      tags: author ? [author] : [],
      coverSourceUrl: entry.imageUrl,
      durationSec: entry.durationSec,
      tracklist: [],
      sourceType: 'remote',
      sourceRef: entry.audioUrl,
      sourceLabel: feed.channelTitle || new URL(feedUrl).hostname,
      sourcePageUrl: feedUrl,
    };
  }

  private async readFeed(
    rawUrl: string,
  ): Promise<ReturnType<typeof parseFeed>> {
    const { body } = await safeFetch(rawUrl, {
      maxBytes: FEED_MAX_BYTES,
      timeoutMs: FETCH_TIMEOUT_MS,
      accept: 'application/rss+xml, application/xml, text/xml',
    });
    try {
      return parseFeed(body.toString('utf8'));
    } catch {
      throw new BadRequestException(
        'Lien non reconnu. Sources gérées : Mixcloud, SoundCloud, Archive.org, Ouïedire, LYL Radio, flux RSS.',
      );
    }
  }
}
