import { AudioLinkImporter, titleFromAudioPath } from './audio-link.importer';

describe('AudioLinkImporter', () => {
  const importer = new AudioLinkImporter();

  it.each([
    'https://want.incongru.org/emissions/WANT_01_-_We_Are_Not_Toys.mp3',
    'https://example.org/a/b/set.M4A',
    'https://example.org/set.ogg?download=1',
    'https://example.org/set.flac',
  ])('claims a direct audio link: %s', (raw) => {
    expect(importer.matches(new URL(raw))).toBe(true);
  });

  it.each([
    'https://want.incongru.org/',
    'https://ouiedire.net/feed',
    'https://example.org/mp3',
    'https://example.org/page.html?file=set.mp3',
  ])('leaves anything else to the other importers: %s', (raw) => {
    expect(importer.matches(new URL(raw))).toBe(false);
  });

  it('turns the link into one remote mix, without downloading it', async () => {
    const url =
      'https://want.incongru.org/emissions/WANT_01_-_We_Are_Not_Toys.mp3';
    await expect(importer.resolve(new URL(url))).resolves.toEqual({
      title: 'WANT 01 - We Are Not Toys',
      description: '',
      tags: [],
      tracklist: [],
      sourceType: 'remote',
      sourceRef: url,
      sourceLabel: 'want.incongru.org',
    });
  });

  it('refuses importItem: a link is never offered as a list', async () => {
    await expect(importer.importItem()).rejects.toThrow();
  });
});

describe('titleFromAudioPath', () => {
  it.each([
    ['/emissions/WANT_01_-_We_Are_Not_Toys.mp3', 'WANT 01 - We Are Not Toys'],
    ['/Ma%20%C3%A9mission.mp3', 'Ma émission'],
    ['/a/b/c.d.mp3', 'c.d'],
    ['/%E0%A4%A.mp3', '%E0%A4%A'],
  ])('reads %p as %p', (path, expected) => {
    expect(titleFromAudioPath(path)).toBe(expected);
  });
});
