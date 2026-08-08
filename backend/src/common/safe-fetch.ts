import { BadGatewayException, BadRequestException, HttpException, NotFoundException } from '@nestjs/common';
import { lookup as dnsLookup, type LookupAddress, type LookupOptions } from 'node:dns';
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

/**
 * The refusal for an address written literally into the URL, and the sentinel
 * the DNS guard fails with internally.
 *
 * It may be this specific precisely because it is only ever shown for the
 * pre-flight case, which happens before any lookup and therefore tells the
 * caller nothing except what they already typed. Every refusal that happens
 * *after* the network is involved gets the single generic message instead — see
 * the catch in `safeFetch`.
 */
export const BLOCKED_ADDRESS_MESSAGE = "Cette adresse n'est pas accessible depuis Tambouille";

const MAX_REDIRECTS = 3;

/** base/bits pairs, in the notation people actually check them against. */
const BLOCKED_V4: ReadonlyArray<readonly [string, number]> = [
  ['0.0.0.0', 8], // "this network"
  ['10.0.0.0', 8], // RFC1918
  ['100.64.0.0', 10], // CGNAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local, and the cloud metadata service with it
  ['172.16.0.0', 12], // RFC1918
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.168.0.0', 16], // RFC1918
  ['198.18.0.0', 15], // benchmarking
  ['224.0.0.0', 4], // multicast — never a unicast peer
  ['240.0.0.0', 4], // reserved, and 255.255.255.255 with it
];

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, part) => ((acc << 8) >>> 0) + Number(part), 0) >>> 0;
}

function isBlockedV4(ip: string): boolean {
  const value = ipv4ToInt(ip);
  return BLOCKED_V4.some(([base, bits]) => {
    const mask = (0xffffffff << (32 - bits)) >>> 0;
    return ((value & mask) >>> 0) === ((ipv4ToInt(base) & mask) >>> 0);
  });
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

/**
 * Applies the IPv6 rules to the 16 bytes, never to a spelling of them.
 *
 * Several of these prefixes carry an IPv4 destination inside them. A packet
 * addressed to one arrives at that IPv4 host, so the address has to be judged
 * by what it embeds rather than by its own prefix — otherwise the v4 table
 * above is bypassed simply by writing the address in the other family.
 */
function isBlockedV6(bytes: number[]): boolean {
  const zeroBetween = (from: number, to: number) => bytes.slice(from, to).every((b) => b === 0);
  const embeddedV4 = (at: number) => isBlockedV4(bytes.slice(at, at + 4).join('.'));

  // `::ffff:0:0/96` — an IPv4 address wearing an IPv6 coat.
  if (zeroBetween(0, 10) && bytes[10] === 0xff && bytes[11] === 0xff) return embeddedV4(12);

  // `::/96` — the unspecified address `::`, the loopback `::1` and the whole
  // deprecated "IPv4-compatible" family live in here, and none of them is a
  // public host. Enumerating just `::` and `::1` is not enough: the URL parser
  // hands `[::169.254.169.254]` over as `::a9fe:a9fe`, which matches neither
  // name, so the metadata service walks through one spelling further out.
  if (zeroBetween(0, 12)) return true;

  // `64:ff9b::/96` (NAT64) and `2002::/16` (6to4) are IPv4 destinations wearing
  // a native-looking IPv6 prefix; judge them by the address they carry.
  if (bytes[0] === 0x00 && bytes[1] === 0x64 && bytes[2] === 0xff && bytes[3] === 0x9b && zeroBetween(4, 12)) {
    return embeddedV4(12);
  }
  if (bytes[0] === 0x20 && bytes[1] === 0x02) return embeddedV4(2);

  if ((bytes[0] & 0xfe) === 0xfc) return true; // fc00::/7 unique-local
  if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) return true; // fe80::/10 link-local
  if (bytes[0] === 0xff) return true; // ff00::/8 multicast — never a unicast peer
  return false;
}

/** True for anything that is not a public unicast address — including inputs
 *  that are not addresses at all, which are refused rather than guessed at. */
export function isBlockedAddress(ip: string): boolean {
  const family = isIP(ip);

  if (family === 4) return isBlockedV4(ip);

  if (family === 6) {
    const bytes = parseIPv6(ip);
    // `isIP` already accepted it, so failing to expand it means this file does
    // not understand the address. Refuse what it cannot judge.
    if (!bytes) return true;
    return isBlockedV6(bytes);
  }

  return true;
}

