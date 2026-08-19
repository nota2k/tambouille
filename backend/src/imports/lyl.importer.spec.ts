// Fixtures frozen from the LYL Strapi API (2026-08-19):
//   /api/episodes?filters[slug][$eq]=temple-of-faitiche-2026-08-13&populate=…
//   /api/episodes?filters[show][slug][$eq]=temple-of-faitiche&sort=startAt:desc
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  LylImporter,
  parseLylUrl,
  parseLylDuration,
  parseLylTracks,
} from './lyl.importer';

jest.mock('../common/safe-fetch', () => ({ safeFetch: jest.fn() }));
import { safeFetch } from '../common/safe-fetch';

const fixture = (name: string) =>
  readFileSync(join(__dirname, '__fixtures__', name), 'utf8');

function answerWith(name: string) {
  (safeFetch as jest.Mock).mockResolvedValue({
    body: Buffer.from(fixture(name), 'utf8'),
  });
}

function answerWithJson(payload: unknown) {
  (safeFetch as jest.Mock).mockResolvedValue({
    body: Buffer.from(JSON.stringify(payload), 'utf8'),
  });
}

beforeEach(() => (safeFetch as jest.Mock).mockReset());

describe('parseLylUrl', () => {
  it.each([
    [
      'https://lyl.live/episode/temple-of-faitiche-2026-08-13',
      { kind: 'episode', slug: 'temple-of-faitiche-2026-08-13' },
    ],
    // Trailing slash and www are the same page, and must not read as two.
    [
      'https://www.lyl.live/episode/neon-cleptu-2026-07-30/',
      { kind: 'episode', slug: 'neon-cleptu-2026-07-30' },
    ],
    [
      'https://lyl.live/show/temple-of-faitiche',
      { kind: 'show', slug: 'temple-of-faitiche' },
    ],
    // The app routes both spellings to the same page.
    [
      'https://lyl.live/shows/temple-of-faitiche',
      { kind: 'show', slug: 'temple-of-faitiche' },
    ],
  ])('%s → %o', (raw, expected) => {
    expect(parseLylUrl(new URL(raw))).toEqual(expected);
  });

  it.each([
    // Pages with nothing to import.
    'https://lyl.live/',
    'https://lyl.live/archives',
    'https://lyl.live/schedule',
    'https://lyl.live/episode',
    'https://lyl.live/show/',
    // Hostname test, not a substring one.
    'https://notlyl.live/episode/a',
    'https://lyl.live.evil.test/episode/a',
    'https://evil.test/?x=lyl.live/episode/a',
    // A slug is a slug, not a path traversal into another API route.
    'https://lyl.live/episode/..%2F..%2Fusers',
  ])('%s → null', (raw) => {
    expect(parseLylUrl(new URL(raw))).toBeNull();
  });
});

describe('parseLylDuration', () => {
  it.each([
    ['01:00:00', 3600],
    // The GraphQL flavour of the same field carries milliseconds.
    ['01:00:00.000', 3600],
    ['00:59:30', 3570],
    ['02:07:04', 7624],
    ['', undefined],
    [null, undefined],
    [undefined, undefined],
    ['pas une durée', undefined],
    // `CreateMixDto` caps duration at 24 h; a longer one is a bad reading, not
    // a long show, and passing it on would fail validation downstream.
    ['25:00:00', undefined],
  ])('reads %p as %p', (raw, expected) => {
    expect(parseLylDuration(raw)).toBe(expected);
  });
});

