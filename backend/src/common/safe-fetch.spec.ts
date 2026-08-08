import { BadGatewayException, BadRequestException, HttpException, NotFoundException } from '@nestjs/common';
import { MockAgent } from 'undici';
import {
  BLOCKED_ADDRESS_MESSAGE,
  createGuardedAgent,
  filterSafeAddresses,
  guardedLookup,
  isBlockedAddress,
  rethrowBodyReadError,
  safeFetch,
  useDispatcherForTests,
} from './safe-fetch';

describe('isBlockedAddress', () => {
  it.each([
    '127.0.0.1', '127.9.9.9', '10.0.0.1', '10.255.255.254',
    '172.16.0.1', '172.31.255.255', '192.168.1.1',
    '169.254.169.254', '100.64.0.1', '0.0.0.0',
    '::1', '::', 'fc00::1', 'fd12:3456::1', 'fe80::1',
    '::ffff:127.0.0.1', '::ffff:10.0.0.1',
    'not-an-ip',
  ])('blocks %s', (ip) => {
    expect(isBlockedAddress(ip)).toBe(true);
  });

  it.each([
    '8.8.8.8', '1.1.1.1', '172.32.0.1', '172.15.255.255',
    '193.51.196.1', '2001:4860:4860::8888', '::ffff:8.8.8.8',
  ])('allows %s', (ip) => {
    expect(isBlockedAddress(ip)).toBe(false);
  });

  // Regression cases for CRITICAL 2: the WHATWG URL parser re-serialises a
  // v4-mapped IPv6 host in hex, not dotted-decimal, so a text-pattern check
  // for `::ffff:d.d.d.d` never matches what `assertFetchableUrl` actually
  // receives. These compare byte values instead, so every spelling of the
  // same address gives the same answer.
  it.each([
    // Hex form of `::ffff:169.254.169.254`, exactly as `new URL(...).hostname`
    // produces it — this is the literal bypass the reviewer demonstrated.
    '::ffff:a9fe:a9fe',
    // Hex form of `::ffff:127.0.0.1`.
    '::ffff:7f00:1',
    // Fully uncompressed v4-mapped loopback and unspecified addresses.
    '0:0:0:0:0:ffff:127.0.0.1',
    '0:0:0:0:0:0:0:1',
    // Deprecated "IPv4-compatible" form (no `ffff`): bit-for-bit identical to
    // `::1`, so it lands in the same blocked bucket.
    '::0.0.0.1',
    // Mixed-case hex must not slip past the regex-free byte parser either.
    '::FFFF:169.254.169.254',
  ])('blocks the v4-mapped/compatible form %s', (ip) => {
    expect(isBlockedAddress(ip)).toBe(true);
  });

  it('still allows a public v4-mapped address in hex form', () => {
    // Hex form of `::ffff:8.8.8.8` — confirms the byte-level check isn't
    // simply blocking every v4-mapped address outright.
    expect(isBlockedAddress('::ffff:808:808')).toBe(false);
  });

  // The other IPv6 spellings that reach an IPv4 destination. `::ffff:` is the
  // famous one, so it is the one that gets fixed; these carry an IPv4 address
  // just as literally and were still allowed after that fix.
  it.each([
    ['::/96, IPv4-compatible loopback', '::127.0.0.1'],
    ['::/96, as the URL parser re-serialises it', '::7f00:1'],
    ['::/96, IPv4-compatible metadata service', '::169.254.169.254'],
    ['::/96, ditto in hex', '::a9fe:a9fe'],
    ['NAT64 to the metadata service', '64:ff9b::a9fe:a9fe'],
    ['6to4 to the metadata service', '2002:a9fe:a9fe::1'],
    ['multicast, never a unicast peer', 'ff02::1'],
  ])('blocks %s (%s)', (_label, ip) => {
    expect(isBlockedAddress(ip)).toBe(true);
  });

  it.each(['224.0.0.1', '239.255.255.250', '240.0.0.1', '255.255.255.255', '198.18.0.1', '192.0.0.1'])(
    'blocks the non-unicast v4 address %s',
    (ip) => {
      expect(isBlockedAddress(ip)).toBe(true);
    },
  );

  // The decisive form of the assertion. Testing a hand-written string proves
  // only that the hand-written string is handled; `assertFetchableUrl` never
  // sees one, it sees whatever the WHATWG parser chose to emit. Round-tripping
  // through `new URL` is what makes these tests describe production.
  it.each([
    '::ffff:169.254.169.254',
    '::ffff:127.0.0.1',
    '::169.254.169.254',
    '::127.0.0.1',
    '0:0:0:0:0:ffff:10.0.0.1',
    '64:ff9b::a9fe:a9fe',
    '2002:a9fe:a9fe::1',
    'fe80::1',
    '::1',
  ])('blocks %s in the form the URL parser actually produces', (ip) => {
    const hostname = new URL(`https://[${ip}]/`).hostname.replace(/^\[|\]$/g, '');
    expect(isBlockedAddress(hostname)).toBe(true);
  });

  it('still allows a public address after the same round-trip', () => {
    const hostname = new URL('https://[2001:4860:4860::8888]/').hostname.replace(/^\[|\]$/g, '');
    expect(isBlockedAddress(hostname)).toBe(false);
  });
});

