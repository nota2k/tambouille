import {
  BadGatewayException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  MixcloudService,
  parseSections,
  pickPictureUrl,
  readArtist,
  toCloudcastImport,
  toCloudcastSummary,
  withArtistTag,
} from './mixcloud.service';

/**
 * `fetch` is mocked throughout: these cover the relay's own rules — the two
 * path-injection guards, the translation into Tambouille's shape, the
 * defensive section parser and how upstream failures are reported — and make
 * no network call.
 *
 * The mock is given a *valid* default response in `beforeEach` on purpose. A
 * guard test must fail because the guard is gone, not because an unmocked call
 * threw on `undefined`; with a working default, deleting a guard lets the call
 * succeed and the "rejects" assertion is what fails.
 */

const originalFetch = global.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * A response whose headers have landed but whose body never yields a byte —
 * the shape a host takes to hold a request open. The stream only ever ends if
 * the request's own deadline aborts it, which is exactly what is under test.
 */
function stalledBodyResponse(signal: AbortSignal): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      signal.addEventListener('abort', () => {
        controller.error(
          Object.assign(new Error('The operation was aborted'), {
            name: 'AbortError',
          }),
        );
      });
    },
  });

  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

/** Comfortably past the service's own REQUEST_TIMEOUT_MS. */
const PAST_THE_DEADLINE_MS = 30_000;

function cloudcastFixture(overrides: Record<string, unknown> = {}) {
  return {
    key: '/Notamusic/vorwerk-7-passages-pas-sages/',
    url: 'https://www.mixcloud.com/Notamusic/vorwerk-7-passages-pas-sages/',
    name: 'Vorwerk #7 / Passages Pas Sages',
    slug: 'vorwerk-7-passages-pas-sages',
    tags: [
      {
        key: '/genres/italo-disco/',
        url: 'https://www.mixcloud.com/genres/italo-disco/',
        name: 'Italo disco',
      },
      {
        key: '/genres/new-wave/',
        url: 'https://www.mixcloud.com/genres/new-wave/',
        name: 'New wave',
      },
    ],
    created_time: '2022-05-26T01:41:02Z',
    audio_length: 2889,
    pictures: {
      small: 'https://thumbnailer.mixcloud.com/unsafe/25x25/x',
      large: 'https://thumbnailer.mixcloud.com/unsafe/300x300/x',
      extra_large: 'https://thumbnailer.mixcloud.com/unsafe/600x600/x',
      '1024wx1024h': 'https://thumbnailer.mixcloud.com/unsafe/1024x1024/x',
    },
    ...overrides,
  };
}

