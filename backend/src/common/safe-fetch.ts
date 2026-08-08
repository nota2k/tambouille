import { BadGatewayException, BadRequestException, NotFoundException } from '@nestjs/common';
import { lookup as dnsLookup } from 'node:dns';
import { isIP } from 'node:net';
import { Agent } from 'undici';

/**
 * Fetching a URL the user chose is a request-forgery primitive. Everything in
 * this file exists to fence it in, and it is the only door such a fetch goes
 * through.
 */

/** Every refusal says this, whatever the reason. Telling "private host" apart
 *  from "no such host" would turn the import form into a network scanner. */
export const BLOCKED_ADDRESS_MESSAGE = "Cette adresse n'est pas accessible depuis Tambouille";

const MAX_REDIRECTS = 3;

/** base/bits pairs, in the notation people actually check them against. */
const BLOCKED_V4: ReadonlyArray<readonly [string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
];

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, part) => ((acc << 8) >>> 0) + Number(part), 0) >>> 0;
}

/** True for anything that is not a public unicast address — including inputs
 *  that are not addresses at all, which are refused rather than guessed at. */
export function isBlockedAddress(ip: string): boolean {
  const family = isIP(ip);

  if (family === 4) {
    const value = ipv4ToInt(ip);
    return BLOCKED_V4.some(([base, bits]) => {
      const mask = (0xffffffff << (32 - bits)) >>> 0;
      return ((value & mask) >>> 0) === ((ipv4ToInt(base) & mask) >>> 0);
    });
  }

  if (family === 6) {
    const lower = ip.toLowerCase();
    // `::ffff:10.0.0.1` is an IPv4 address wearing an IPv6 coat: unwrap it,
    // or every v4 rule above is bypassed by spelling the address differently.
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
    if (mapped) return isBlockedAddress(mapped[1]!);
    if (lower === '::1' || lower === '::') return true;
    const head = Number.parseInt(lower.split(':')[0] || '0', 16);
    if ((head & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
    if ((head & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
    return false;
  }

  return true;
}

/**
 * Validates the address undici is about to connect to, not the hostname it
 * was given. Between a DNS answer and a connection the answer can change; this
 * runs on the far side of that gap.
 */
const guardedAgent = new Agent({
  connect: {
    lookup(hostname, options, callback) {
      dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
        if (err) return callback(err, '', 0);
        const safe = (addresses as { address: string; family: number }[]).filter(
          (entry) => !isBlockedAddress(entry.address),
        );
        if (safe.length === 0) return callback(new Error(BLOCKED_ADDRESS_MESSAGE), '', 0);
        // Cast: undici's callback accepts the `all: true` array form, which
        // its published types express less precisely than `dns.lookup` does.
        (callback as unknown as (e: null, a: unknown) => void)(null, safe);
      });
    },
  },
});

function assertFetchableUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new BadRequestException("Cette adresse n'est pas une URL valide");
  }
  if (url.protocol !== 'https:') {
    // Not a matter of principle: a browser blocks http audio on an https page,
    // so an http source yields an unplayable mix. Refuse it where it can be
    // explained rather than at playback, where it cannot.
    throw new BadRequestException('La source doit être en https');
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host) && isBlockedAddress(host)) {
    throw new BadRequestException(BLOCKED_ADDRESS_MESSAGE);
  }
  return url;
}

/** Reads the body, aborting as soon as it exceeds `maxBytes`. */
export async function readCappedBody(response: Response, maxBytes: number): Promise<Buffer> {
  const reader = response.body?.getReader();
  if (!reader) throw new BadGatewayException('La source a renvoyé un corps vide');

  const chunks: Buffer[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new BadRequestException('La réponse de la source dépasse la taille autorisée');
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

/**
 * Fetches a user-supplied URL under every guard in this file.
 *
 * Redirects are followed by hand rather than with `redirect: 'follow'`, because
 * each hop must be re-validated — the guards mean nothing if hop 2 lands on
 * `169.254.169.254`. They are followed at all, unlike the Mixcloud relay's
 * `redirect: 'error'`, because podcast hosts redirect constantly and refusing
 * would fail on real feeds.
 *
 * The deadline covers the whole exchange, body included: cleared once headers
 * land, a host that answers and then stalls would hold the request open, and
 * the size cap would never trip because a stalled body sends no bytes to count.
 */
export async function safeFetch(
  rawUrl: string,
  options: { maxBytes: number; timeoutMs: number; accept?: string },
): Promise<{ url: URL; contentType: string; body: Buffer }> {
  let url = assertFetchableUrl(rawUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      let response: Response;
      try {
        response = await fetch(url.toString(), {
          signal: controller.signal,
          redirect: 'manual',
          headers: options.accept ? { accept: options.accept } : {},
          // @ts-expect-error `dispatcher` is undici's, absent from lib.dom's RequestInit
          dispatcher: guardedAgent,
        });
      } catch (err) {
        // The guarded lookup rejects by throwing, and its message is the only
        // one a caller may see about an address.
        if (err instanceof Error && err.message === BLOCKED_ADDRESS_MESSAGE) {
          throw new BadRequestException(BLOCKED_ADDRESS_MESSAGE);
        }
        throw new BadGatewayException('La source est injoignable');
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) throw new BadGatewayException('La source a renvoyé une redirection vide');
        url = assertFetchableUrl(new URL(location, url).toString());
        continue;
      }

      if (response.status === 404) {
        // Kept distinct from 502 all the way up, so a caller can tell "no such
        // item" from "the source is down" — the split the Mixcloud relay
        // already makes, and the one users notice.
        throw new NotFoundException("Cette source n'existe pas");
      }
      if (!response.ok) {
        throw new BadGatewayException(`La source a répondu ${response.status}`);
      }

      const contentType = (response.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase();
      const declared = Number(response.headers.get('content-length'));
      if (Number.isFinite(declared) && declared > options.maxBytes) {
        throw new BadRequestException('La réponse de la source dépasse la taille autorisée');
      }

      return { url, contentType, body: await readCappedBody(response, options.maxBytes) };
    }

    throw new BadGatewayException('Trop de redirections');
  } finally {
    clearTimeout(timer);
  }
}
