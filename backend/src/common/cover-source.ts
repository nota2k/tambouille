import { BadRequestException } from '@nestjs/common';
import {
  COVER_MAX_BYTES,
  IMAGE_EXTENSIONS,
  IMAGE_MIME_TYPES,
} from './mime.constants';
import { safeFetch } from './safe-fetch';

/**
 * This used to accept only `.mixcloud.com` hosts, and lived under `mixcloud/`.
 * That allow-list cannot survive "import from any feed", so it is replaced by
 * `safeFetch`'s address check — the one guard this feature deliberately
 * widens, and the reason the file moved here.
 *
 * What `safeFetch` brings in exchange is strictly more than the allow-list
 * covered: https only, private and link-local addresses refused against the
 * address actually connected to rather than the hostname, redirects followed
 * manually and re-validated at every hop, and a deadline that stays armed for
 * the body read. What stays local is the part that is about images and not
 * about the network: the MIME allow-list below.
 */

const COVER_FETCH_TIMEOUT_MS = 10_000;

export interface FetchedCover {
  buffer: Buffer;
  contentType: string;
  extension: string;
}

export async function fetchCover(rawUrl: string): Promise<FetchedCover> {
  const { contentType, body } = await safeFetch(rawUrl, {
    maxBytes: COVER_MAX_BYTES,
    timeoutMs: COVER_FETCH_TIMEOUT_MS,
    accept: 'image/*',
  });

  // `safeFetch` already stripped the parameters and lowercased the value, so
  // this compares the bare type against the allow-list.
  if (!IMAGE_MIME_TYPES.includes(contentType)) {
    throw new BadRequestException(
      `Type de pochette non pris en charge : ${contentType || 'inconnu'}`,
    );
  }

  return { buffer: body, contentType, extension: IMAGE_EXTENSIONS[contentType]! };
}
