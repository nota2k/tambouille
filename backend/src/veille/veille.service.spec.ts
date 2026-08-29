import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VeilleService } from './veille.service';
import { CACHE_TTL_MS } from './veille.types';

function source(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'src-1',
    userId: 'u-1',
    url: 'https://a.test/feed',
    label: 'A',
    resolver: 'a.test',
    items: [{ title: 'Item A', pageUrl: 'https://a.test/1' }],
    fetchedAt: new Date(),
    lastError: null,
    position: 0,
    ...over,
  };
}

describe('VeilleService', () => {
  let prisma: {
    user: { findUnique: jest.Mock };
    watchedSource: {
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      findFirst: jest.Mock;
      delete: jest.Mock;
    };
  };
  let resolver: { resolve: jest.Mock };
  let service: VeilleService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u-1' }) },
      watchedSource: {
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
    };
    resolver = { resolve: jest.fn() };
    service = new VeilleService(prisma as never, resolver as never);
  });

  it('sert un cache frais sans toucher au réseau', async () => {
    prisma.watchedSource.findMany.mockResolvedValue([source()]);

    const feed = await service.getFeed('nota');

    expect(resolver.resolve).not.toHaveBeenCalled();
    expect(feed.items).toHaveLength(1);
    expect(feed.items[0].sourceLabel).toBe('A');
  });

  it('rafraîchit un cache périmé', async () => {
    prisma.watchedSource.findMany.mockResolvedValue([
      source({ fetchedAt: new Date(Date.now() - CACHE_TTL_MS - 1000) }),
    ]);
    resolver.resolve.mockResolvedValue({
      resolver: 'a.test',
      label: 'A',
      url: 'https://a.test/feed',
      items: [{ title: 'Neuf', pageUrl: 'https://a.test/2' }],
    });

    const feed = await service.getFeed('nota');

    expect(resolver.resolve).toHaveBeenCalledWith('https://a.test/feed');
    expect(feed.items[0].title).toBe('Neuf');
    expect(prisma.watchedSource.update).toHaveBeenCalled();
  });

  it('sert l’instantané périmé quand la source échoue, sans bloquer les autres', async () => {
    const vieux = new Date(Date.now() - CACHE_TTL_MS - 1000);
    prisma.watchedSource.findMany.mockResolvedValue([
      source({ id: 'src-1', fetchedAt: vieux }),
      source({
        id: 'src-2',
        url: 'https://b.test/feed',
        label: 'B',
        items: [{ title: 'Item B', pageUrl: 'https://b.test/1' }],
        fetchedAt: vieux,
      }),
    ]);
    resolver.resolve.mockImplementation((url: string) =>
      url.includes('a.test')
        ? Promise.reject(new Error('502'))
        : Promise.resolve({
            resolver: 'b.test',
            label: 'B',
            url,
            items: [{ title: 'B neuf', pageUrl: 'https://b.test/2' }],
          }),
    );

    const feed = await service.getFeed('nota', 'u-1');

    expect(feed.items.map((i) => i.title).sort()).toEqual(['B neuf', 'Item A']);
    expect(feed.sources.find((s) => s.id === 'src-1')?.lastError).toBeTruthy();
  });

  it('masque lastError à qui n’est pas le titulaire', async () => {
    prisma.watchedSource.findMany.mockResolvedValue([
      source({ lastError: 'boum' }),
    ]);

    const feed = await service.getFeed('nota', 'quelqu-un-dautre');

    expect(feed.sources[0].lastError).toBeUndefined();
  });

  it('trie par date décroissante, les items sans date en dernier', async () => {
    prisma.watchedSource.findMany.mockResolvedValue([
      source({
        items: [
          { title: 'Sans date', pageUrl: 'https://a.test/3' },
          { title: 'Vieux', pageUrl: 'https://a.test/1', publishedAt: '2020-01-01T00:00:00Z' },
          { title: 'Récent', pageUrl: 'https://a.test/2', publishedAt: '2026-01-01T00:00:00Z' },
        ],
      }),
    ]);

    const feed = await service.getFeed('nota');

    expect(feed.items.map((i) => i.title)).toEqual(['Récent', 'Vieux', 'Sans date']);
  });

  it('fusionne en tourniquet par source plutôt qu’en tri global, même si une source ne date rien', async () => {
    // Source A (position 0) : Bandcamp-like, aucune date. Trois items, dans
    // l'ordre où le résolveur les a trouvés.
    // Source B (position 1) : datée, dont un item très ancien.
    prisma.watchedSource.findMany.mockResolvedValue([
      source({
        id: 'src-a',
        label: 'A',
        position: 0,
        items: [
          { title: 'A1', pageUrl: 'https://a.test/1' },
          { title: 'A2', pageUrl: 'https://a.test/2' },
          { title: 'A3', pageUrl: 'https://a.test/3' },
        ],
      }),
      source({
        id: 'src-b',
        label: 'B',
        position: 1,
        items: [
          {
            title: 'B-vieux',
            pageUrl: 'https://b.test/1',
            publishedAt: '2019-01-01T00:00:00Z',
          },
          {
            title: 'B-recent',
            pageUrl: 'https://b.test/2',
            publishedAt: '2026-01-01T00:00:00Z',
          },
        ],
      }),
    ]);

    const feed = await service.getFeed('nota');

    // Un tri global par date aurait mis B-vieux (daté, même ancien) devant
    // tous les items non datés de A. Le tourniquet doit au contraire alterner
    // par source : rang 0 de chaque source, puis rang 1, etc.
    expect(feed.items.map((i) => i.title)).toEqual([
      'A1',
      'B-recent',
      'A2',
      'B-vieux',
      'A3',
    ]);
  });

  it('refuse la neuvième source', async () => {
    prisma.watchedSource.count.mockResolvedValue(8);

    await expect(service.addSource('u-1', 'https://c.test/')).rejects.toThrow(
      BadRequestException,
    );
    expect(resolver.resolve).not.toHaveBeenCalled();
  });

  it('enregistre l’adresse rendue par le résolveur, pas celle saisie', async () => {
    resolver.resolve.mockResolvedValue({
      resolver: 'podcast',
      label: 'Blog',
      url: 'https://blog.test/rss.xml',
      items: [{ title: 'A', pageUrl: 'https://blog.test/1' }],
    });
    prisma.watchedSource.create.mockImplementation(({ data }) => ({
      ...data,
      id: 'src-9',
    }));

    await service.addSource('u-1', 'https://blog.test/');

    expect(prisma.watchedSource.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ url: 'https://blog.test/rss.xml' }),
      }),
    );
  });

  it('ne laisse pas modifier la source d’un autre', async () => {
    prisma.watchedSource.findFirst.mockResolvedValue(null);

    await expect(
      service.updateSource('u-2', 'src-1', { label: 'Volé' }),
    ).rejects.toThrow(NotFoundException);
  });
});