describe('parseLylTracks', () => {
  it('reads one track per bulleted line', () => {
    expect(
      parseLylTracks(
        '- FIELD RECORDING - Indoor Skatepark at RAW\n- SDJ - Doctor Porc',
      ),
    ).toEqual([
      {
        artist: 'FIELD RECORDING',
        title: 'Indoor Skatepark at RAW',
        timecodeSec: 0,
      },
      { artist: 'SDJ', title: 'Doctor Porc', timecodeSec: 0 },
    ]);
  });

  it('accepts an en dash as the separator, which the site also uses', () => {
    expect(parseLylTracks('- ALAN & JAN – Progress')).toEqual([
      { artist: 'ALAN & JAN', title: 'Progress', timecodeSec: 0 },
    ]);
  });

  it('splits on the FIRST separator so a title may contain one', () => {
    expect(parseLylTracks('- Untel - Nord - Sud')).toEqual([
      { artist: 'Untel', title: 'Nord - Sud', timecodeSec: 0 },
    ]);
  });

  it('files a line with no separator as the title, with no artist', () => {
    expect(parseLylTracks('- Jingle LYL')).toEqual([
      { artist: '', title: 'Jingle LYL', timecodeSec: 0 },
    ]);
  });

  it('reads a line the show wrote without its bullet', () => {
    expect(parseLylTracks('SDJ - Doctor Porc')).toEqual([
      { artist: 'SDJ', title: 'Doctor Porc', timecodeSec: 0 },
    ]);
  });

  it('drops blank lines and bullets with nothing after them', () => {
    expect(parseLylTracks('- A - B\n\n-  \n- C - D')).toHaveLength(2);
  });

  it.each([[''], [null], [undefined], [42]])(
    'answers %p with an empty tracklist rather than failing',
    (raw) => {
      expect(parseLylTracks(raw)).toEqual([]);
    },
  );
});

describe('LylImporter.matches', () => {
  const importer = new LylImporter();

  it.each([
    ['https://lyl.live/episode/temple-of-faitiche-2026-08-13', true],
    ['https://lyl.live/show/temple-of-faitiche', true],
    ['https://lyl.live/archives', false],
    ['https://evil.test/?x=lyl.live/episode/a', false],
  ])('%s → %s', (raw, expected) => {
    expect(importer.matches(new URL(raw))).toBe(expected);
  });
});

describe('LylImporter.resolve on an episode', () => {
  it('prefills the form from the episode whole', async () => {
    answerWith('lyl-episode.json');

    const imported = await new LylImporter().resolve(
      new URL('https://lyl.live/episode/temple-of-faitiche-2026-08-13'),
    );

    expect(imported).toMatchObject({
      title: 'Temple Of Faitiche',
      // The artist leads the tags, then the styles, then the station.
      tags: [
        'Daniel Majer: Friends and Fragments',
        'Avant-garde',
        'Experimental',
        'Field Recording',
        'Collage',
        'LYL Radio',
      ],
      coverSourceUrl:
        'https://static.lyl.live/uploads/TEMPLE_OF_FAITICHE_AUGUST_c453f18e46.jpg',
      durationSec: 3600,
      // LYL's own mp3, not the Mixcloud or SoundCloud mirror the episode also
      // carries: it is the original, and it plays without a third-party widget.
      sourceType: 'remote',
      sourceRef:
        'https://static.lyl.live/uploads/TEMPLE_OF_FAITICHE_AUGUST_3ef8704002.mp3',
      sourceLabel: 'LYL Radio',
      sourcePageUrl: 'https://lyl.live/episode/temple-of-faitiche-2026-08-13',
    });
    expect((imported as { description: string }).description).toContain(
      'Friends and Fragments',
    );
  });

  it('reads the whole tracklist, timecodeless', async () => {
    answerWith('lyl-episode.json');

    const imported = (await new LylImporter().resolve(
      new URL('https://lyl.live/episode/temple-of-faitiche-2026-08-13'),
    )) as {
      tracklist: { artist: string; title: string; timecodeSec: number }[];
    };

    expect(imported.tracklist).toHaveLength(34);
    expect(imported.tracklist[0]).toEqual({
      artist: 'FIELD RECORDING',
      title: 'Hermann Schulz Cafe-Bar Chatter',
      timecodeSec: 0,
    });
    // The site publishes no timecodes at all, so every track sits at zero.
    expect(imported.tracklist.every((t) => t.timecodeSec === 0)).toBe(true);
  });

  it('asks the API for the slug that was pasted', async () => {
    answerWith('lyl-episode.json');

    await new LylImporter().resolve(
      new URL('https://lyl.live/episode/temple-of-faitiche-2026-08-13'),
    );

    const [endpoint] = (safeFetch as jest.Mock).mock.calls[0] as [string];
    expect(endpoint).toContain('strapi.lyl.live/api/episodes');
    expect(endpoint).toContain(
      encodeURIComponent('temple-of-faitiche-2026-08-13'),
    );
  });

  it('reports an unknown episode as not found', async () => {
    answerWithJson({ data: [] });

    await expect(
      new LylImporter().resolve(new URL('https://lyl.live/episode/pas-la')),
    ).rejects.toThrow(/aucune émission/i);
  });

  it('refuses an episode LYL does not host the audio of', async () => {
    // Some episodes carry only the Mixcloud mirror. Nothing to play from here.
    answerWithJson({
      data: [
        {
          title: 'Sans audio',
          slug: 'sans-audio',
          duration: '01:00:00',
          audio: null,
          mixcloud: 'https://www.mixcloud.com/lylradio/x/',
        },
      ],
    });

    await expect(
      new LylImporter().resolve(new URL('https://lyl.live/episode/sans-audio')),
    ).rejects.toThrow(/fichier audio/i);
  });

  it('reports an unreadable answer as coming from the source', async () => {
    (safeFetch as jest.Mock).mockResolvedValue({
      body: Buffer.from('<html>maintenance</html>', 'utf8'),
    });

    await expect(
      new LylImporter().resolve(new URL('https://lyl.live/episode/x')),
    ).rejects.toThrow(/LYL/i);
  });
});

