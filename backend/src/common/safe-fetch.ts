import { BadGatewayException, BadRequestException, HttpException, NotFoundException } from '@nestjs/common';
import { lookup as dnsLookup } from 'node:dns';
import { isIP } from 'node:net';
import { Agent, fetch as undiciFetch, type Dispatcher } from 'undici';

/**
 * Fetching a URL the user chose is a request-forgery primitive. Everything in
 * this file exists to fence it in, and it is the only door such a fetch goes
 * through.
 *
 * `fetch` is imported from `undici` explicitly rather than using Node's
 * global `fetch`: both are undici under the hood, but Node embeds its own
 * copy, and passing an `Agent` from the `undici` dependency into Node's
 * built-in `fetch` fails (the two undici versions' internal dispatcher
 * handler contracts don't match — `fetch` throws before a socket opens). The
 * `fetch` and the `Agent` must come from the same undici, so both do here.
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

/**
 * Parses any valid textual IPv6 address — compressed (`::1`), uncompressed
 * (`0:0:0:0:0:0:0:1`), or with an embedded dotted-decimal IPv4 tail
 * (`::ffff:127.0.0.1`) — into its 16 bytes, or returns null if it doesn't
 * parse.
 *
 * This exists because the WHATWG URL parser normalises IPv6 hosts into their
 * hex canonical form before `isBlockedAddress` ever sees them —
 * `::ffff:169.254.169.254` becomes `::ffff:a9fe:a9fe` in `url.hostname` — so
 * a check that pattern-matches the dotted-decimal text only catches the
 * address when it is spelled one particular way. Comparing the actual bytes
 * is what makes every spelling of the same address collapse onto the same
 * answer.
 */
function parseIPv6(ip: string): number[] | null {
  const withoutZone = ip.split('%')[0]!;
  const doubleColon = withoutZone.indexOf('::');
  if (doubleColon !== -1 && withoutZone.indexOf('::', doubleColon + 1) !== -1) return null;

  const [headText, tailText] =
    doubleColon === -1 ? [withoutZone, ''] : [withoutZone.slice(0, doubleColon), withoutZone.slice(doubleColon + 2)];

  const expand = (text: string): string[] | null => {
    if (text === '') return [];
    const groups = text.split(':');
    const last = groups[groups.length - 1]!;
    if (!last.includes('.')) return groups;
    // The last group is a dotted-decimal IPv4 tail: fold it into two 16-bit
    // hex groups so the rest of this function only ever deals with plain
    // IPv6 groups.
    const octets = last.split('.');
    if (octets.length !== 4) return null;
    const values = octets.map(Number);
    if (values.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return null;
    const hi = ((values[0]! << 8) | values[1]!).toString(16);
    const lo = ((values[2]! << 8) | values[3]!).toString(16);
    return [...groups.slice(0, -1), hi, lo];
  };

  const head = expand(headText);
  const tail = expand(tailText);
  if (head === null || tail === null) return null;

  const total = head.length + tail.length;
  if (doubleColon === -1 ? total !== 8 : total > 7) return null;

  const groups = doubleColon === -1 ? head : [...head, ...new Array(8 - total).fill('0'), ...tail];
  if (groups.length !== 8) return null;

  const bytes: number[] = [];
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/i.test(group)) return null;
    const value = Number.parseInt(group, 16);
    bytes.push((value >> 8) & 0xff, value & 0xff);
  }
  return bytes;
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
    const bytes = parseIPv6(ip);
    if (!bytes) return true; // Unparsable — refuse rather than guess.

    const isV4Mapped = bytes.slice(0, 10).every((b) => b === 0) && bytes[10] === 0xff && bytes[11] === 0xff;
    if (isV4Mapped) {
      // `::ffff:0:0/96`: an IPv4 address wearing an IPv6 coat. Unwrap it and
      // re-run the v4 rules, or every rule above is bypassed by spelling the
      // same address in the other family.
      return isBlockedAddress(bytes.slice(12).join('.'));
    }

    if (bytes.every((b) => b === 0)) return true; // `::` unspecified
    if (bytes.slice(0, 15).every((b) => b === 0) && bytes[15] === 1) return true; // `::1` loopback
    if ((bytes[0] & 0xfe) === 0xfc) return true; // fc00::/7 unique-local
    if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) return true; // fe80::/10 link-local
    return false;
  }

  return true;
}

