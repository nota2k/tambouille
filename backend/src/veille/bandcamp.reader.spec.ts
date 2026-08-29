// Fixture gelée depuis https://squarepusher.bandcamp.com/music (curl, 2026-08-29).
// Elle porte la forme moderne : un <ol id="music-grid" data-client-items='[…]'>
// dont chaque entrée a `page_url`, `title`, `art_id`. Les pages de label
// testées d'abord (mindrecords, planetmu, hyperdub, stonesthrow, ghostly,
// ninjatune) portaient soit une redirection de /music vers un morceau mis en
// avant (mindrecords), soit des `page_url` majoritairement absolues pointant
// vers les sous-domaines Bandcamp d'artistes tiers — une page d'artiste comme
// celle-ci garde ses `page_url` relatives à son propre domaine, ce que le test
// « chaque item reste sur le domaine de la source » suppose. Écart avec le
// plan : aucune entrée réelle ne porte `publish_date` (le champ n'existe tout
// simplement pas dans le JSON servi aujourd'hui) ; le parseur le traite déjà
// comme optionnel, donc `publishedAt` reste `undefined` pour ces items sans
// changement de code. Les apostrophes des titres arrivent en `&#39;` au sein
// du JSON (ex. "Burningn&#39;n Tree") : `JSON.parse` les avale telles quelles
// et c'est `stripHtml`, déjà appelé sur le titre, qui les décode.
//
// Deuxième fixture gelée depuis https://actress.bandcamp.com/music (curl,
// 2026-08-29, correctif du round 1 : `fromGridMarkup` n'était exercé par
// aucun HTML réel). Cette page ne porte aucun `data-client-items` — Bandcamp
// sert encore, pour certains artistes, la grille statique documentée en
// forme 2 du brief : des `<li class="music-grid-item">`, chacune avec un
// `<a href="/album/…">`, une `<img src>` déjà absolue et un `<p class="title">`.
// Le regex de `fromGridMarkup` matche ses 19 entrées telles quelles (vérifié
// à la main avec un script Node avant d'écrire le test ci-dessous).
//
// Troisième fixture gelée depuis https://squarepusher.bandcamp.com/album/kammerkonzert
// (curl, 2026-08-29) — une page d'album, cette fois, atteinte depuis le
// premier `page_url` de la fixture `/music` ci-dessus. Écart avec le brief :
// cette page réelle ne porte aucune balise `<meta itemprop="datePublished">`
// (vérifié : zéro occurrence de `datePublished` en dehors du JSON). La seule
// date de publication s'y trouve dans le JSON de `data-tralbum`, sous
// `current.publish_date` (forme `"25 Feb 2026 14:59:53 GMT"`, que `Date`
// parse nativement) — `extractAlbumPublishedAt` ne lit donc que ce champ.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  BandcampReader,
  extractAlbumPublishedAt,
  isBandcampUrl,
  parseBandcampMusicPage,
} from './bandcamp.reader';

jest.mock('../common/safe-fetch', () => ({ safeFetch: jest.fn() }));
import { safeFetch } from '../common/safe-fetch';

const fetchMock = safeFetch as jest.Mock;

const MUSIC = readFileSync(
  join(__dirname, '__fixtures__', 'bandcamp-music.html'),
  'utf8',
);
const MUSIC_GRID = readFileSync(
  join(__dirname, '__fixtures__', 'bandcamp-music-grid.html'),
  'utf8',
);
const ALBUM = readFileSync(
  join(__dirname, '__fixtures__', 'bandcamp-album.html'),
  'utf8',
);

describe('isBandcampUrl', () => {
  it.each([
    ['https://mindrecords.bandcamp.com/music', true],
    ['https://mindrecords.bandcamp.com/', true],
    ['https://bandcamp.com/tag/ambient', false],
    // Test d'hôte, pas de sous-chaîne.
    ['https://evil.test/?x=mindrecords.bandcamp.com', false],
  ])('%s → %s', (raw, expected) => {
    expect(isBandcampUrl(new URL(raw))).toBe(expected);
  });
});