describe('filterSafeAddresses', () => {
  // This is the core of the DNS-rebinding defence, pulled out of the
  // `connect.lookup` hook so its decisions can be stated directly. The CRITICAL
  // 1 test below proves the connector calls it; these say what it does once
  // called, on address sets no offline resolver would ever hand back.
  it('throws the shared sentinel message when every candidate is blocked', () => {
    expect(() => filterSafeAddresses([{ address: '127.0.0.1' }, { address: '10.0.0.1' }])).toThrow(
      BLOCKED_ADDRESS_MESSAGE,
    );
  });

  it('keeps only the public address of a dual-stack host (MINOR 6)', () => {
    // Deliberate: the host isn't the threat, a private *address* is. undici
    // tries the returned candidates in order until one connects, so leaving
    // the public one in the list is what lets a legitimate dual-stack host
    // through instead of being refused outright.
    expect(filterSafeAddresses([{ address: '169.254.169.254' }, { address: '8.8.8.8' }])).toEqual([
      { address: '8.8.8.8' },
    ]);
  });

  it('passes every candidate through when all are public', () => {
    const addresses = [{ address: '8.8.8.8' }, { address: '1.1.1.1' }];
    expect(filterSafeAddresses(addresses)).toEqual(addresses);
  });
});

describe('rethrowBodyReadError', () => {
  // IMPORTANT 4 regression: before this function existed, a non-HttpException
  // thrown while streaming the body (an aborted/stalled connection) escaped
  // `safeFetch` unwrapped and became a raw 500. These prove the decision
  // logic directly, since reproducing a body that fails only *after* headers
  // have already landed isn't reliably reproducible through `MockAgent` (see
  // the function's own doc comment) and a real stalled socket would not be
  // offline.
  it('passes an HttpException through unchanged', () => {
    const capError = new BadRequestException('La réponse de la source dépasse la taille autorisée');
    expect(() => rethrowBodyReadError(capError)).toThrow(capError);
  });

  it('wraps anything else as a 502 with the generic message', () => {
    expect(() => rethrowBodyReadError(new Error('AbortError: The operation was aborted'))).toThrow(
      BadGatewayException,
    );
    expect(() => rethrowBodyReadError(new Error('boom'))).toThrow('La source est injoignable');
  });
});

/** Awaits `promise` and asserts both its exception class and its message —
 *  a mutant that throws the right class with any message, or vice-versa,
 *  must fail one of these two assertions. */
async function expectRejection(
  promise: Promise<unknown>,
  ErrorClass: new (...args: never[]) => Error,
  message: string,
): Promise<void> {
  await expect(promise).rejects.toBeInstanceOf(ErrorClass);
  await expect(promise).rejects.toThrow(message);
}

