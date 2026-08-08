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
