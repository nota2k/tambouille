// Fixture frozen from https://ouiedire.net/feed — the radio named in the design
// doc. The path given in the plan (/feed/podcast) answers 404; this one serves
// `application/rss+xml`. Worth knowing what it does NOT carry: no `itunes:`
// namespace at all, so no `<itunes:duration>`, no `<itunes:author>` and no
// `<itunes:image>`. The parser has to degrade to plain RSS, which is what most
// self-hosted radio feeds are.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseFeed, parseItunesDuration } from './podcast.importer';

const feed = readFileSync(
  join(__dirname, '__fixtures__/podcast-feed.xml'),
  'utf8',
);

describe('parseItunesDuration', () => {
  it.each([
    ['3600', 3600],
    ['4:05', 245],
    ['1:02:03', 3723],
    ['', undefined],
    [undefined, undefined],
    ['not a duration', undefined],
  ])('reads %p as %p', (raw, expected) => {
    expect(parseItunesDuration(raw)).toBe(expected);
  });
});

describe('parseFeed', () => {
  it('reads the real fixture', () => {
    const parsed = parseFeed(feed);
    expect(parsed.channelTitle).toBe(
      "Ouïedire, j'en ai déjà entendu parler quelque part",
    );
    expect(parsed.items).toHaveLength(25);
    expect(parsed.items[0]!.audioUrl).toMatch(/^https:\/\//);
    expect(parsed.items[0]!.guid).toBe(
      'https://ouiedire.net/emission/ailleurs-331',
    );
  });

  it('falls back to dc:creator when the feed carries no itunes:author', () => {
    // The channel title is a slogan here, so using it as the attribution tag
    // would put a sentence in the tag list.
    expect(parseFeed(feed).channelAuthor).toBe('Ouïedire');
  });

  it('reads the channel image from plain RSS <image><url>', () => {
    expect(parseFeed(feed).channelImage).toBe(
      'https://ouiedire.net//assets/img/logo_rss.png',
    );
  });

  it('leaves durations undefined when the feed declares none', () => {
    expect(parseFeed(feed).items[0]!.durationSec).toBeUndefined();
  });

  it('keeps descriptions as plain text', () => {
    for (const item of parseFeed(feed).items) {
      expect(item.description).not.toMatch(/<[a-z/]/i);
    }
  });

  it('prefers itunes:author when the feed does have one', () => {
    const parsed =
      parseFeed(`<?xml version="1.0"?><rss><channel><title>T</title>
      <itunes:author>Radio Canut</itunes:author>
      <dc:creator>ignored</dc:creator>
      <item><title>A</title><enclosure url="https://x.test/a.mp3" type="audio/mpeg"/></item>
    </channel></rss>`);
    expect(parsed.channelAuthor).toBe('Radio Canut');
  });

  it('drops items with no enclosure', () => {
    const parsed =
      parseFeed(`<?xml version="1.0"?><rss><channel><title>T</title>
      <item><title>No audio</title></item>
      <item><title>Has audio</title><enclosure url="https://x.test/a.mp3" type="audio/mpeg"/></item>
    </channel></rss>`);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]!.title).toBe('Has audio');
  });

  it('drops enclosures that are not audio', () => {
    const parsed =
      parseFeed(`<?xml version="1.0"?><rss><channel><title>T</title>
      <item><title>Video</title><enclosure url="https://x.test/a.mp4" type="video/mp4"/></item>
    </channel></rss>`);
    expect(parsed.items).toHaveLength(0);
  });

  it('keeps a flac enclosure — the fixture has two', () => {
    const parsed =
      parseFeed(`<?xml version="1.0"?><rss><channel><title>T</title>
      <item><title>A</title><enclosure url="https://x.test/a.flac" type="audio/flac"/></item>
    </channel></rss>`);
    expect(parsed.items).toHaveLength(1);
  });

  it('falls back to the enclosure URL when an item has no guid', () => {
    const parsed =
      parseFeed(`<?xml version="1.0"?><rss><channel><title>T</title>
      <item><title>A</title><enclosure url="https://x.test/a.mp3" type="audio/mpeg"/></item>
    </channel></rss>`);
    expect(parsed.items[0]!.guid).toBe('https://x.test/a.mp3');
  });

  it('reads a guid given as an element with attributes', () => {
    const parsed =
      parseFeed(`<?xml version="1.0"?><rss><channel><title>T</title>
      <item><title>A</title><guid isPermaLink="false">tag:x.test,2026:1</guid>
      <enclosure url="https://x.test/a.mp3" type="audio/mpeg"/></item>
    </channel></rss>`);
    expect(parsed.items[0]!.guid).toBe('tag:x.test,2026:1');
  });

  it('handles a channel holding exactly one item', () => {
    // fast-xml-parser hands back an object, not an array, for a single child.
    const parsed =
      parseFeed(`<?xml version="1.0"?><rss><channel><title>T</title>
      <item><title>Only</title><enclosure url="https://x.test/a.mp3" type="audio/mpeg"/></item>
    </channel></rss>`);
    expect(parsed.items).toHaveLength(1);
  });

  it('keeps a title that looks like a number as text', () => {
    const parsed =
      parseFeed(`<?xml version="1.0"?><rss><channel><title>T</title>
      <item><title>2026</title><enclosure url="https://x.test/a.mp3" type="audio/mpeg"/></item>
    </channel></rss>`);
    expect(parsed.items[0]!.title).toBe('2026');
  });

  it('throws on something that is not a feed', () => {
    expect(() => parseFeed('<html><body>hello</body></html>')).toThrow();
  });

  it('throws on a document that does not parse as XML at all', () => {
    expect(() => parseFeed('not xml, just words')).toThrow();
  });

  it('donne à chaque item l’adresse de la page de l’épisode', () => {
    expect(parseFeed(feed).items[0]!.pageUrl).toBe(
      'https://ouiedire.net/emission/ailleurs-331',
    );
  });
});
