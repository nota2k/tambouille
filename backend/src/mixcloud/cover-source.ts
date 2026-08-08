import { BadGatewayException, BadRequestException } from '@nestjs/common';
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
    throw new BadRequestException('coverSourceUrl must be a valid URL');
  }

  if (url.protocol !== 'https:') {
    throw new BadRequestException('coverSourceUrl must use https');
  }

  const hostname = url.hostname.toLowerCase();
  if (!hostname.endsWith(MIXCLOUD_HOST_SUFFIX)) {
    throw new BadRequestException('coverSourceUrl must be hosted on mixcloud.com');
  }

  return url;
}

/** Reads the body, aborting as soon as it exceeds the cover size limit. */
async function readCappedBody(response: Response): Promise<Buffer> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new BadGatewayException('Mixcloud returned an empty cover image');
  }

  const chunks: Buffer[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > COVER_MAX_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new BadRequestException('Cover image is larger than the allowed size');
    }
    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks);
}

/** Validates `rawUrl`, fetches it from Mixcloud's CDN and returns the image bytes. */
export async function fetchMixcloudCover(rawUrl: string): Promise<FetchedCover> {
  const url = assertMixcloudCoverUrl(rawUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COVER_FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      signal: controller.signal,
      // A redirect could point anywhere, including back inside the network:
      // refuse rather than follow one out of the fence checked above.
      redirect: 'error',
    });
  } catch {
    throw new BadGatewayException('Could not fetch the cover image from Mixcloud');
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new BadGatewayException(`Mixcloud returned ${response.status} for the cover image`);
  }

  const contentType = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  if (!IMAGE_MIME_TYPES.includes(contentType)) {
    throw new BadRequestException(`Unsupported cover image type: ${contentType || 'unknown'}`);
  }

  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > COVER_MAX_BYTES) {
    throw new BadRequestException('Cover image is larger than the allowed size');
  }

  const buffer = await readCappedBody(response);

  return { buffer, contentType, extension: IMAGE_EXTENSIONS[contentType] };
}
