import { BadRequestException } from '@nestjs/common';
import { canonicalUrl, VeilleResolver } from './veille.resolver';

jest.mock('../common/safe-fetch', () => ({ safeFetch: jest.fn() }));
import { safeFetch } from '../common/safe-fetch';

const fetchMock = safeFetch as jest.Mock;

describe('canonicalUrl', () => {
  it.each([
    ['https://Ouiedire.net/Feed/', 'https://ouiedire.net/Feed'],
    ['https://ouiedire.net/feed?x=1#a', 'https://ouiedire.net/feed'],
    ['https://ouiedire.net', 'https://ouiedire.net'],
    ['https://ouiedire.net./feed', 'https://ouiedire.net/feed'],
    ['https://x.test//feed', 'https://x.test/feed'],
    ['https://x.test/feed//', 'https://x.test/feed'],
    ['https://x.test:8443/feed', 'https://x.test:8443/feed'],
    ['https://X.test.:8443/feed', 'https://x.test:8443/feed'],
    ['https://x.test:443/feed', 'https://x.test/feed'],
  ])('%s → %s', (raw, expected) => {
    expect(canonicalUrl(raw)).toBe(expected);
  });

  it('refuse ce qui n’est pas une URL https', () => {
    expect(() => canonicalUrl('pas une url')).toThrow(BadRequestException);
    expect(() => canonicalUrl('http://ouiedire.net')).toThrow(
      BadRequestException,
    );
  });

  it.each([
    'https://Ouiedire.net/Feed/',
    'https://ouiedire.net/feed?x=1#a',
    'https://ouiedire.net',
    'https://ouiedire.net./feed',
    'https://x.test//feed',
    'https://x.test/feed//',
    'https://x.test:8443/feed',
  ])('est idempotente sur %s', (raw) => {
    const once = canonicalUrl(raw);
    expect(canonicalUrl(once)).toBe(once);
  });
});

describe('VeilleResolver', () => {
  let bandcamp: { matches: jest.Mock; read: jest.Mock };
  let imports: { resolve: jest.Mock; importerFor: jest.Mock };
  let resolver: VeilleResolver;

  beforeEach(() => {
    fetchMock.mockReset();
    bandcamp = { matches: jest.fn().mockReturnValue(false), read: jest.fn() };
    // Par défaut le fourre-tout réclame l'URL, comme `PodcastImporter` le fait
    // réellement pour toute adresse https : ça garde le sens des tests qui ne
    // s'intéressent pas à cette distinction.
    imports = {
      resolve: jest.fn(),
      importerFor: jest.fn().mockReturnValue({ name: 'podcast' }),
    };
    resolver = new VeilleResolver(bandcamp as never, imports as never);
  });

  it('passe la main à Bandcamp quand l’hôte est le sien', async () => {
    bandcamp.matches.mockReturnValue(true);
    bandcamp.read.mockResolvedValue({
      resolver: 'bandcamp',
      label: 'Mind Records',
      url: 'https://mind.bandcamp.com/music',
      items: [{ title: 'A', pageUrl: 'https://mind.bandcamp.com/album/a' }],
    });

    const resolved = await resolver.resolve('https://mind.bandcamp.com/');

    expect(resolved.resolver).toBe('bandcamp');
    expect(imports.resolve).not.toHaveBeenCalled();
  });

  it('convertit la liste d’un importeur existant en items de veille', async () => {
    imports.resolve.mockResolvedValue({
      kind: 'list',
      items: [
        {
          ref: 'mixcloud:/nota/a/',
          title: 'Un mix',
          coverUrl: 'https://img.test/a.jpg',
          publishedAt: '2026-01-01T00:00:00Z',
          pageUrl: 'https://www.mixcloud.com/nota/a/',
        },
      ],
    });

    const resolved = await resolver.resolve('https://www.mixcloud.com/nota/');

    expect(resolved.items).toEqual([
      {
        title: 'Un mix',
        pageUrl: 'https://www.mixcloud.com/nota/a/',
        coverUrl: 'https://img.test/a.jpg',
        publishedAt: '2026-01-01T00:00:00Z',
      },
    ]);
  });

  it('écarte les items sans adresse de page plutôt que d’afficher un lien mort', async () => {
    imports.resolve.mockResolvedValue({
      kind: 'list',
      items: [
        { ref: 'a', title: 'Sans page' },
        { ref: 'b', title: 'Avec page', pageUrl: 'https://ok.test/b' },
      ],
    });

    const resolved = await resolver.resolve('https://ok.test/liste');

    expect(resolved.items).toHaveLength(1);
    expect(resolved.items[0].title).toBe('Avec page');
  });

  it('refuse une adresse qui ne désigne qu’un seul mix', async () => {
    imports.resolve.mockResolvedValue({
      kind: 'mix',
      mix: { title: 'Un mix' },
    });

    await expect(
      resolver.resolve('https://ouiedire.net/emission/ailleurs-331'),
    ).rejects.toThrow(/un seul mix/i);
  });

  it('retrouve le flux déclaré dans le HTML quand rien d’autre ne marche', async () => {
    imports.resolve
      .mockRejectedValueOnce(new BadRequestException('Lien non reconnu'))
      .mockResolvedValueOnce({
        kind: 'list',
        items: [{ ref: 'a', title: 'Épisode', pageUrl: 'https://blog.test/1' }],
      });
    fetchMock.mockResolvedValue({
      body: Buffer.from(
        '<html><head><link rel="alternate" type="application/rss+xml" href="/rss.xml"></head></html>',
      ),
    });

    const resolved = await resolver.resolve('https://blog.test/');

    expect(imports.resolve).toHaveBeenLastCalledWith(
      'https://blog.test/rss.xml',
    );
    expect(resolved.url).toBe('https://blog.test/rss.xml');
    expect(resolved.items).toHaveLength(1);
  });

  it('dit quoi donner quand aucun maillon ne trouve de liste', async () => {
    imports.resolve.mockRejectedValue(
      new BadRequestException('Lien non reconnu'),
    );
    fetchMock.mockResolvedValue({ body: Buffer.from('<html></html>') });

    await expect(resolver.resolve('https://rien.test/')).rejects.toThrow(
      /page d’un artiste, d’un label/i,
    );
  });

  it('remonte tel quel le message d’un importeur spécifique, sans tenter l’autodétection', async () => {
    // Quand l'importeur qui réclame l'URL n'est pas le fourre-tout, son
    // message est autoritaire : par exemple SoundCloud qui explique qu'une
    // page de compte ne se liste pas. L'avaler pour retomber sur
    // l'autodétection remplacerait ce message précis par le générique de fin
    // de chaîne — pire pour l'utilisateur, pas mieux.
    imports.importerFor.mockReturnValue({ name: 'soundcloud' });
    imports.resolve.mockRejectedValue(
      new BadRequestException(
        "SoundCloud ne permet pas de lister les pistes d'un compte. Colle l'adresse d'une piste ou d'un set.",
      ),
    );

    await expect(
      resolver.resolve('https://soundcloud.com/un-compte'),
    ).rejects.toThrow(/colle l'adresse d'une piste ou d'un set/i);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
