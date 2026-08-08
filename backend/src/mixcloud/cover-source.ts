import { BadGatewayException, BadRequestException, HttpException } from '@nestjs/common';
import { COVER_MAX_BYTES, IMAGE_EXTENSIONS, IMAGE_MIME_TYPES } from '../common/mime.constants';

/**
 * Fetching a cover means the server issues a request to a URL the client chose,
 * which is a request-forgery primitive unless it is fenced in. Everything below
 * runs before the request leaves the process, except the size cap, which runs
 * while the body streams in.
 */

const COVER_FETCH_TIMEOUT_MS = 10_000;

/** Only Mixcloud's own CDN hosts, e.g. `thumbnailer.mixcloud.com`. */
const MIXCLOUD_HOST_SUFFIX = '.mixcloud.com';

export interface FetchedCover {
  buffer: Buffer;
  contentType: string;
  extension: string;
}

/**
 * Throws unless `rawUrl` is an https URL on a Mixcloud host.
 *
 * The host test is made against the *parsed* hostname, never against the URL
 * text: a substring test would accept `https://evil.com/?x=.mixcloud.com`, and
 * a bare `endsWith('mixcloud.com')` on the hostname would accept
 * `https://evilmixcloud.com`.
 */
export function assertMixcloudCoverUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new BadRequestException("L'URL de la pochette est invalide");
  }

  if (url.protocol !== 'https:') {
    throw new BadRequestException("L'URL de la pochette doit utiliser https");
  }

  const hostname = url.hostname.toLowerCase();
  if (!hostname.endsWith(MIXCLOUD_HOST_SUFFIX)) {
    throw new BadRequestException("L'URL de la pochette doit être hébergée sur mixcloud.com");
  }

  return url;
}

/** Reads the body, aborting as soon as it exceeds the cover size limit. */
async function readCappedBody(response: Response): Promise<Buffer> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new BadGatewayException('Mixcloud a renvoyé une pochette vide');
  }

  const chunks: Buffer[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > COVER_MAX_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new BadRequestException('La pochette dépasse la taille autorisée');
    }
    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks);
}

/**
 * Validates `rawUrl`, fetches it from Mixcloud's CDN and returns the image bytes.
 *
 * The deadline is cleared in a `finally` around the *whole* exchange, not just
 * around `fetch`. Clearing it once the headers land would leave the body read
 * running on a dead signal with no deadline at all, so a host that answers and
 * then stops sending would hold the request open for as long as it liked — and
 * the size cap would never trip, because a stalled body sends no bytes to count.
 */
export async function fetchMixcloudCover(rawUrl: string): Promise<FetchedCover> {
  const url = assertMixcloudCoverUrl(rawUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COVER_FETCH_TIMEOUT_MS);

  try {
    let response: Response;
    try {
      response = await fetch(url.toString(), {
        signal: controller.signal,
        // A redirect could point anywhere, including back inside the network:
        // refuse rather than follow one out of the fence checked above.
        redirect: 'error',
      });
    } catch {
      throw new BadGatewayException('Impossible de récupérer la pochette depuis Mixcloud');
    }

    if (!response.ok) {
      throw new BadGatewayException(`Mixcloud a répondu ${response.status} pour la pochette`);
    }

    const contentType = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    if (!IMAGE_MIME_TYPES.includes(contentType)) {
      throw new BadRequestException(`Type de pochette non pris en charge : ${contentType || 'inconnu'}`);
    }

    const declaredLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > COVER_MAX_BYTES) {
      throw new BadRequestException('La pochette dépasse la taille autorisée');
    }

    let buffer: Buffer;
    try {
      buffer = await readCappedBody(response);
    } catch (err) {
      // The size cap and the empty-body case already say what went wrong; a
      // torn or aborted stream is an upstream failure like any other.
      if (err instanceof HttpException) throw err;
      throw new BadGatewayException('Impossible de récupérer la pochette depuis Mixcloud');
    }

    return { buffer, contentType, extension: IMAGE_EXTENSIONS[contentType] };
  } finally {
    clearTimeout(timer);
  }
}
