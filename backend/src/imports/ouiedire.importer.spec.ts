// Fixtures frozen from https://ouiedire.net/emission/ailleurs-331 (2026, carries
// both FLAC and MP3) and .../ailleurs-52 (2014, MP3 only). Between them they
// cover the two shapes the site has served over twelve years.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  isEmissionUrl,
  parseEmissionPage,
  parseOuiedireTitle,
  parseTimecode,
} from './ouiedire.importer';

function fixture(name: string): string {
  return readFileSync(join(__dirname, '__fixtures__', name), 'utf8');
}

const RECENT = fixture('ouiedire-emission.html');
const OLD = fixture('ouiedire-emission-mp3-only.html');

describe('isEmissionUrl', () => {
  it.each([
    ['https://ouiedire.net/emission/ailleurs-331', true],
    ['https://www.ouiedire.net/emission/bagage-3', true],
    ['https://ouiedire.net/emission/ailleurs-331/', true],
    // The feed belongs to the podcast importer; claiming it here would take a
    // working path away from the importer that handles it properly.
    ['https://ouiedire.net/feed', false],
    ['https://ouiedire.net/', false],
    ['https://ouiedire.net/emission', false],
    // Hostname test, not a substring one.
    ['https://evil.test/?x=ouiedire.net/emission/a-1', false],
    ['https://notouiedire.net/emission/a-1', false],
  ])('%s → %s', (raw, expected) => {
    expect(isEmissionUrl(new URL(raw))).toBe(expected);
  });
});

describe('parseTimecode', () => {
  it.each([
    ['00:00:00', 0],
    ['00:00:40', 40],
    ['00:03:00', 180],
    ['01:02:03', 3723],
    ['3:00', 180],
    ['', null],
    ['pas un timecode', null],
  ])('reads %p as %p', (raw, expected) => {
    expect(parseTimecode(raw)).toBe(expected);
  });
});

describe('parseOuiedireTitle', () => {
  it('splits the site’s own title format into a title and an author', () => {
    expect(
      parseOuiedireTitle(
        'Ouïedire Ailleurs - Émission #331 : La Pompa Chalor Vol 3, par Rachitik Data',
      ),
    ).toEqual({ title: 'La Pompa Chalor Vol 3', author: 'Rachitik Data' });
  });

  it('handles another series than "Ailleurs"', () => {
    expect(
      parseOuiedireTitle('Ouïedire Bagage - Émission #003 : Un truc, par Quelquun'),
    ).toEqual({ title: 'Un truc', author: 'Quelquun' });
  });

  it('splits on the LAST ", par" so a title may contain one', () => {
    expect(
      parseOuiedireTitle('Ouïedire Ailleurs - Émission #001 : Chanson, par amour, par Nota'),
    ).toEqual({ title: 'Chanson, par amour', author: 'Nota' });
  });

  it('keeps the whole string as the title when there is no author', () => {
    expect(parseOuiedireTitle('Ouïedire Ailleurs - Émission #001 : Sans auteur')).toEqual({
      title: 'Sans auteur',
      author: undefined,
    });
  });

  it('falls back to the raw string when the format is unrecognised', () => {
    expect(parseOuiedireTitle('Quelque chose de tout autre')).toEqual({
      title: 'Quelque chose de tout autre',
      author: undefined,
    });
  });
});