describe('MixcloudService', () => {
  let fetchMock: jest.Mock;
  let service: MixcloudService;

  beforeEach(() => {
    fetchMock = jest
      .fn()
      .mockResolvedValue(jsonResponse({ data: [cloudcastFixture()] }));
    global.fetch = fetchMock as unknown as typeof fetch;
    service = new MixcloudService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  function requestedUrl(): string {
    return fetchMock.mock.calls[0][0] as string;
  }

  describe('the username guard', () => {
    it.each([
      ['an empty username', ''],
      ['a path separator', 'Notamusic/../admin'],
      ['a leading slash', '/Notamusic'],
      ['a space', 'Nota music'],
      ['a query string', 'Notamusic?limit=1'],
      ['a percent escape', 'Notamusic%2f..'],
      ['an at sign, which would move the host', 'Notamusic@evil.com'],
      ['a dot, which api.mixcloud.com does not use in usernames', 'nota.music'],
      ['more than 64 characters', 'a'.repeat(65)],
    ])('rejects %s without making a request', async (_label, username) => {
      await expect(service.listCloudcasts(username)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each([
      ['Notamusic'],
      ['nota_music'],
      ['nota-music-2'],
      ['a'],
      ['a'.repeat(64)],
    ])('accepts %s', async (username) => {
      await expect(service.listCloudcasts(username)).resolves.toBeDefined();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('calls the documented upstream listing URL', async () => {
      await service.listCloudcasts('Notamusic');
      expect(requestedUrl()).toBe(
        'https://api.mixcloud.com/Notamusic/cloudcasts/?limit=50',
      );
    });
  });

  describe('the key guard', () => {
    it.each([
      ['an empty key', ''],
      ['a key with no leading slash', 'Notamusic/vorwerk-7/'],
      ['a key with no trailing slash', '/Notamusic/vorwerk-7'],
      ['a key with only one segment', '/Notamusic/'],
      ['a key with three segments', '/Notamusic/vorwerk-7/extra/'],
      ['a protocol-relative host', '//evil.com/path/'],
      ['an absolute URL', 'https://evil.com/a/b/'],
      ['a query string', '/Notamusic/vorwerk-7/?callback=x'],
      ['a space', '/Notamusic/vorwerk 7/'],
      ['a percent escape', '/Notamusic/%2e%2e%2f/'],
    ])('rejects %s without making a request', async (_label, key) => {
      await expect(service.getCloudcast(key)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each([
      ['/Notamusic/vorwerk-7-passages-pas-sages/'],
      ['/nota_music/mix.v2/'],
      ['/a/b/'],
    ])('accepts %s', async (key) => {
      fetchMock.mockResolvedValue(jsonResponse(cloudcastFixture()));
      await expect(service.getCloudcast(key)).resolves.toBeDefined();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    /**
     * Mixcloud percent-encodes non-ASCII slugs, so the pattern admits escapes
     * of bytes >= 0x80 and nothing else. That boundary is the subtlest rule in
     * the file, so it is pinned from both sides here.
     */
    describe('percent-escapes in the slug', () => {
      it('accepts a real key carrying a UTF-8 escape', async () => {
        fetchMock.mockResolvedValue(jsonResponse(cloudcastFixture()));
        const key = '/Notamusic/antimythes-i-emission-ou%C3%AFedire-34/';

        await expect(service.getCloudcast(key)).resolves.toBeDefined();
        expect(requestedUrl()).toBe(
          'https://api.mixcloud.com/Notamusic/antimythes-i-emission-ou%C3%AFedire-34/',
        );
      });

      it.each([
        ['a traversal sequence', '/Notamusic/%2e%2e%2f/'],
        ['the same traversal in uppercase hex', '/Notamusic/%2E%2E%2F/'],
        ['an escaped slash', '/Notamusic/vorwerk%2f..%2fadmin/'],
        ['an escaped backslash', '/Notamusic/vorwerk%5c/'],
        ['an escaped dot', '/Notamusic/%2e%2e/'],
        ['a NUL byte', '/Notamusic/vorwerk%00/'],
        ['an escape of the last ASCII byte', '/Notamusic/vorwerk%7f/'],
        ['a lone percent sign', '/Notamusic/vorwerk%/'],
        ['an escape with a single hex digit', '/Notamusic/vorwerk%C/'],
        ['a truncated UTF-8 sequence', '/Notamusic/vorwerk%C3/'],
      ])('rejects %s without making a request', async (_label, key) => {
        await expect(service.getCloudcast(key)).rejects.toBeInstanceOf(
          BadRequestException,
        );
        expect(fetchMock).not.toHaveBeenCalled();
      });
    });

    it('calls the upstream cloudcast URL built from the key', async () => {
      fetchMock.mockResolvedValue(jsonResponse(cloudcastFixture()));
      await service.getCloudcast('/Notamusic/vorwerk-7-passages-pas-sages/');
      expect(requestedUrl()).toBe(
        'https://api.mixcloud.com/Notamusic/vorwerk-7-passages-pas-sages/',
      );
    });
  });

  describe('listing cloudcasts', () => {
    it('maps a cloudcast onto the summary shape', async () => {
      const [summary] = await service.listCloudcasts('Notamusic');
      expect(summary).toEqual({
        key: '/Notamusic/vorwerk-7-passages-pas-sages/',
        name: 'Vorwerk #7 / Passages Pas Sages',
        tags: ['Italo disco', 'New wave'],
        pictureUrl: 'https://thumbnailer.mixcloud.com/unsafe/1024x1024/x',
        audioLengthSec: 2889,
        createdAt: '2022-05-26T01:41:02Z',
      });
    });

    it('returns an empty list when the payload carries no data array', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ paging: {} }));
      await expect(service.listCloudcasts('Notamusic')).resolves.toEqual([]);
    });
  });

  describe('mapping a cloudcast for the upload form', () => {
    it('produces the shape the form consumes', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          cloudcastFixture({
            description: 'Une heure de disco italienne.',
            sections: [],
          }),
        ),
      );

      await expect(
        service.getCloudcast('/Notamusic/vorwerk-7-passages-pas-sages/'),
      ).resolves.toEqual({
        title: 'Vorwerk #7 / Passages Pas Sages',
        description: 'Une heure de disco italienne.',
        tags: ['Italo disco', 'New wave'],
        coverSourceUrl: 'https://thumbnailer.mixcloud.com/unsafe/1024x1024/x',
        tracklist: [],
      });
    });

    it('falls back to an empty description when Mixcloud omits one', () => {
      expect(toCloudcastImport(cloudcastFixture()).description).toBe('');
    });

    it('drops duplicate and blank tags', () => {
      expect(
        toCloudcastSummary({
          tags: [{ name: 'House' }, { name: 'House' }, { name: '  ' }, 'Disco'],
        }).tags,
      ).toEqual(['House', 'Disco']);
    });
  });

  /**
   * Un mix importé appartient au compte Tambouille qui l'importe, pas à celui qui l'a
   * publié sur Mixcloud. Sans ce report, la fiche perd toute trace de son auteur réel.
   */
  describe("l'artiste Mixcloud", () => {
    const user = {
      key: '/Notamusic/',
      url: 'https://www.mixcloud.com/Notamusic/',
      name: 'Nota',
      username: 'Notamusic',
    };

    it('sépare le nom affiché de l’identifiant, qui diffèrent presque toujours', () => {
      expect(readArtist(user)).toEqual({
        name: 'Nota',
        username: 'Notamusic',
        profileUrl: 'https://www.mixcloud.com/Notamusic/',
      });
    });

    it('retombe sur l’identifiant quand le compte n’a pas de nom affiché', () => {
      expect(readArtist({ username: 'Notamusic' })?.name).toBe('Notamusic');
    });

    it('ignore une URL de profil qui ne pointe pas vers Mixcloud', () => {
      // Elle vient d'une réponse distante et devient un lien cliquable dans le formulaire.
      expect(
        readArtist({ ...user, url: 'https://ailleurs.example/Notamusic/' })
          ?.profileUrl,
      ).toBeUndefined();
    });

    it('ne fabrique pas d’artiste quand Mixcloud n’en donne aucun', () => {
      expect(readArtist(undefined)).toBeUndefined();
      expect(readArtist({})).toBeUndefined();
    });

    it('ajoute le nom en tête des tags', () => {
      expect(toCloudcastImport(cloudcastFixture({ user })).tags).toEqual([
        'Nota',
        'Italo disco',
        'New wave',
      ]);
    });

    it('garde le nom quand le mix porte déjà 10 tags', () => {
      // C'est la raison d'être de la mise en tête : `MixesService.parseTags` tronque à 10,
      // donc un nom ajouté en dernier serait le premier perdu.
      const tags = Array.from({ length: 10 }, (_, i) => ({ name: `tag${i}` }));

      const result = toCloudcastImport(cloudcastFixture({ user, tags })).tags;

      expect(result[0]).toBe('Nota');
      expect(result.slice(0, 10)).toContain('Nota');
    });

    it('ne duplique pas un nom déjà présent parmi les tags, quelle que soit la casse', () => {
      const result = toCloudcastImport(
        cloudcastFixture({ user, tags: [{ name: 'nota' }, { name: 'Disco' }] }),
      ).tags;

      expect(result).toEqual(['Nota', 'Disco']);
    });

    it('laisse les tags intacts quand il n’y a pas d’artiste', () => {
      expect(withArtistTag(['Disco'], undefined)).toEqual(['Disco']);
    });

    it('accompagne aussi les mix listés, pas seulement celui qu’on importe', () => {
      expect(toCloudcastSummary(cloudcastFixture({ user })).artist?.name).toBe(
        'Nota',
      );
    });
  });

  describe('picking a cover', () => {
    it('prefers the largest picture Mixcloud offers', () => {
      expect(
        pickPictureUrl({
          large: 'l',
          extra_large: 'xl',
          '640wx640h': '640',
          '1024wx1024h': '1024',
        }),
      ).toBe('1024');
    });

    it('falls back down the size list', () => {
      expect(pickPictureUrl({ small: 's', large: 'l' })).toBe('l');
    });

    it('returns undefined when there are no pictures', () => {
      expect(pickPictureUrl(undefined)).toBeUndefined();
    });
  });

  describe('reporting upstream failures', () => {
    it('turns an upstream 404 into a 404', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ error: {} }, 404));
      await expect(service.listCloudcasts('nobody')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('turns an upstream 500 into a 502', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, 500));
      await expect(service.listCloudcasts('Notamusic')).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });

    it('turns a transport failure into a 502', async () => {
      fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
      await expect(service.listCloudcasts('Notamusic')).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });

    it('turns a timeout into a 502', async () => {
      fetchMock.mockRejectedValue(
        Object.assign(new Error('The operation was aborted'), {
          name: 'AbortError',
        }),
      );
      await expect(service.listCloudcasts('Notamusic')).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });

    it('turns an unreadable body into a 502', async () => {
      fetchMock.mockResolvedValue(
        new Response('<html>nope</html>', { status: 200 }),
      );
      await expect(service.listCloudcasts('Notamusic')).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });

    it('sends an abort signal so the request cannot hang forever', async () => {
      await service.listCloudcasts('Notamusic');
      expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    });

    /**
     * The deadline has to outlive the headers. If it is cleared as soon as
     * `fetch` resolves, `response.json()` reads on a signal nothing can fire
     * any more, and a host that answers and then stops sending holds the
     * request open for as long as it likes.
     */
    it('aborts a body that stalls after the headers have arrived', async () => {
      jest.useFakeTimers();
      let signal: AbortSignal | undefined;
      fetchMock.mockImplementation(
        async (_url: string, options: RequestInit) => {
          signal = options.signal as AbortSignal;
          return stalledBodyResponse(signal);
        },
      );

      // The assertion is attached before the clock moves so the rejection it
      // is waiting for is never an unhandled one.
      const settled = expect(
        service.listCloudcasts('Notamusic'),
      ).rejects.toBeInstanceOf(BadGatewayException);
      await jest.advanceTimersByTimeAsync(PAST_THE_DEADLINE_MS);

      expect(signal?.aborted).toBe(true);
      await settled;
    });

    /**
     * A 3xx from `api.mixcloud.com` could name any host, including one inside
     * the network, and the relay hands the body it receives back to the
     * caller — so the hop is refused rather than followed. The mock honours
     * `redirect` the way the real `fetch` does: refuse and it throws, follow
     * and the caller gets whatever answered at the other end.
     */
    it('asks fetch to refuse redirects', async () => {
      await service.listCloudcasts('Notamusic');
      expect(fetchMock.mock.calls[0][1].redirect).toBe('error');
    });

    it('turns a redirect into a 502 instead of relaying what it points at', async () => {
      fetchMock.mockImplementation(
        async (_url: string, options: RequestInit) => {
          if (options.redirect === 'error')
            throw new TypeError('fetch failed: unexpected redirect');
          return jsonResponse({
            data: [cloudcastFixture({ name: 'internal metadata' })],
          });
        },
      );

      await expect(service.listCloudcasts('Notamusic')).rejects.toBeInstanceOf(
        BadGatewayException,
      );
    });
  });
});

/**
 * Mixcloud documents the upload parameters for sections but publishes no
 * example of the read shape, so both plausible forms are covered here.
 */
describe('parseSections', () => {
  it('reads fields nested under a track', () => {
    expect(
      parseSections([
        {
          start_time: 0,
          track: { artist: { name: 'Daft Punk' }, name: 'One More Time' },
        },
        {
          start_time: 320,
          track: { artist: { name: 'Cerrone' }, name: 'Supernature' },
        },
      ]),
    ).toEqual([
      { artist: 'Daft Punk', title: 'One More Time', timecodeSec: 0 },
      { artist: 'Cerrone', title: 'Supernature', timecodeSec: 320 },
    ]);
  });

  it('reads fields flat on the section, as the upload parameters are named', () => {
    expect(
      parseSections([
        { artist: 'Daft Punk', song: 'One More Time', start_time: 12 },
        { artist: 'Cerrone', song: 'Supernature', start_time: 340 },
      ]),
    ).toEqual([
      { artist: 'Daft Punk', title: 'One More Time', timecodeSec: 12 },
      { artist: 'Cerrone', title: 'Supernature', timecodeSec: 340 },
    ]);
  });

  it('accepts an artist given as a bare string inside a track', () => {
    expect(
      parseSections([
        { start_time: 5, track: { artist: 'Cerrone', name: 'Supernature' } },
      ]),
    ).toEqual([{ artist: 'Cerrone', title: 'Supernature', timecodeSec: 5 }]);
  });

  it('skips a section that carries only a chapter', () => {
    expect(
      parseSections([
        { chapter: 'Intro', start_time: 0 },
        { artist: 'Cerrone', song: 'Supernature', start_time: 60 },
      ]),
    ).toEqual([{ artist: 'Cerrone', title: 'Supernature', timecodeSec: 60 }]);
  });

  /**
   * Only sections carrying *nothing but* a chapter are skipped. Naming a
   * passage of the mix does not stop a section from also naming the track
   * playing in it, and dropping those would lose importable entries.
   */
  it('keeps a section that names a chapter alongside a usable track', () => {
    expect(
      parseSections([
        {
          chapter: 'Intro',
          artist: 'Cerrone',
          song: 'Supernature',
          start_time: 0,
        },
        {
          chapter: 'Peak time',
          start_time: 600,
          track: { artist: 'Daft Punk', name: 'One More Time' },
        },
      ]),
    ).toEqual([
      { artist: 'Cerrone', title: 'Supernature', timecodeSec: 0 },
      { artist: 'Daft Punk', title: 'One More Time', timecodeSec: 600 },
    ]);
  });

  it('drops an entry missing its artist rather than importing half of it', () => {
    expect(parseSections([{ song: 'Supernature', start_time: 60 }])).toEqual(
      [],
    );
    expect(
      parseSections([{ start_time: 60, track: { name: 'Supernature' } }]),
    ).toEqual([]);
  });

  it('drops an entry missing its title rather than importing half of it', () => {
    expect(parseSections([{ artist: 'Cerrone', start_time: 60 }])).toEqual([]);
    expect(
      parseSections([
        { start_time: 60, track: { artist: { name: 'Cerrone' } } },
      ]),
    ).toEqual([]);
  });

  it('sorts entries by timecode and defaults a missing start_time to zero', () => {
    expect(
      parseSections([
        { artist: 'B', song: 'Second', start_time: 200 },
        { artist: 'A', song: 'First' },
        { artist: 'C', song: 'Third', start_time: '90' },
      ]),
    ).toEqual([
      { artist: 'A', title: 'First', timecodeSec: 0 },
      { artist: 'C', title: 'Third', timecodeSec: 90 },
      { artist: 'B', title: 'Second', timecodeSec: 200 },
    ]);
  });

  it('returns nothing for the empty and unreadable cases', () => {
    expect(parseSections([])).toEqual([]);
    expect(parseSections(undefined)).toEqual([]);
    expect(parseSections('sections')).toEqual([]);
    expect(parseSections([null, 42, 'x'])).toEqual([]);
  });
});