describe('safeFetch — static checks (offline, fail before any socket opens)', () => {
  it('refuses http', async () => {
    await expectRejection(
      safeFetch('http://example.org/feed.xml', { maxBytes: 1000, timeoutMs: 100 }),
      BadRequestException,
      'La source doit être en https',
    );
  });

  it('refuses a literal private address', async () => {
    await expectRejection(
      safeFetch('https://169.254.169.254/latest/meta-data/', { maxBytes: 1000, timeoutMs: 100 }),
      BadRequestException,
      BLOCKED_ADDRESS_MESSAGE,
    );
  });

  it('refuses a malformed URL', async () => {
    await expectRejection(
      safeFetch('not a url', { maxBytes: 1000, timeoutMs: 100 }),
      BadRequestException,
      "Cette adresse n'est pas une URL valide",
    );
  });

  it('refuses a bracketed v4-mapped IPv6 literal for the same blocked address (CRITICAL 2)', async () => {
    // `[::ffff:169.254.169.254]` is the metadata service, spelled so the text
    // regex the original implementation used could never match it.
    await expectRejection(
      safeFetch('https://[::ffff:169.254.169.254]/latest/meta-data/', { maxBytes: 1000, timeoutMs: 100 }),
      BadRequestException,
      BLOCKED_ADDRESS_MESSAGE,
    );
  });
});

describe('safeFetch — the guarded connector actually runs (CRITICAL 1)', () => {
  // Asserting on the rejection cannot prove this. With a dispatcher the fetch
  // refuses to accept, the request dies before the connector and `safeFetch`
  // rejects with 502 "La source est injoignable" — character for character
  // what a *working* guard produces when it refuses a host. The whole SSRF
  // defence was dead behind an indistinguishable symptom. Counting the
  // connector's calls is the only assertion that separates the two worlds.
  it('reaches connect.lookup and refuses a hostname that resolves to loopback', async () => {
    const seen: string[] = [];
    const restore = useDispatcherForTests(
      createGuardedAgent((hostname, options, callback) => {
        seen.push(hostname);
        guardedLookup(hostname, options, callback);
      }),
    );

    try {
      // `localhost` is not a literal IP, so it gets past the static check and
      // has to be stopped by the DNS guard instead. Resolving it reads the
      // hosts file; no packet leaves the machine, and no socket is opened
      // because the guard refuses before a connection is attempted.
      await expectRejection(
        safeFetch('https://localhost/', { maxBytes: 1000, timeoutMs: 2000 }),
        BadGatewayException,
        'La source est injoignable',
      );
    } finally {
      restore();
    }

    expect(seen).toEqual(['localhost']);
  });
});

describe('safeFetch — blocked and unreachable stay indistinguishable (IMPORTANT 3)', () => {
  // The global constraint, asserted instead of merely commented. `err.cause`
  // holds the real reason for both of these and it is deliberately never read:
  // answering 400 "private address" for one and 502 "unreachable" for the other
  // would tell an attacker, for any hostname they care to submit, whether it
  // exists inside our network. Anyone who "improves" the catch by unwrapping
  // the cause breaks this test, which is exactly what it is here for.
  const refuseWith = async (error: Error) => {
    const restore = useDispatcherForTests(
      createGuardedAgent((_hostname, _options, callback) => callback(error, '', 0)),
    );
    try {
      await safeFetch('https://private.test/feed.xml', { maxBytes: 1000, timeoutMs: 1000 });
    } catch (err) {
      const httpError = err as HttpException;
      return { status: httpError.getStatus(), message: httpError.message };
    } finally {
      restore();
    }
    throw new Error('expected safeFetch to reject');
  };

  it('answers identically for a host the guard refused and a host that does not exist', async () => {
    const blocked = await refuseWith(new Error(BLOCKED_ADDRESS_MESSAGE));
    const missing = await refuseWith(
      Object.assign(new Error('getaddrinfo ENOTFOUND private.test'), { code: 'ENOTFOUND' }),
    );

    expect(blocked).toEqual(missing);
    expect(blocked).toEqual({ status: 502, message: 'La source est injoignable' });
  });
});

