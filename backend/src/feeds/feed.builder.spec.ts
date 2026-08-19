import { XMLParser } from 'fast-xml-parser';
import { buildRssFeed } from './feed.builder';
import type { FeedChannel, FeedItem } from './feed.types';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
});

function item(overrides: Partial<FeedItem> = {}): FeedItem {
  return {
    guid: 'f69a18ad-ffed-4885-93bc-919967cc2563',
    title: 'Antimythes',
    link: 'https://tambouille.example/mixes/f69a18ad-ffed-4885-93bc-919967cc2563',
    description: 'Deux heures de dub sous la pluie.',
    publishedAt: new Date('2026-08-19T05:00:10.000Z'),
    enclosure: {
      url: 'https://api.tambouille.example/api/mixes/f69a18ad-ffed-4885-93bc-919967cc2563/audio',
      type: 'audio/mpeg',
    },
    ...overrides,
  };
}

function channel(overrides: Partial<FeedChannel> = {}): FeedChannel {
  return {
    title: 'Tambouille',
    description: 'Les derniers mix.',
    link: 'https://tambouille.example/',
    selfUrl: 'https://api.tambouille.example/api/rss',
    items: [item()],
    ...overrides,
  };
}

function parse(xml: string) {
  return parser.parse(xml).rss.channel;
}

describe('buildRssFeed', () => {
  it('produit un document analysable, en RSS 2.0', () => {
    const xml = buildRssFeed(channel());
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');

    const parsed = parser.parse(xml);
    expect(parsed.rss['@version']).toBe('2.0');
    expect(parsed.rss.channel.title).toBe('Tambouille');
    expect(parsed.rss.channel['atom:link']['@rel']).toBe('self');
  });

  it('reste bien formé quand un titre porte des caractères réservés', () => {
    // Le piège de ce format : sans échappement, cette seule esperluette rend le
    // flux non analysable, et l'abonné voit un podcast qui cesse de se mettre à
    // jour sans message.
    const titre = 'Rock & <roll> — "l\'hiver"';
    const xml = buildRssFeed(channel({ items: [item({ title: titre })] }));

    expect(xml).not.toContain('& <roll>');
    expect(parse(xml).item.title).toBe(titre);
  });

  it('omet la durée quand elle est inconnue, plutôt que de publier zéro', () => {
    const sans = parse(buildRssFeed(channel()));
    expect(sans.item['itunes:duration']).toBeUndefined();

    const avec = parse(
      buildRssFeed(channel({ items: [item({ durationSec: 3600 })] })),
    );
    expect(avec.item['itunes:duration']).toBe(3600);
  });

  it("omet l'image d'un item quand il n'y en a pas", () => {
    expect(parse(buildRssFeed(channel())).item['itunes:image']).toBeUndefined();

    const avec = parse(
      buildRssFeed(
        channel({ items: [item({ imageUrl: 'https://cdn.example/c.jpg' })] }),
      ),
    );
    expect(avec.item['itunes:image']['@href']).toBe(
      'https://cdn.example/c.jpg',
    );
  });

  it("omet l'enclosure quand l'audio n'est pas adressable, sans retirer l'item", () => {
    const parsed = parse(
      buildRssFeed(
        channel({
          items: [item({ enclosure: undefined, title: 'Sur Mixcloud' })],
        }),
      ),
    );

    expect(parsed.item.enclosure).toBeUndefined();
    expect(parsed.item.title).toBe('Sur Mixcloud');
    expect(parsed.item.link).toContain('/mixes/');
  });

  it('publie une enclosure complète quand il y en a une', () => {
    const enclosure = parse(buildRssFeed(channel())).item.enclosure;
    expect(enclosure['@url']).toContain('/audio');
    expect(enclosure['@type']).toBe('audio/mpeg');
    // Plafond assumé : aucune taille d'octets n'est stockée.
    expect(enclosure['@length']).toBe('0');
  });

  it('publie la date au format RFC 822', () => {
    expect(parse(buildRssFeed(channel())).item.pubDate).toBe(
      'Wed, 19 Aug 2026 05:00:10 GMT',
    );
  });

  it("publie un guid qui n'est pas une URL", () => {
    const guid = parse(buildRssFeed(channel())).item.guid;
    expect(guid['#text']).toBe('f69a18ad-ffed-4885-93bc-919967cc2563');
    expect(guid['@isPermaLink']).toBe('false');
  });
});
