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
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isBandcampUrl, parseBandcampMusicPage } from './bandcamp.reader';

const MUSIC = readFileSync(
  join(__dirname, '__fixtures__', 'bandcamp-music.html'),
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

  it('rend une liste vide sur une page sans grille', () => {
    const { items } = parseBandcampMusicPage(
      '<html><body><p>rien</p></body></html>',
      'https://vide.bandcamp.com',
    );
    expect(items).toEqual([]);
  });
});
