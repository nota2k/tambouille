import { BadGatewayException, BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

const MIXCLOUD_API_BASE = 'https://api.mixcloud.com';
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Both patterns are path-injection guards, and both run before any outbound
 * request: `username` and `key` are interpolated into the upstream URL, so
 * without them a crafted value turns this relay into a request-forgery tool.
 */
const USERNAME_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * The slug segment additionally allows percent-escapes, but *only* of bytes
 * >= 0x80: Mixcloud percent-encodes non-ASCII slugs, so a real key such as
 * `/Notamusic/antimythes-i-emission-ou%C3%AFedire-34/` cannot be expressed
 * without them (`ï` is `%C3%AF`, and both bytes are >= 0x80).
 *
 * Requiring the first hex digit to be 8-F is what keeps traversal impossible:
 * `%2e` (`.`), `%2f` (`/`), `%5c` (`\`) and `%00` all start below 8, so no
 * escape of an ASCII byte can be expressed at all — in either hex case, since
 * the leading digit of those escapes is a digit, not a letter.
 *
 * The username segment is deliberately NOT widened: Mixcloud usernames are
 * ASCII, and there is no reason to loosen what does not need loosening.
 *
 * Exported because a Mixcloud-hosted mix stores such a key, and the mix DTOs
 * must accept exactly what this relay accepts — one pattern, not two copies.
 */
export const KEY_PATTERN = /^\/[A-Za-z0-9_-]+\/(?:[A-Za-z0-9_.-]|%[89A-Fa-f][0-9A-Fa-f])+\/$/;

/** Largest first: the upload form wants the best cover Mixcloud offers. */
const PICTURE_PREFERENCE = ['1024wx1024h', '768wx768h', '640wx640h', 'extra_large', '320wx320h', 'large', 'medium', 'small'];

/** Le compte Mixcloud qui a publié le mix — distinct du compte Tambouille qui l'importe. */
export interface CloudcastArtist {
  name: string;
  username: string;
  profileUrl?: string;
}

export interface CloudcastSummary {
  key: string;
  name: string;
  tags: string[];
  pictureUrl?: string;
  audioLengthSec?: number;
  createdAt?: string;
  artist?: CloudcastArtist;
}

export interface TracklistEntry {
  artist: string;
  title: string;
  timecodeSec: number;
}

export interface CloudcastImport {
  title: string;
  description: string;
  tags: string[];
  coverSourceUrl?: string;
  tracklist: TracklistEntry[];
  artist?: CloudcastArtist;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Reads a name that Mixcloud may give either as a bare string or as `{ name }`. */
function readName(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (isRecord(value) && typeof value.name === 'string') {
    const trimmed = value.name.trim();
    return trimmed || undefined;
  }
  return undefined;
}

export function parseTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const names = tags.map(readName).filter((name): name is string => Boolean(name));
  return Array.from(new Set(names));
}

/**
 * Lit le compte Mixcloud d'un cloudcast. `name` est le nom affiché (« Nota ») et
 * `username` l'identifiant d'URL (« Notamusic ») ; ils diffèrent presque toujours.
 *
 * `profileUrl` n'est retenue que si elle pointe bien vers mixcloud.com : elle vient
 * d'une réponse distante et le formulaire d'import en fait un lien cliquable, donc une
 * valeur inattendue deviendrait un lien sortant qu'aucune page de Tambouille n'a voulu.
 */
export function readArtist(user: unknown): CloudcastArtist | undefined {
  if (!isRecord(user)) return undefined;

  const name = readName(user.name);
  const username = typeof user.username === 'string' ? user.username.trim() : '';
  if (!name && !username) return undefined;

  const url = typeof user.url === 'string' ? user.url : '';
  return {
    // Un compte sans nom affiché reste identifiable par son identifiant.
    name: name ?? username,
    username,
    profileUrl: url.startsWith('https://www.mixcloud.com/') ? url : undefined,
  };
}

/**
 * Place le nom de l'artiste **en tête** des tags, jamais à la suite.
 *
 * `MixesService.parseTags` tronque à 10 tags à la création : ajouté en dernier, le nom
 * de l'artiste serait le premier perdu sur un mix qui porte déjà 10 tags — précisément
 * les mix les mieux renseignés.
 *
 * La déduplication ignore la casse parce que l'enregistrement l'ignore aussi : les tags
 * sont passés en minuscules, donc « Nota » et « nota » sont un seul tag une fois en base.
 * Sans ça, le formulaire afficherait un doublon qui disparaîtrait à l'envoi, sans que
 * rien n'explique lequel des deux a été retenu.
 */
export function withArtistTag(tags: string[], artistName?: string): string[] {
  if (!artistName) return tags;
  const rest = tags.filter((tag) => tag.toLowerCase() !== artistName.toLowerCase());
  return [artistName, ...rest];
}

export function pickPictureUrl(pictures: unknown): string | undefined {
  if (!isRecord(pictures)) return undefined;
  for (const size of PICTURE_PREFERENCE) {
    const url = pictures[size];
    if (typeof url === 'string' && url) return url;
  }
  return undefined;
}

function toTimecodeSec(value: unknown): number {
  const seconds = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) return 0;
  return Math.round(seconds);
}

/**
 * Mixcloud documents the *upload* parameters for sections
 * (`sections-X-artist`, `sections-X-song`, `sections-X-start_time`) but
 * publishes no example of the read shape, and every mix checked had empty
 * sections, so it could not be observed. Both plausible forms are therefore
 * accepted — fields nested under `track`, and fields flat on the section —
 * and anything that does not resolve to both an artist and a title is dropped
 * rather than imported as a half-entry.
 */
export function parseSections(sections: unknown): TracklistEntry[] {
  if (!Array.isArray(sections)) return [];

  const entries: TracklistEntry[] = [];

  for (const section of sections) {
    if (!isRecord(section)) continue;

    // A `chapter` names a passage of the mix rather than a track, but naming
    // one does not stop a section from also carrying a track: only sections
    // carrying *nothing but* a chapter are skipped, and they are skipped by
    // the artist/title test below, which they cannot satisfy.
    const track = isRecord(section.track) ? section.track : undefined;
    const source: Record<string, unknown> = track ?? section;

    const artist = readName(source.artist) ?? readName(source.artist_name);
    const title = readName(source.name) ?? readName(source.song) ?? readName(source.title) ?? readName(source.song_name);

    if (!artist || !title) continue;

    const startTime = section.start_time ?? source.start_time;
    entries.push({ artist, title, timecodeSec: toTimecodeSec(startTime) });
  }

  return entries.sort((a, b) => a.timecodeSec - b.timecodeSec);
}

export function toCloudcastSummary(raw: unknown): CloudcastSummary {
  const cloudcast = isRecord(raw) ? raw : {};
  return {
    key: typeof cloudcast.key === 'string' ? cloudcast.key : '',
    name: typeof cloudcast.name === 'string' ? cloudcast.name : '',
    tags: parseTags(cloudcast.tags),
    pictureUrl: pickPictureUrl(cloudcast.pictures),
    audioLengthSec: typeof cloudcast.audio_length === 'number' ? cloudcast.audio_length : undefined,
    createdAt: typeof cloudcast.created_time === 'string' ? cloudcast.created_time : undefined,
    artist: readArtist(cloudcast.user),
  };
}

export function toCloudcastImport(raw: unknown): CloudcastImport {
  const cloudcast = isRecord(raw) ? raw : {};
  const artist = readArtist(cloudcast.user);

  return {
    title: typeof cloudcast.name === 'string' ? cloudcast.name : '',
    description: typeof cloudcast.description === 'string' ? cloudcast.description : '',
    // Le nom de l'artiste rejoint les tags : le mix appartiendra au compte Tambouille
    // qui l'importe, donc sans ça plus rien dans la fiche ne dit de qui il est.
    tags: withArtistTag(parseTags(cloudcast.tags), artist?.name),
    coverSourceUrl: pickPictureUrl(cloudcast.pictures),
    tracklist: parseSections(cloudcast.sections),
    artist,
  };
}

/**
 * Read-only relay in front of Mixcloud's public API. It exists because the
 * browser cannot call `api.mixcloud.com` directly (CORS), and it never writes
 * to Mixcloud nor stores anything about the account.
 */
@Injectable()
export class MixcloudService {
  async listCloudcasts(username: string): Promise<CloudcastSummary[]> {
    if (!USERNAME_PATTERN.test(username)) {
      throw new BadRequestException("Nom d'utilisateur Mixcloud invalide");
    }

    const payload = await this.getJson(`${MIXCLOUD_API_BASE}/${username}/cloudcasts/?limit=50`);
    const data = isRecord(payload) && Array.isArray(payload.data) ? payload.data : [];
    return data.map(toCloudcastSummary);
  }

  async getCloudcast(key: string): Promise<CloudcastImport> {
    if (!KEY_PATTERN.test(key)) {
      throw new BadRequestException('Identifiant de mix Mixcloud invalide');
    }

    // `%C3` on its own satisfies the pattern — it is a well-formed escape of
    // byte 0xC3 — but it is a truncated UTF-8 sequence, so it is not a key
    // Mixcloud could have issued. Decoding rejects those. This cannot let
    // traversal back in: the pattern already forbids escaping any ASCII byte.
    try {
      decodeURIComponent(key);
    } catch {
      throw new BadRequestException('Identifiant de mix Mixcloud invalide');
    }

    const payload = await this.getJson(`${MIXCLOUD_API_BASE}${key}`);
    return toCloudcastImport(payload);
  }

  /**
   * A missing account or mix stays a 404; anything else upstream — an error
   * status, a transport failure, a timeout, unreadable JSON — becomes a 502,
   * so the caller can tell "no such Mixcloud account" from "Mixcloud is down".
   *
   * The deadline is cleared in a `finally` around the whole exchange rather
   * than around `fetch` alone: clearing it once the headers land would leave
   * `response.json()` reading on a dead signal with no deadline, so a host that
   * answers and then stalls the body would hold the request open indefinitely.
   */
  private async getJson(url: string): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      let response: Response;
      try {
        response = await fetch(url, {
          signal: controller.signal,
          // Same reasoning as the cover fetch: a 3xx from Mixcloud could point
          // anywhere, including back inside the network, and the body of what
          // it points at would be relayed to the caller verbatim.
          redirect: 'error',
          headers: { accept: 'application/json' },
        });
      } catch {
        throw new BadGatewayException('Mixcloud est injoignable');
      }

      if (response.status === 404) {
        throw new NotFoundException("Ce compte ou ce mix Mixcloud n'existe pas");
      }
      if (!response.ok) {
        throw new BadGatewayException(`Mixcloud a répondu ${response.status}`);
      }

      try {
        return await response.json();
      } catch {
        throw new BadGatewayException('Réponse illisible de Mixcloud');
      }
    } finally {
      clearTimeout(timer);
    }
  }
}