describe('parseBandcampMusicPage', () => {
  it('rend le nom du label et ses sorties', () => {
    const { label, items } = parseBandcampMusicPage(
      MUSIC,
      'https://squarepusher.bandcamp.com',
    );

    expect(label).toBeTruthy();
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.title).toBeTruthy();
      expect(item.pageUrl).toMatch(/^https:\/\/squarepusher\.bandcamp\.com\//);
    }
  });

  it('ne rend jamais plus que le plafond par source', () => {
    const { items } = parseBandcampMusicPage(
      MUSIC,
      'https://squarepusher.bandcamp.com',
    );
    expect(items.length).toBeLessThanOrEqual(10);
  });

  it('lit la grille statique quand la page ne sert pas de data-client-items', () => {
    const { label, items } = parseBandcampMusicPage(
      MUSIC_GRID,
      'https://actress.bandcamp.com',
    );

    expect(label).toBeTruthy();
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.title).toBeTruthy();
      expect(item.pageUrl).toMatch(/^https:\/\/actress\.bandcamp\.com\//);
      expect(item.coverUrl).toBeTruthy();
    }
  });

  it('rend une liste vide sur une page sans grille', () => {
    const { items } = parseBandcampMusicPage(
      '<html><body><p>rien</p></body></html>',
      'https://vide.bandcamp.com',
    );
    expect(items).toEqual([]);
  });
});

describe('extractAlbumPublishedAt', () => {
  it('lit la date de publication dans le JSON de data-tralbum', () => {
    expect(extractAlbumPublishedAt(ALBUM)).toBe('2026-02-25T14:59:53.000Z');
  });

  it('ne lève pas sur une page sans data-tralbum', () => {
    expect(
      extractAlbumPublishedAt('<html><body>rien</body></html>'),
    ).toBeUndefined();
  });

  it('ne lève pas sur un data-tralbum sans date de publication', () => {
    const html = `<div data-tralbum="${'{&quot;current&quot;:{}}'}"></div>`;
    expect(extractAlbumPublishedAt(html)).toBeUndefined();
  });

  it('ne lève pas sur un data-tralbum illisible', () => {
    const html = `<div data-tralbum="${'{pas du json'}"></div>`;
    expect(extractAlbumPublishedAt(html)).toBeUndefined();
  });
});

describe('BandcampReader.read', () => {
  let reader: BandcampReader;

  beforeEach(() => {
    fetchMock.mockReset();
    reader = new BandcampReader();
  });

  it('pose la date de la page d’album sur le seul premier item', async () => {
    fetchMock
      .mockResolvedValueOnce({ body: Buffer.from(MUSIC) })
      .mockResolvedValueOnce({ body: Buffer.from(ALBUM) });

    const resolved = await reader.read(
      new URL('https://squarepusher.bandcamp.com/'),
    );

    expect(resolved.items[0].publishedAt).toBe('2026-02-25T14:59:53.000Z');
    expect(resolved.items.slice(1).every((item) => !item.publishedAt)).toBe(
      true,
    );
  });

  it('n’accède à la page d’album qu’une fois, pas une par entrée', async () => {
    fetchMock
      .mockResolvedValueOnce({ body: Buffer.from(MUSIC) })
      .mockResolvedValueOnce({ body: Buffer.from(ALBUM) });

    await reader.read(new URL('https://squarepusher.bandcamp.com/'));

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('laisse les items intacts si la page d’album est injoignable', async () => {
    fetchMock
      .mockResolvedValueOnce({ body: Buffer.from(MUSIC) })
      .mockRejectedValueOnce(new Error('502'));

    const resolved = await reader.read(
      new URL('https://squarepusher.bandcamp.com/'),
    );

    expect(resolved.items.length).toBeGreaterThan(0);
    expect(resolved.items[0].publishedAt).toBeUndefined();
  });

  it('laisse les items intacts si la page d’album ne donne pas de date', async () => {
    fetchMock
      .mockResolvedValueOnce({ body: Buffer.from(MUSIC) })
      .mockResolvedValueOnce({
        body: Buffer.from('<html><body>rien</body></html>'),
      });

    const resolved = await reader.read(
      new URL('https://squarepusher.bandcamp.com/'),
    );

    expect(resolved.items[0].publishedAt).toBeUndefined();
  });
});
