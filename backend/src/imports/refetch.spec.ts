// Retrouver un mix déjà importé dans sa source, pour « Récupérer depuis la
// source » de l'écran d'édition. Le mix ne garde que deux choses de son import :
// la page de la source (`sourcePageUrl`) et le fichier audio (`sourceRef`).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NotFoundException } from '@nestjs/common';

jest.mock('../common/safe-fetch', () => ({ safeFetch: jest.fn() }));
import { safeFetch } from '../common/safe-fetch';
import { ImportsService } from './imports.service';
import { PodcastImporter } from './podcast.importer';
import { ArchiveImporter } from './archive.importer';
import type { MixImport, SourceImporter } from './source-importer';
import archiveFixture from './__fixtures__/archive-item.json';

const PERDU = "Ce mix n'a pas été retrouvé dans sa source";

const unMix: MixImport = {
  title: 'Un mix',
  description: '',
  tags: [],
  tracklist: [],
  sourceType: 'remote',
  sourceRef: 'https://a.test/x.mp3',
  sourceLabel: 'a.test',
};

function importeur(over: Partial<SourceImporter>): SourceImporter {
  return {
    name: 'a',
    matches: (url) => url.hostname === 'a.test',
    resolve: jest.fn(),
    importItem: jest.fn(),
    ...over,
  };
}

describe('ImportsService.refetch', () => {
  it("délègue à refetch() de l'importeur quand il en a un", async () => {
    const refetch = jest.fn().mockResolvedValue(unMix);
    const resolve = jest.fn();
    const service = new ImportsService([importeur({ refetch, resolve })]);

    await expect(
      service.refetch('https://a.test/page', 'https://a.test/x.mp3'),
    ).resolves.toBe(unMix);
    expect(refetch).toHaveBeenCalledWith(
      new URL('https://a.test/page'),
      'https://a.test/x.mp3',
    );
    expect(resolve).not.toHaveBeenCalled();
  });

  it('sinon, rend le mix que resolve() désigne', async () => {
    const service = new ImportsService([
      importeur({ resolve: jest.fn().mockResolvedValue(unMix) }),
    ]);
    await expect(
      service.refetch('https://a.test/page', 'https://a.test/x.mp3'),
    ).resolves.toBe(unMix);
  });

  it('refuse une liste : rien ne dit lequel de ses items est le mix', async () => {
    const service = new ImportsService([
      importeur({
        resolve: jest.fn().mockResolvedValue([{ ref: 'a:1', title: 'x' }]),
      }),
    ]);
    await expect(
      service.refetch('https://a.test/page', 'https://a.test/x.mp3'),
    ).rejects.toThrow(new NotFoundException(PERDU));
  });
});

describe('PodcastImporter.refetch', () => {
  const flux = readFileSync(
    join(__dirname, '__fixtures__/podcast-feed.xml'),
    'utf8',
  );
  const FEED = 'https://ouiedire.net/feed';
  const AUDIO =
    'https://ouiedire.net/assets/emission/ailleurs-330/ouiedire_ailleurs-330_rottweiler-slip_kick-clap-tick-tap-bing-bong-shamalama-ding-dong.mp3';

  beforeEach(() => {
    (safeFetch as jest.Mock).mockReset();
    (safeFetch as jest.Mock).mockResolvedValue({
      url: new URL(FEED),
      contentType: 'application/rss+xml',
      body: Buffer.from(flux),
    });
  });

  it("retrouve l'épisode par son fichier audio, en une seule lecture", async () => {
    const mix = await new PodcastImporter().refetch(new URL(FEED), AUDIO);
    expect(mix.sourceRef).toBe(AUDIO);
    expect(mix.title).toMatch(/330/);
    expect(mix.sourcePageUrl).toBe(FEED);
    expect(safeFetch).toHaveBeenCalledTimes(1);
  });

  it("répond 404 quand l'épisode a quitté le flux", async () => {
    await expect(
      new PodcastImporter().refetch(
        new URL(FEED),
        'https://ouiedire.net/disparu.mp3',
      ),
    ).rejects.toThrow(new NotFoundException(PERDU));
  });
});

describe('ArchiveImporter.refetch', () => {
  const ID = 'shakedownstreet2024-08-30.akg481.flac';

  beforeEach(() => {
    (safeFetch as jest.Mock).mockReset();
    (safeFetch as jest.Mock).mockResolvedValue({
      url: new URL(`https://archive.org/metadata/${ID}`),
      contentType: 'application/json',
      body: Buffer.from(JSON.stringify(archiveFixture)),
    });
  });

  it('lit le fichier dans sourceRef, même encodé, en une seule lecture', async () => {
    const sourceRef = `https://archive.org/download/${encodeURIComponent(ID)}/${encodeURIComponent('shakedownstreet2024-08-30.akg481.t02.mp3')}`;
    const mix = await new ArchiveImporter().refetch(
      new URL(`https://archive.org/details/${ID}`),
      sourceRef,
    );
    expect(mix.sourceRef).toBe(sourceRef);
    expect(safeFetch).toHaveBeenCalledTimes(1);
  });

  it("répond 404 quand sourceRef n'est pas un fichier Archive.org", async () => {
    await expect(
      new ArchiveImporter().refetch(
        new URL(`https://archive.org/details/${ID}`),
        'https://ailleurs.test/x.mp3',
      ),
    ).rejects.toThrow(new NotFoundException(PERDU));
  });
});
