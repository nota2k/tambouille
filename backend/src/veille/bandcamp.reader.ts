import { Injectable, NotFoundException } from '@nestjs/common';
import { safeFetch } from '../common/safe-fetch';
import { stripHtml } from '../common/strip-html';
import {
  MAX_ITEMS_PER_SOURCE,
  type ResolvedSource,
  type VeilleItem,
} from './veille.types';

const PAGE_MAX_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;

export function isBandcampUrl(url: URL): boolean {
  return url.hostname.toLowerCase().endsWith('.bandcamp.com');
}

/** Bandcamp sert les pochettes par identifiant d'image, jamais par URL complète
 *  dans la grille : ce gabarit est celui du site pour la vignette carrée. */
function artUrl(artId: string | number | undefined): string | undefined {
  return artId ? `https://f4.bcbits.com/img/a${artId}_9.jpg` : undefined;
}

function absolute(origin: string, href: string): string {
  return href.startsWith('http') ? href : `${origin}${href}`;
}

/** La grille moderne : le JSON de `data-client-items` porte tout. En pratique
 *  aucune page gelée n'y a trouvé de `publish_date` (voir l'en-tête de la
 *  spec) : le champ reste optionnel plutôt que requis pour ne pas dépendre
 *  d'une donnée que Bandcamp ne sert pas toujours. */
function fromClientItems(html: string, origin: string): VeilleItem[] {
  const match = /data-client-items="([^"]*)"/.exec(html);
  if (!match) return [];
  type ClientItem = {
    page_url?: string;
    title?: string;
    art_id?: string | number;
    publish_date?: string;
  };
  let entries: ClientItem[];
  try {
    entries = JSON.parse(
      match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
    ) as ClientItem[];
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.page_url && entry.title)
    .map((entry) => ({
      title: stripHtml(entry.title as string).trim(),
      pageUrl: absolute(origin, entry.page_url as string),
      coverUrl: artUrl(entry.art_id),
      publishedAt: entry.publish_date
        ? new Date(entry.publish_date).toISOString()
        : undefined,
    }));
}

/** La grille statique du premier lot, qui n'est pas datée. Un item sans date
 *  reste affichable ; il passe simplement en fin de tri. */
function fromGridMarkup(html: string, origin: string): VeilleItem[] {
  const items: VeilleItem[] = [];
  const itemPattern =
    /<li[^>]*class="[^"]*music-grid-item[^"]*"[\s\S]*?<a href="([^"]+)"[\s\S]*?<img[^>]+src="([^"]+)"[\s\S]*?<p[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/p>/g;
  let match: RegExpExecArray | null;
  while ((match = itemPattern.exec(html)) !== null) {
    const title = stripHtml(match[3]).trim();
    if (!title) continue;
    items.push({
      title,
      pageUrl: absolute(origin, match[1]),
      coverUrl: match[2],
    });
  }
  return items;
}

function parseLabel(html: string, origin: string): string {
  const band = /<meta property="og:site_name" content="([^"]*)"/.exec(html);
  if (band?.[1]) return stripHtml(band[1]).trim();
  return new URL(origin).hostname.replace('.bandcamp.com', '');
}

export function parseBandcampMusicPage(
  html: string,
  pageOrigin: string,
): { label: string; items: VeilleItem[] } {
  const items = fromClientItems(html, pageOrigin);
  return {
    label: parseLabel(html, pageOrigin),
    items: (items.length ? items : fromGridMarkup(html, pageOrigin)).slice(
      0,
      MAX_ITEMS_PER_SOURCE,
    ),
  };
}

@Injectable()
export class BandcampReader {
  readonly name = 'bandcamp';

  matches(url: URL): boolean {
    return isBandcampUrl(url);
  }

  /** La page des sorties est `/music`, quelle que soit l'adresse donnée :
   *  la racine d'un artiste redirige parfois vers un album mis en avant. */
  async read(url: URL): Promise<ResolvedSource> {
    const origin = `https://${url.hostname.toLowerCase()}`;
    const { body } = await safeFetch(`${origin}/music`, {
      maxBytes: PAGE_MAX_BYTES,
      timeoutMs: FETCH_TIMEOUT_MS,
      accept: 'text/html',
    });

    const { label, items } = parseBandcampMusicPage(
      body.toString('utf8'),
      origin,
    );
    if (!items.length) {
      throw new NotFoundException(
        'Cette page Bandcamp ne montre aucune sortie',
      );
    }
    return { resolver: this.name, label, url: `${origin}/music`, items };
  }
}