describe('parseEmissionPage', () => {
  it('reads the recent fixture whole', () => {
    const parsed = parseEmissionPage(RECENT);

    expect(parsed.title).toBe('La Pompa Chalor Vol 3');
    expect(parsed.author).toBe('Rachitik Data');
    expect(parsed.coverUrl).toBe(
      'https://ouiedire.net/assets/emission/ailleurs-331/ouiedire_ailleurs-331_cover-1.png',
    );
  });

  it('prefers the mp3 over the flac listed before it', () => {
    // The page lists FLAC first and a browser would take it — tens of times
    // heavier for the listener, for a difference no one hears on a DJ set.
    expect(parseEmissionPage(RECENT).audioUrl).toMatch(/\.mp3$/);
  });

  it('takes the mp3 when it is the only source, as on the 2014 pages', () => {
    expect(parseEmissionPage(OLD).audioUrl).toMatch(/\.mp3$/);
  });

  it('reads the full tracklist with its timecodes', () => {
    const { tracklist } = parseEmissionPage(RECENT);

    expect(tracklist.length).toBeGreaterThan(20);
    expect(tracklist[0]).toEqual({
      timecodeSec: 0,
      artist: 'Marinera Norteña',
      title: 'Concheperla',
    });
    expect(tracklist[1]).toEqual({
      timecodeSec: 40,
      artist: 'Los Chichos',
      title: 'Se fue mi amor',
    });
    // Strictly increasing: a timecode that went backwards would mean the
    // markup was misread rather than that the show is odd.
    for (let i = 1; i < tracklist.length; i++) {
      expect(tracklist[i]!.timecodeSec).toBeGreaterThanOrEqual(
        tracklist[i - 1]!.timecodeSec,
      );
    }
  });

  it('reads the tracklist of a 2014 page too', () => {
    const { tracklist } = parseEmissionPage(OLD);
    expect(tracklist.length).toBeGreaterThan(10);
    expect(tracklist[0]!.artist).toBeTruthy();
  });

  it('keeps a track whose title contains a dash', () => {
    const parsed = parseEmissionPage(`<html><head>
      <meta property="og:title" content="Ouïedire Ailleurs - Émission #001 : T, par A" />
      </head><body>
      <audio><source src="https://x.test/a.mp3" type="audio/mp3" /></audio>
      <ol class="mejs-smartplaylist-playlist">
        <li><a class="mejs-smartplaylist-time">00:01:00</a><span>Untel</span> - Nord - Sud</li>
      </ol></body></html>`);
    expect(parsed.tracklist[0]).toEqual({
      timecodeSec: 60,
      artist: 'Untel',
      title: 'Nord - Sud',
    });
  });

  it('files a single-label row as the title, with no artist', () => {
    const parsed = parseEmissionPage(`<html><head>
      <meta property="og:title" content="Ouïedire Ailleurs - Émission #001 : T, par A" />
      </head><body>
      <audio><source src="https://x.test/a.mp3" type="audio/mp3" /></audio>
      <ol class="mejs-smartplaylist-playlist">
        <li><a class="mejs-smartplaylist-time">00:00:00</a><span> Jingle Ouïedire</span></li>
        <li><a class="mejs-smartplaylist-time">00:00:40</a><span>Los Chichos</span> - Se fue mi amor</li>
      </ol></body></html>`);
    expect(parsed.tracklist[0]).toEqual({
      timecodeSec: 0,
      artist: '',
      title: 'Jingle Ouïedire',
    });
    expect(parsed.tracklist[1]).toEqual({
      timecodeSec: 40,
      artist: 'Los Chichos',
      title: 'Se fue mi amor',
    });
  });

  it('drops a row that carries a timecode and nothing else', () => {
    const parsed = parseEmissionPage(`<html><head>
      <meta property="og:title" content="Ouïedire Ailleurs - Émission #001 : T, par A" />
      </head><body>
      <audio><source src="https://x.test/a.mp3" type="audio/mp3" /></audio>
      <ol class="mejs-smartplaylist-playlist">
        <li><a class="mejs-smartplaylist-time">00:00:00</a><span></span></li>
      </ol></body></html>`);
    expect(parsed.tracklist).toEqual([]);
  });

  it('decodes the entities the page escapes', () => {
    const parsed = parseEmissionPage(`<html><head>
      <meta property="og:title" content="Ouïedire Ailleurs - Émission #001 : T, par A" />
      </head><body>
      <audio><source src="https://x.test/a.mp3" type="audio/mp3" /></audio>
      <ol class="mejs-smartplaylist-playlist">
        <li><a class="mejs-smartplaylist-time">00:00:10</a><span>Rock &amp; Roll</span> - D&eacute;j&agrave; vu</li>
      </ol></body></html>`);
    expect(parsed.tracklist[0]!.artist).toBe('Rock & Roll');
  });

  it('accepts a page with no tracklist rather than failing', () => {
    const parsed = parseEmissionPage(`<html><head>
      <meta property="og:title" content="Ouïedire Ailleurs - Émission #001 : T, par A" />
      </head><body>
      <audio><source src="https://x.test/a.mp3" type="audio/mp3" /></audio>
      </body></html>`);
    expect(parsed.tracklist).toEqual([]);
    expect(parsed.audioUrl).toBe('https://x.test/a.mp3');
  });

  it('throws when the page carries no audio at all', () => {
    expect(() =>
      parseEmissionPage('<html><head><title>x</title></head><body>rien</body></html>'),
    ).toThrow();
  });

  it('throws when the only audio source is not https', () => {
    // `sourceRef` is held to https at create; refusing here names the real
    // problem instead of letting the form answer with a regex.
    expect(() =>
      parseEmissionPage(`<html><head>
        <meta property="og:title" content="Ouïedire Ailleurs - Émission #001 : T, par A" />
        </head><body>
        <audio><source src="http://x.test/a.mp3" type="audio/mp3" /></audio>
        </body></html>`),
    ).toThrow();
  });
});