describe('LylImporter.resolve on a show', () => {
  it('lists the episodes to choose from, newest first', async () => {
    answerWith('lyl-show-episodes.json');

    const items = (await new LylImporter().resolve(
      new URL('https://lyl.live/show/temple-of-faitiche'),
    )) as {
      ref: string;
      title: string;
      durationSec?: number;
      coverUrl?: string;
    }[];

    expect(items).toHaveLength(5);
    expect(items[0].ref).toBe('lyl:temple-of-faitiche-2026-08-13');
    expect(items[0].durationSec).toBe(3600);
    expect(items[0].coverUrl).toBeTruthy();
  });

  it('dates each entry, because a show reuses one title for every episode', () => {
    answerWith('lyl-show-episodes.json');

    return new LylImporter()
      .resolve(new URL('https://lyl.live/show/temple-of-faitiche'))
      .then((resolved) => {
        const items = resolved as { title: string }[];
        // Without the date the list is five identical rows, and the upload
        // form only ever shows this title.
        expect(items[0].title).toBe('Temple Of Faitiche — 2026-08-14');
        expect(new Set(items.map((item) => item.title)).size).toBe(
          items.length,
        );
      });
  });

  it('reports a show with no episodes as not found', async () => {
    answerWithJson({ data: [] });

    await expect(
      new LylImporter().resolve(new URL('https://lyl.live/show/pas-la')),
    ).rejects.toThrow(/aucune émission/i);
  });
});

describe('LylImporter.importItem', () => {
  it('imports the episode a list entry points at', async () => {
    answerWith('lyl-episode.json');

    const imported = await new LylImporter().importItem(
      'temple-of-faitiche-2026-08-13',
    );

    expect(imported.title).toBe('Temple Of Faitiche');
    expect(imported.sourceType).toBe('remote');
  });

  it.each([
    '',
    'pas un slug/du tout',
    '../../users',
    'https://lyl.live/episode/x',
  ])('refuses %p without calling the API', async (ref) => {
    // `POST /imports/item` is reachable with any `lyl:<whatever>`, which never
    // passes through `matches()`. The guard has to be here too.
    await expect(new LylImporter().importItem(ref)).rejects.toThrow(
      /Référence LYL/i,
    );
    expect(safeFetch as jest.Mock).not.toHaveBeenCalled();
  });
});