/**
 * Given the full address set `dns.lookup(..., { all: true })` returned for a
 * hostname, returns the ones safe to connect to, or throws if none are.
 *
 * Filters, rather than rejecting the whole name as soon as one candidate is
 * blocked: a legitimate dual-stack host whose AAAA happens to be link-local
 * must still be reachable over its public address. The host is not the threat,
 * a private *address* is.
 *
 * Filtering is not a weaker check than rejecting. `net` connects to exactly the
 * list returned here and never re-resolves, so an address dropped here is one
 * no socket in this request can reach — there is no window between the decision
 * and the connection for the answer to change back.
 *
 * Pulled out of the `connect.lookup` hook below so its decisions can be stated
 * directly on address sets no offline resolver would hand back.
 */
export function filterSafeAddresses(addresses: readonly { address: string }[]): { address: string }[] {
  const safe = addresses.filter((entry) => !isBlockedAddress(entry.address));
  if (safe.length === 0) throw new Error(BLOCKED_ADDRESS_MESSAGE);
  return safe;
}

export type GuardedLookup = (
  hostname: string,
  options: LookupOptions,
  callback: (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void,
) => void;

/**
 * Validates the address undici is about to connect to, not the hostname it
 * was given. Between a DNS answer and a connection the answer can change; this
 * runs on the far side of that gap.
 */
export const guardedLookup: GuardedLookup = (hostname, options, callback) => {
  const all: LookupOptions & { all: true } = { ...options, all: true };
  dnsLookup(hostname, all, (err, addresses) => {
    if (err) return callback(err, '', 0);
    let safe: LookupAddress[];
    try {
      safe = filterSafeAddresses(addresses) as LookupAddress[];
    } catch (filterErr) {
      return callback(filterErr as NodeJS.ErrnoException, '', 0);
    }
    callback(null, safe);
  });
};

/**
 * Builds the dispatcher every outgoing request rides on, with the guard wired
 * into its connector.
 *
 * `lookup` is a parameter only so a test can wrap `guardedLookup` in a counter
 * and prove the connector actually calls it. That proof matters more than it
 * looks: the whole defence was once dead because `fetch` rejected the
 * dispatcher before reaching the connector, and every observable symptom of
 * that — the refusal's status and message — was identical to a working guard
 * refusing a blocked host. Only counting the calls tells the two apart.
 */
export function createGuardedAgent(lookup: GuardedLookup = guardedLookup): Agent {
  return new Agent({ connect: { lookup } });
}

let dispatcher: Dispatcher = createGuardedAgent();

/**
 * Swaps the dispatcher and returns a function that restores the guarded one.
 *
 * The redirect loop, the hop limit, the size caps and the body-read failure are
 * only reachable with a server on the other end, and nothing here may open a
 * socket in a test; undici's `MockAgent` stands in for one.
 *
 * It is a module-level seam rather than a field on `safeFetch`'s options
 * because this function's whole value is that a caller *cannot* opt out of the
 * guard. An options field spelled `dispatcher?` is an unguarded fetch one
 * autocomplete away, in the one place in the codebase where that must be
 * impossible.
 */
export function useDispatcherForTests(next: Dispatcher): () => void {
  const previous = dispatcher;
  dispatcher = next;
  return () => {
    dispatcher = previous;
  };
}

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
  options: { maxBytes: number; timeoutMs: number; accept?: string },
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
          dispatcher,
        });
      } catch {
        // The error is not even bound here, let alone inspected, and that is
        // the point. `fetch` wraps every network-layer failure — the guard's
        // refusal, ENOTFOUND, ECONNREFUSED, our own deadline — in a generic
        // `TypeError: fetch failed`, with the real reason sitting in
        // `err.cause`. Reading it to answer 400 "private address" for one and
        // 502 "unreachable" for another would tell whoever pasted the URL, for
        // any hostname they care to submit, whether that name exists inside our
        // network. That is the scanner this file exists to not be. Every
        // failure at this layer collapses onto one status and one message on
        // purpose: the lost detail IS the feature. Do not "improve" this by
        // unwrapping the cause.
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
