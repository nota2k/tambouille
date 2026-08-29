import { buildSitemap, SITEMAP_MAX_URLS } from './sitemap.builder';

describe('buildSitemap', () => {
  it('écrit un document vide mais valide quand il n’y a rien à publier', () => {
    const xml = buildSitemap([]);

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    );
    expect(xml).not.toContain('<url>');
  });

  it('n’écrit que les propriétés renseignées', () => {
    const xml = buildSitemap([{ loc: 'https://example.test/' }]);

    expect(xml).toContain('<loc>https://example.test/</loc>');
    expect(xml).not.toContain('<lastmod>');
    expect(xml).not.toContain('<priority>');
  });

  it('accepte une date sous forme d’objet comme de chaîne', () => {
    const xml = buildSitemap([
      {
        loc: 'https://example.test/a',
        lastmod: new Date('2026-08-20T10:00:00Z'),
      },
      { loc: 'https://example.test/b', lastmod: '2026-08-21T10:00:00.000Z' },
    ]);

    expect(xml).toContain('<lastmod>2026-08-20T10:00:00.000Z</lastmod>');
    expect(xml).toContain('<lastmod>2026-08-21T10:00:00.000Z</lastmod>');
  });

  it('omet une date illisible plutôt que d’écrire « Invalid Date »', () => {
    const xml = buildSitemap([
      { loc: 'https://example.test/a', lastmod: 'pas une date' },
    ]);

    expect(xml).not.toContain('<lastmod>');
  });

  it('échappe ce que XML n’admet pas brut, un « & » d’URL en premier', () => {
    const xml = buildSitemap([{ loc: 'https://example.test/?a=1&b=2' }]);

    expect(xml).toContain('<loc>https://example.test/?a=1&amp;b=2</loc>');
  });

  it('s’arrête à la limite du protocole', () => {
    const trop = Array.from({ length: SITEMAP_MAX_URLS + 10 }, (_, i) => ({
      loc: `https://example.test/${i}`,
    }));

    expect(buildSitemap(trop).match(/<url>/g)).toHaveLength(SITEMAP_MAX_URLS);
  });
});
