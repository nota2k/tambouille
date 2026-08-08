// Fixture frozen from https://archive.org/metadata/shakedownstreet2024-08-30.akg481.flac
// The identifier named in the plan (gd1977-05-08.sbd.hicks.4982.sbeok.shnf) no
// longer exists — Archive.org answers it with `200 {}`. This one is a live
// concert: 16 tracks, each present as both 24bit Flac and VBR MP3, which is
// exactly the duplication `parseArchiveItem` has to collapse.
import fixture from './__fixtures__/archive-item.json';
import {
  extractIdentifier,
  parseArchiveItem,
  parseLength,
} from './archive.importer';

const FIXTURE_ID = 'shakedownstreet2024-08-30.akg481.flac';

describe('extractIdentifier', () => {
  it('reads the identifier from a details URL', () => {
    expect(extractIdentifier(new URL('https://archive.org/details/my-item'))).toBe(
      'my-item',
    );
  });

  it('reads it from a details URL with a trailing path', () => {
    expect(
      extractIdentifier(new URL('https://archive.org/details/my-item/page/2')),
    ).toBe('my-item');
  });

  it('reads it from a download URL', () => {
    expect(
      extractIdentifier(new URL('https://archive.org/download/my-item/a.mp3')),
    ).toBe('my-item');
  });

  it('returns null when there is no identifier', () => {
    expect(extractIdentifier(new URL('https://archive.org/'))).toBeNull();
  });

  it('returns null for a path that is not details or download', () => {
    expect(extractIdentifier(new URL('https://archive.org/search?q=x'))).toBeNull();
  });
});

describe('parseLength', () => {
  it.each([
    ['125.4', 125],
    ['301.16', 301],
    ['4:05', 245],
    ['05:01', 301],
    ['1:02:03', 3723],
    ['', undefined],
    ['   ', undefined],
    [undefined, undefined],
    [42, undefined],
    ['not a duration', undefined],
    ['0', undefined],
  ])('reads %p as %p', (raw, expected) => {
    expect(parseLength(raw)).toBe(expected);
  });
});

describe('parseArchiveItem', () => {
  it('reads the real fixture as one entry per track, not one per format', () => {
    const items = parseArchiveItem(FIXTURE_ID, fixture);

    // 32 audio files in the item, 16 actual tracks.
    expect(items).toHaveLength(16);
    for (const item of items) {
      expect(item.ref.startsWith(`archive:${FIXTURE_ID}/`)).toBe(true);
      expect(item.title).toBeTruthy();
      // The MP3 wins: playable in every browser, and an order of magnitude
      // smaller than the 24-bit FLAC beside it.
      expect(item.ref.endsWith('.mp3')).toBe(true);
      expect(item.durationSec).toBeGreaterThan(0);
    }
    expect(items[0]!.title).toBe('The Promised Land');
    expect(items[0]!.durationSec).toBe(301);
  });

  it('keeps only audio files and builds download refs', () => {
    const items = parseArchiveItem('my-item', {
      files: [
        { name: 'a.mp3', format: 'VBR MP3', length: '125.4', title: 'Track A' },
        { name: 'cover.jpg', format: 'JPEG' },
        { name: 'notes.txt', format: 'Text' },
      ],
    });
    expect(items).toHaveLength(1);
    expect(items[0]!.ref).toBe('archive:my-item/a.mp3');
    expect(items[0]!.title).toBe('Track A');
    expect(items[0]!.durationSec).toBe(125);
  });

  it('collapses a derivative onto its original and keeps the mp3', () => {
    const items = parseArchiveItem('my-item', {
      files: [
        { name: 't01.flac', format: '24bit Flac', length: '301.16', title: 'One' },
        { name: 't01.mp3', format: 'VBR MP3', length: '05:01', title: 'One', original: 't01.flac' },
      ],
    });
    expect(items).toHaveLength(1);
    expect(items[0]!.ref).toBe('archive:my-item/t01.mp3');
    expect(items[0]!.durationSec).toBe(301);
  });

  it('keeps a lossless track that has no mp3 derivative', () => {
    const items = parseArchiveItem('my-item', {
      files: [{ name: 't01.flac', format: '24bit Flac', length: '301.16', title: 'One' }],
    });
    expect(items).toHaveLength(1);
    expect(items[0]!.ref).toBe('archive:my-item/t01.flac');
  });

  it('does not collapse two tracks that merely sit next to each other', () => {
    const items = parseArchiveItem('my-item', {
      files: [
        { name: 't01.mp3', format: 'VBR MP3', title: 'One' },
        { name: 't02.mp3', format: 'VBR MP3', title: 'Two' },
      ],
    });
    expect(items).toHaveLength(2);
  });

  it('ignores an `original` that points at a non-audio file', () => {
    // Spectrograms and waveform PNGs also carry `original`; grouping on it
    // blindly would fold unrelated tracks together.
    const items = parseArchiveItem('my-item', {
      files: [
        { name: 't01.mp3', format: 'VBR MP3', title: 'One', original: 'sheet.pdf' },
        { name: 't02.mp3', format: 'VBR MP3', title: 'Two', original: 'sheet.pdf' },
      ],
    });
    expect(items).toHaveLength(2);
  });

  it('falls back to the file name when a file has no title', () => {
    const items = parseArchiveItem('my-item', {
      files: [{ name: 'set-one.mp3', format: 'VBR MP3' }],
    });
    expect(items[0]!.title).toBe('set-one.mp3');
    expect(items[0]!.durationSec).toBeUndefined();
  });

  it('returns an empty list when the item holds no audio', () => {
    expect(
      parseArchiveItem('my-item', { files: [{ name: 'a.txt', format: 'Text' }] }),
    ).toEqual([]);
  });

  it('returns an empty list for the empty object Archive.org sends for an unknown item', () => {
    expect(parseArchiveItem('my-item', {})).toEqual([]);
    expect(parseArchiveItem('my-item', null)).toEqual([]);
  });
});