describe('safeFetch — via MockAgent (offline, no socket, no DNS)', () => {
  let mockAgent: MockAgent;
  let restore: () => void;

  beforeEach(() => {
    mockAgent = new MockAgent();
    // Belt and braces: any request this test forgets to intercept fails
    // loudly instead of silently reaching a real network.
    mockAgent.disableNetConnect();
    restore = useDispatcherForTests(mockAgent);
  });

  afterEach(async () => {
    restore();
    await mockAgent.close();
  });

  const ORIGIN = 'https://example.test';

  it('fetches successfully through the guarded dispatcher shape (undici-to-undici compatibility)', async () => {
    mockAgent
      .get(ORIGIN)
      .intercept({ path: '/mix.mp3', method: 'GET' })
      .reply(200, Buffer.from('id3-ish-bytes'), { headers: { 'content-type': 'audio/mpeg; charset=binary' } });

    const result = await safeFetch(`${ORIGIN}/mix.mp3`, { maxBytes: 1000, timeoutMs: 1000 });

    expect(result.url.toString()).toBe(`${ORIGIN}/mix.mp3`);
    expect(result.contentType).toBe('audio/mpeg');
    expect(result.body.toString()).toBe('id3-ish-bytes');
  });

  it('re-validates and follows a redirect to its final URL', async () => {
    mockAgent
      .get(ORIGIN)
      .intercept({ path: '/old.xml', method: 'GET' })
      .reply(301, '', { headers: { location: `${ORIGIN}/new.xml` } });
    mockAgent
      .get(ORIGIN)
      .intercept({ path: '/new.xml', method: 'GET' })
      .reply(200, '<rss></rss>', { headers: { 'content-type': 'application/rss+xml' } });

    const result = await safeFetch(`${ORIGIN}/old.xml`, { maxBytes: 1000, timeoutMs: 1000 });

    expect(result.url.toString()).toBe(`${ORIGIN}/new.xml`);
    expect(result.body.toString()).toBe('<rss></rss>');
  });

  it('gives up after too many redirects', async () => {
    mockAgent
      .get(ORIGIN)
      .intercept({ path: '/loop.xml', method: 'GET' })
      .reply(302, '', { headers: { location: `${ORIGIN}/loop.xml` } })
      .persist();

    await expectRejection(
      safeFetch(`${ORIGIN}/loop.xml`, { maxBytes: 1000, timeoutMs: 1000 }),
      BadGatewayException,
      'Trop de redirections',
    );
  });

  it('refuses a redirect to http', async () => {
    mockAgent
      .get(ORIGIN)
      .intercept({ path: '/to-http.xml', method: 'GET' })
      .reply(302, '', { headers: { location: 'http://insecure.example/feed.xml' } });

    await expectRejection(
      safeFetch(`${ORIGIN}/to-http.xml`, { maxBytes: 1000, timeoutMs: 1000 }),
      BadRequestException,
      'La source doit être en https',
    );
  });

  it('refuses a redirect to a blocked address', async () => {
    mockAgent
      .get(ORIGIN)
      .intercept({ path: '/to-metadata.xml', method: 'GET' })
      .reply(302, '', { headers: { location: 'https://169.254.169.254/latest/meta-data/' } });

    await expectRejection(
      safeFetch(`${ORIGIN}/to-metadata.xml`, { maxBytes: 1000, timeoutMs: 1000 }),
      BadRequestException,
      BLOCKED_ADDRESS_MESSAGE,
    );
  });

  it('refuses a redirect with no Location header', async () => {
    mockAgent.get(ORIGIN).intercept({ path: '/empty-redirect.xml', method: 'GET' }).reply(302, '');

    await expectRejection(
      safeFetch(`${ORIGIN}/empty-redirect.xml`, { maxBytes: 1000, timeoutMs: 1000 }),
      BadGatewayException,
      'La source a renvoyé une redirection vide',
    );
  });

  it('refuses a malformed Location header instead of throwing a raw TypeError (IMPORTANT 5)', async () => {
    mockAgent
      .get(ORIGIN)
      .intercept({ path: '/bad-redirect.xml', method: 'GET' })
      .reply(302, '', { headers: { location: 'https://[not-a-valid-host]/' } });

    await expectRejection(
      safeFetch(`${ORIGIN}/bad-redirect.xml`, { maxBytes: 1000, timeoutMs: 1000 }),
      BadGatewayException,
      'La source a renvoyé une redirection invalide',
    );
  });

  it('refuses a source that declares a body larger than the cap', async () => {
    mockAgent
      .get(ORIGIN)
      .intercept({ path: '/huge-declared.mp3', method: 'GET' })
      .reply(200, Buffer.from('short'), {
        headers: { 'content-type': 'audio/mpeg', 'content-length': '999999' },
      });

    await expectRejection(
      safeFetch(`${ORIGIN}/huge-declared.mp3`, { maxBytes: 10, timeoutMs: 1000 }),
      BadRequestException,
      'La réponse de la source dépasse la taille autorisée',
    );
  });

  it('refuses a source whose actual body exceeds the cap even when it under-declares Content-Length', async () => {
    // The declared-size check alone would miss this: the header lies short,
    // so only counting real streamed bytes in `readCappedBody` catches it.
    mockAgent
      .get(ORIGIN)
      .intercept({ path: '/lying-length.mp3', method: 'GET' })
      .reply(200, Buffer.alloc(500, 'x'), {
        headers: { 'content-type': 'audio/mpeg', 'content-length': '5' },
      });

    await expectRejection(
      safeFetch(`${ORIGIN}/lying-length.mp3`, { maxBytes: 50, timeoutMs: 1000 }),
      BadRequestException,
      'La réponse de la source dépasse la taille autorisée',
    );
  });

  it('turns 404 into NotFoundException, distinct from other upstream failures', async () => {
    mockAgent.get(ORIGIN).intercept({ path: '/missing.xml', method: 'GET' }).reply(404, '');

    await expectRejection(
      safeFetch(`${ORIGIN}/missing.xml`, { maxBytes: 1000, timeoutMs: 1000 }),
      NotFoundException,
      "Cette source n'existe pas",
    );
  });

  it('turns a non-404 error status into BadGatewayException', async () => {
    mockAgent.get(ORIGIN).intercept({ path: '/broken.xml', method: 'GET' }).reply(500, '');

    await expectRejection(
      safeFetch(`${ORIGIN}/broken.xml`, { maxBytes: 1000, timeoutMs: 1000 }),
      BadGatewayException,
      'La source a répondu 500',
    );
  });
});