/**
 * Given the full address set `dns.lookup(..., { all: true })` returned for a
 * hostname, returns the ones safe to connect to, or throws if none are.
 *
 * Rejects only when every candidate is blocked, not when any one is: a
 * dual-stack host with one public and one private address is left free to
 * connect over the public one. That's deliberate, not an oversight — the
 * host itself isn't a threat, only a private *address* is, and undici will
 * try the returned addresses in order until one connects.
 *
 * Pulled out of the `connect.lookup` hook below so it can be unit-tested on
 * its own: `safeFetch`'s public surface can't be used to prove this filter
 * runs, because every hostname that would demonstrate it — one actually
 * resolving to a private address — is refused earlier by the OS resolver or
 * is a case (like `127.0.0.1` or `localhost`) this file already blocks by
 * the static literal-address check, before DNS is ever consulted.
 */
export function filterSafeAddresses(addresses: readonly { address: string }[]): { address: string }[] {
  const safe = addresses.filter((entry) => !isBlockedAddress(entry.address));
  if (safe.length === 0) throw new Error(BLOCKED_ADDRESS_MESSAGE);
  return safe;
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
        let safe: { address: string; family: number }[];
        try {
          safe = filterSafeAddresses(addresses as { address: string; family: number }[]) as {
            address: string;
            family: number;
          }[];
        } catch (filterErr) {
          return callback(filterErr as Error, '', 0);
        }
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

type UndiciResponse = Awaited<ReturnType<typeof undiciFetch>>;

/** Reads the body, aborting as soon as it exceeds `maxBytes`. */
export async function readCappedBody(response: UndiciResponse, maxBytes: number): Promise<Buffer> {
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
 * Turns whatever `readCappedBody` throws into something a caller may see.
 *
 * The size cap and the empty-body case already throw the right
 * `HttpException` themselves and are passed straight through unchanged.
 * Anything else here is the connection dying mid-body — our own deadline
 * firing, or the host stalling — and must not escape `safeFetch` as a raw
 * `AbortError` with no HTTP status attached, the way it did before this
 * function existed.
 *
 * Pulled out to its own function, rather than inlined in `safeFetch`'s
 * catch block, so this decision can be unit-tested directly: reproducing a
 * body that fails only *after* headers have already been sent isn't
 * reliably doable through `undici`'s `MockAgent` (it either delivers a
 * reply's body in full or fails the request before headers, never a
 * failure partway through), and manufacturing a real stalled connection
 * would mean standing up a real socket, which offline tests must not do.
 */
export function rethrowBodyReadError(err: unknown): never {
  if (err instanceof HttpException) throw err;
  throw new BadGatewayException('La source est injoignable');
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
  options: { maxBytes: number; timeoutMs: number; accept?: string; dispatcher?: Dispatcher },
): Promise<{ url: URL; contentType: string; body: Buffer }> {
  let url = assertFetchableUrl(rawUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      let response: UndiciResponse;
      try {
        response = await undiciFetch(url.toString(), {
          signal: controller.signal,
          redirect: 'manual',
          headers: options.accept ? { accept: options.accept } : {},
          // Only ever overridden in tests, to swap in undici's `MockAgent` and
          // exercise the redirect loop, hop limit and size caps without a
          // real socket or DNS lookup. Production callers never set this, so
          // they always get the guarded agent below.
          dispatcher: options.dispatcher ?? guardedAgent,
        });
      } catch (err) {
        // `fetch` wraps every network-layer failure — including the guarded
        // lookup's rejection — in a generic `TypeError: fetch failed`, with
        // the real reason under `err.cause`. That is left unexamined on
        // purpose: unwrapping it to tell "resolved to a private address"
        // apart from "no such host" or "connection refused" would turn the
        // import form into an oracle for probing which internal hostnames
        // exist. Every failure at this layer collapses onto one status and
        // one message, deliberately — do not "improve" this by inspecting
        // `err.cause`.
        throw new BadGatewayException('La source est injoignable');
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) throw new BadGatewayException('La source a renvoyé une redirection vide');
        let nextRawUrl: string;
        try {
          nextRawUrl = new URL(location, url).toString();
        } catch {
          // A malformed Location is the remote server's fault, not a bug in
          // our validation — surface it as an upstream failure, not a raw
          // parse error with our stack trace attached.
          throw new BadGatewayException('La source a renvoyé une redirection invalide');
        }
        url = assertFetchableUrl(nextRawUrl);
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

      let body: Buffer;
      try {
        body = await readCappedBody(response, options.maxBytes);
      } catch (err) {
        rethrowBodyReadError(err);
      }

      return { url, contentType, body };
    }

    throw new BadGatewayException('Trop de redirections');
  } finally {
    clearTimeout(timer);
  }
}
