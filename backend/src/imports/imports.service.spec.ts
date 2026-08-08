import { BadRequestException } from '@nestjs/common';
import { ImportsService } from './imports.service';
import type { SourceImporter } from './source-importer';

function stub(name: string, host: string): SourceImporter {
  return {
    name,
    matches: (url) => url.hostname === host,
    resolve: async () => [],
    importItem: async () => {
      throw new Error('unused');
    },
  };
}

describe('ImportsService', () => {
  it('picks the first importer whose matches() accepts the URL', () => {
    const first = stub('a', 'a.test');
    const second = stub('b', 'b.test');
    const service = new ImportsService([first, second]);
    expect(service.importerFor(new URL('https://b.test/x')).name).toBe('b');
  });

  it('refuses a URL no importer claims', () => {
    const service = new ImportsService([stub('a', 'a.test')]);
    expect(() => service.importerFor(new URL('https://z.test/x'))).toThrow(
      BadRequestException,
    );
  });

  it('refuses a non-https URL before consulting any importer', () => {
    const service = new ImportsService([stub('a', 'a.test')]);
    expect(() => service.importerFor(new URL('http://a.test/x'))).toThrow(
      BadRequestException,
    );
  });

  it('refuses something that is not a URL at all', async () => {
    const service = new ImportsService([stub('a', 'a.test')]);
    await expect(service.resolve('pas une url')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('tags a single mix as kind: mix and a collection as kind: list', async () => {
    const mix = {
      title: 'T',
      description: '',
      tags: [],
      tracklist: [],
      sourceType: 'remote' as const,
      sourceRef: 'https://x.test/a.mp3',
      sourceLabel: 'x.test',
    };
    const one: SourceImporter = { ...stub('one', 'one.test'), resolve: async () => mix };
    const many: SourceImporter = {
      ...stub('many', 'many.test'),
      resolve: async () => [{ ref: 'many:1', title: 'A' }],
    };
    const service = new ImportsService([one, many]);

    await expect(service.resolve('https://one.test/x')).resolves.toEqual({
      kind: 'mix',
      mix,
    });
    await expect(service.resolve('https://many.test/x')).resolves.toEqual({
      kind: 'list',
      items: [{ ref: 'many:1', title: 'A' }],
    });
  });

  it('routes importItem to the importer named in the ref', async () => {
    const imported = {
      title: 'routed',
      description: '',
      tags: [],
      tracklist: [],
      sourceType: 'remote' as const,
      sourceRef: 'https://x.test/a.mp3',
      sourceLabel: 'x.test',
    };
    const target: SourceImporter = {
      ...stub('target', 'target.test'),
      importItem: async (value) => ({ ...imported, sourceRef: value }),
    };
    const service = new ImportsService([stub('other', 'other.test'), target]);

    // The value keeps every colon after the first, so a ref carrying a URL
    // survives the round trip intact.
    await expect(service.importItem('target:https://x.test/a.mp3')).resolves.toEqual({
      ...imported,
      sourceRef: 'https://x.test/a.mp3',
    });
  });

  it('refuses a ref naming an importer that does not exist', async () => {
    const service = new ImportsService([stub('a', 'a.test')]);
    await expect(service.importItem('ghost:whatever')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('refuses a ref with no importer prefix', async () => {
    const service = new ImportsService([stub('a', 'a.test')]);
    await expect(service.importItem('no-prefix')).rejects.toThrow(
      BadRequestException,
    );
  });
});