// A mutant that throws `BadRequestException` on the very first line of
// `safeFetch` would still pass every offline "refuses ..." test above — none
// of them distinguish *why* the call failed from *whether* it failed loudly
// enough. This guards against exactly that: a case that must resolve, not
// reject, so replacing any part of the guard logic with an unconditional
// throw breaks it.
describe('safeFetch — sanity: the guards do not block everything', () => {
  it('does not reject a normal https URL outright', async () => {
    const mockAgent = new MockAgent();
    mockAgent.disableNetConnect();
    mockAgent
      .get('https://example.test')
      .intercept({ path: '/ok.mp3', method: 'GET' })
      .reply(200, Buffer.from('ok'), { headers: { 'content-type': 'audio/mpeg' } });
    const restore = useDispatcherForTests(mockAgent);

    try {
      await expect(
        safeFetch('https://example.test/ok.mp3', { maxBytes: 1000, timeoutMs: 1000 }),
      ).resolves.toMatchObject({ contentType: 'audio/mpeg', body: Buffer.from('ok') });
    } finally {
      restore();
      await mockAgent.close();
    }
  });
});

describe('assertFetchableUrl error types (via safeFetch, exception-class only)', () => {
  it('rejects every static-check case with an HttpException, never a raw error', async () => {
    const rejectionCases = [
      'http://example.org/feed.xml',
      'https://169.254.169.254/',
      'not a url',
      'https://[::ffff:169.254.169.254]/',
    ];
    for (const rawUrl of rejectionCases) {
      await expect(safeFetch(rawUrl, { maxBytes: 1000, timeoutMs: 100 })).rejects.toBeInstanceOf(HttpException);
    }
  });
});
