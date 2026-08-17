import { MixcloudService } from '../mixcloud/mixcloud.service';
import { MixcloudImporter } from './mixcloud.importer';

function importerWith(relay: Partial<MixcloudService>): MixcloudImporter {
  return new MixcloudImporter(relay as MixcloudService);
}

describe('MixcloudImporter.matches', () => {
  const importer = importerWith({});

  it.each([
    ['https://www.mixcloud.com/Notamusic/', true],
    ['https://mixcloud.com/Notamusic/', true],
    ['https://player-widget.mixcloud.com/x', true],
    // The suffix test is on the hostname, so a lookalike domain is refused.
    ['https://evilmixcloud.com/Notamusic/', false],
    ['https://evil.test/?x=.mixcloud.com', false],
    ['https://archive.org/details/x', false],
  ])('%s → %s', (raw, expected) => {
    expect(importer.matches(new URL(raw))).toBe(expected);
  });
});

describe('MixcloudImporter.resolve', () => {
  it('treats a two-segment path as one cloudcast and imports it', async () => {
    const getCloudcast = jest.fn().mockResolvedValue({
      title: 'Antimythes',
      description: 'desc',
      tags: ['synth', 'Nota'],
      coverSourceUrl: 'https://thumbnailer.mixcloud.com/x.jpg',
      tracklist: [],
    });
    const importer = importerWith({ getCloudcast });

    const resolved = await importer.resolve(
      new URL('https://www.mixcloud.com/Notamusic/antimythes/'),
    );

    expect(getCloudcast).toHaveBeenCalledWith('/Notamusic/antimythes/');
    expect(resolved).toEqual({
      title: 'Antimythes',
      description: 'desc',
      tags: ['synth', 'Nota'],
      coverSourceUrl: 'https://thumbnailer.mixcloud.com/x.jpg',
      tracklist: [],
      sourceType: 'mixcloud',
      sourceRef: '/Notamusic/antimythes/',
      sourceLabel: 'Mixcloud',
      sourcePageUrl: 'https://www.mixcloud.com/Notamusic/antimythes/',
    });
  });

  it('treats a one-segment path as an account and lists it', async () => {
    const listCloudcasts = jest.fn().mockResolvedValue([
      {
        key: '/Notamusic/antimythes/',
        name: 'Antimythes',
        tags: [],
        audioLengthSec: 3600,
        pictureUrl: 'https://thumbnailer.mixcloud.com/x.jpg',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]);
    const importer = importerWith({ listCloudcasts });

    const resolved = await importer.resolve(
      new URL('https://www.mixcloud.com/Notamusic/'),
    );

    expect(listCloudcasts).toHaveBeenCalledWith('Notamusic');
    expect(resolved).toEqual([
      {
        ref: 'mixcloud:/Notamusic/antimythes/',
        title: 'Antimythes',
        durationSec: 3600,
        coverUrl: 'https://thumbnailer.mixcloud.com/x.jpg',
        publishedAt: '2026-01-01T00:00:00Z',
      },
    ]);
  });

  it('keeps a percent-encoded slug encoded, as the relay pattern expects', async () => {
    const getCloudcast = jest.fn().mockResolvedValue({
      title: 'x',
      description: '',
      tags: [],
      tracklist: [],
    });
    const importer = importerWith({ getCloudcast });

    await importer.resolve(
      new URL('https://www.mixcloud.com/goupilacneique/mix-for-ou%C3%AFedire/'),
    );

    expect(getCloudcast).toHaveBeenCalledWith(
      '/goupilacneique/mix-for-ou%C3%AFedire/',
    );
  });
});
