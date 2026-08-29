import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
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
  let resolver: { resolve: jest.Mock; refresh: jest.Mock };
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
    resolver = { resolve: jest.fn(), refresh: jest.fn() };
    service = new VeilleService(prisma as never, resolver as never);
  });

  it('sert un cache frais sans toucher au réseau', async () => {
    prisma.watchedSource.findMany.mockResolvedValue([source()]);

    const feed = await service.getFeed('nota');

    expect(resolver.refresh).not.toHaveBeenCalled();
    expect(feed.items).toHaveLength(1);
    expect(feed.items[0].sourceLabel).toBe('A');
  });

  it('rafraîchit un cache périmé', async () => {
    prisma.watchedSource.findMany.mockResolvedValue([
      source({ fetchedAt: new Date(Date.now() - CACHE_TTL_MS - 1000) }),
    ]);
    resolver.refresh.mockResolvedValue({
      resolver: 'a.test',
      label: 'A',
      url: 'https://a.test/feed',
      items: [{ title: 'Neuf', pageUrl: 'https://a.test/2' }],
    });

    const feed = await service.getFeed('nota');

    // L'URL stockée est relue telle quelle, via `refresh` et non `resolve` :
    // voir I4, `resolve` re-canonicaliserait et pourrait en changer la query.
    expect(resolver.refresh).toHaveBeenCalledWith('https://a.test/feed');
    expect(feed.items[0].title).toBe('Neuf');
    expect(prisma.watchedSource.update).toHaveBeenCalled();
  });

  it("l'URL passée au rafraîchissement est exactement celle en base, query comprise", async () => {
    // Un flux autodétecté stocke son URL query comprise ("?type=full" choisit
    // lequel des flux du CMS). Si le rafraîchissement repassait par `resolve`,
    // qui canonicalise et retire la query, on lirait un flux différent sans
    // aucune erreur visible — voir I4.
    prisma.watchedSource.findMany.mockResolvedValue([
      source({
        url: 'https://cms.test/feed?type=full',
        fetchedAt: new Date(Date.now() - CACHE_TTL_MS - 1000),
      }),
    ]);
    resolver.refresh.mockResolvedValue({
      resolver: 'cms.test',
      label: 'A',
      url: 'https://cms.test/feed?type=full',
      items: [{ title: 'Neuf', pageUrl: 'https://cms.test/2' }],
    });

    await service.getFeed('nota');

    expect(resolver.refresh).toHaveBeenCalledWith(
      'https://cms.test/feed?type=full',
    );
    expect(resolver.resolve).not.toHaveBeenCalled();
  });

  it('sert l’instantané périmé quand la source échoue, sans bloquer les autres', async () => {
    const vieux = new Date(Date.now() - CACHE_TTL_MS - 1000);
    prisma.watchedSource.findMany.mockResolvedValue([
      source({
        id: 'src-1',
        fetchedAt: vieux,
        // Datée plus récente que le fresh de B ci-dessous : si le code
        // rendait [] au lieu de retomber sur ce cache, ou s'il l'ignorait,
        // cet item ne pourrait apparaître par aucune autre voie — la seule
        // façon de le voir gagner la place unique est que `freshItems` ait
        // bien servi l'instantané périmé de A après l'échec de son résolveur.
        items: [
          {
            title: 'A périmé',
            pageUrl: 'https://a.test/1',
            publishedAt: '2026-06-01T00:00:00Z',
          },
        ],
      }),
      source({
        id: 'src-2',
        url: 'https://b.test/feed',
        label: 'B',
        items: [{ title: 'Item B', pageUrl: 'https://b.test/1' }],
        fetchedAt: vieux,
      }),
    ]);
    resolver.refresh.mockImplementation((url: string) =>
      url.includes('a.test')
        ? Promise.reject(new Error('502'))
        : Promise.resolve({
            resolver: 'b.test',
            label: 'B',
            url,
            items: [
              {
                title: 'B neuf',
                pageUrl: 'https://b.test/2',
                publishedAt: '2020-01-01T00:00:00Z',
              },
            ],
          }),
    );

    const feed = await service.getFeed('nota', 'u-1');

    // L'échec de A n'a pas empêché B de se rafraîchir…
    expect(resolver.refresh).toHaveBeenCalledWith('https://b.test/feed');
    // … et l'instantané périmé de A (rang 0 de la source en position 0) est
    // bien rendu, aux côtés du fresh de B : la panne de A ne l'a pas vidé de
    // son cache, elle ne l'a pas non plus fait disparaître du tourniquet.
    expect(feed.items).toEqual([
      {
        title: 'A périmé',
        pageUrl: 'https://a.test/1',
        publishedAt: '2026-06-01T00:00:00Z',
        sourceLabel: 'A',
      },
      {
        title: 'B neuf',
        pageUrl: 'https://b.test/2',
        publishedAt: '2020-01-01T00:00:00Z',
        sourceLabel: 'B',
      },
    ]);
    expect(feed.sources.find((s) => s.id === 'src-1')?.lastError).toBeTruthy();
  });

  it('rend quand même le feed si l’écriture du cache échoue après un échec réseau', async () => {
    const vieux = new Date(Date.now() - CACHE_TTL_MS - 1000);
    prisma.watchedSource.findMany.mockResolvedValue([
      source({
        id: 'src-1',
        fetchedAt: vieux,
        items: [
          {
            title: 'A périmé',
            pageUrl: 'https://a.test/1',
            publishedAt: '2026-06-01T00:00:00Z',
          },
        ],
      }),
      source({
        id: 'src-2',
        url: 'https://b.test/feed',
        label: 'B',
        items: [{ title: 'Item B', pageUrl: 'https://b.test/1' }],
        fetchedAt: vieux,
      }),
    ]);
    resolver.refresh.mockImplementation((url: string) =>
      url.includes('a.test')
        ? Promise.reject(new Error('502'))
        : Promise.resolve({
            resolver: 'b.test',
            label: 'B',
            url,
            items: [
              {
                title: 'B neuf',
                pageUrl: 'https://b.test/2',
                publishedAt: '2020-01-01T00:00:00Z',
              },
            ],
          }),
    );
    // Même la tentative d'enregistrer le message d'erreur échoue (incident
    // base transitoire). La lecture du feed ne doit pas en dépendre.
    prisma.watchedSource.update.mockRejectedValue(new Error('DB down'));

    const feed = await service.getFeed('nota', 'u-1');

    expect(resolver.refresh).toHaveBeenCalledWith('https://b.test/feed');
    expect(feed.items).toEqual([
      {
        title: 'A périmé',
        pageUrl: 'https://a.test/1',
        publishedAt: '2026-06-01T00:00:00Z',
        sourceLabel: 'A',
      },
      {
        title: 'B neuf',
        pageUrl: 'https://b.test/2',
        publishedAt: '2020-01-01T00:00:00Z',
        sourceLabel: 'B',
      },
    ]);
    expect(feed.sources.find((s) => s.id === 'src-1')?.lastError).toBeTruthy();
  });

  it('rend les items fraîchement résolus même si l’écriture du cache échoue', async () => {
    prisma.watchedSource.findMany.mockResolvedValue([
      source({ fetchedAt: new Date(Date.now() - CACHE_TTL_MS - 1000) }),
    ]);
    resolver.refresh.mockResolvedValue({
      resolver: 'a.test',
      label: 'A',
      url: 'https://a.test/feed',
      items: [{ title: 'Neuf', pageUrl: 'https://a.test/2' }],
    });
    prisma.watchedSource.update.mockRejectedValue(new Error('DB down'));

    const feed = await service.getFeed('nota');

    expect(feed.items.map((i) => i.title)).toEqual(['Neuf']);
  });

  it('rafraîchit la source saine même quand une autre est en panne', async () => {
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
    resolver.refresh.mockImplementation((url: string) =>
      url.includes('a.test')
        ? Promise.reject(new Error('502'))
        : Promise.resolve({
            resolver: 'b.test',
            label: 'B',
            url,
            items: [
              {
                title: 'B neuf',
                pageUrl: 'https://b.test/2',
                publishedAt: '2026-01-01T00:00:00Z',
              },
            ],
          }),
    );

    const feed = await service.getFeed('nota');

    expect(resolver.refresh).toHaveBeenCalledWith('https://b.test/feed');
    expect(feed.items.map((i) => i.title)).toContain('B neuf');
  });

  it('masque lastError à qui n’est pas le titulaire', async () => {
    prisma.watchedSource.findMany.mockResolvedValue([
      source({ lastError: 'boum' }),
    ]);

    const feed = await service.getFeed('nota', 'quelqu-un-dautre');

    expect(feed.sources[0].lastError).toBeUndefined();
  });

  it('rend une sortie par source, la plus récente en tête', async () => {
    prisma.watchedSource.findMany.mockResolvedValue([
      source({
        id: 'src-a',
        label: 'A',
        position: 0,
        items: [
          {
            title: 'A-recent',
            pageUrl: 'https://a.test/1',
            publishedAt: '2026-03-01T00:00:00Z',
          },
          {
            title: 'A-vieux',
            pageUrl: 'https://a.test/2',
            publishedAt: '2020-01-01T00:00:00Z',
          },
        ],
      }),
      source({
        id: 'src-b',
        label: 'B',
        position: 1,
        items: [
          {
            title: 'B-recent',
            pageUrl: 'https://b.test/1',
            publishedAt: '2026-06-01T00:00:00Z',
          },
        ],
      }),
      source({
        id: 'src-c',
        label: 'C',
        position: 2,
        items: [
          {
            title: 'C-recent',
            pageUrl: 'https://c.test/1',
            publishedAt: '2019-01-01T00:00:00Z',
          },
        ],
      }),
    ]);

    const feed = await service.getFeed('nota');

    // Une ligne par source (donc pas 'A-vieux', écarté au profit du seul
    // 'A-recent' de sa source), classées entre elles par date décroissante.
    expect(feed.items.map((i) => i.title)).toEqual([
      'B-recent',
      'A-recent',
      'C-recent',
    ]);
  });

  it('deux sources ne peuvent jamais contribuer deux lignes chacune', async () => {
    // Chaque source a plusieurs items déjà parus : l'ancienne règle en
    // tourniquet en aurait rendu plusieurs par source. La nouvelle n'en
    // retient qu'un, quel que soit le nombre d'items disponibles derrière.
    function sourceGarnie(id: string, label: string, position: number) {
      return source({
        id,
        label,
        position,
        items: Array.from({ length: 6 }, (_, i) => ({
          title: `${label}${i}`,
          pageUrl: `https://${id}.test/${i}`,
          publishedAt: new Date(2026, 0, 6 - i).toISOString(),
        })),
      });
    }
    prisma.watchedSource.findMany.mockResolvedValue([
      sourceGarnie('src-a', 'A', 0),
      sourceGarnie('src-b', 'B', 1),
    ]);

    const feed = await service.getFeed('nota');

    expect(feed.items).toHaveLength(2);
    expect(feed.items.map((i) => i.title)).toEqual(['A0', 'B0']);
  });

  it('une source dont la sortie la plus récente est une précommande contribue la suivante', async () => {
    const dansLeFutur = new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 30,
    ).toISOString();
    prisma.watchedSource.findMany.mockResolvedValue([
      source({
        id: 'src-a',
        label: 'A',
        position: 0,
        items: [
          {
            title: 'A-precommande',
            pageUrl: 'https://a.test/1',
            publishedAt: dansLeFutur,
          },
          {
            title: 'A-deja-sorti',
            pageUrl: 'https://a.test/2',
            publishedAt: '2020-01-01T00:00:00Z',
          },
        ],
      }),
    ]);

    const feed = await service.getFeed('nota');

    expect(feed.items.map((i) => i.title)).toEqual(['A-deja-sorti']);
  });

  it('une source dont toutes les sorties sont à venir ne contribue rien', async () => {
    const dansLeFutur = new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 30,
    ).toISOString();
    prisma.watchedSource.findMany.mockResolvedValue([
      source({
        id: 'src-a',
        label: 'A',
        position: 0,
        items: [
          {
            title: 'Précommande',
            pageUrl: 'https://a.test/1',
            publishedAt: dansLeFutur,
          },
        ],
      }),
      source({
        id: 'src-b',
        label: 'B',
        position: 1,
        items: [{ title: 'Sans date', pageUrl: 'https://b.test/1' }],
      }),
    ]);

    const feed = await service.getFeed('nota');

    // A ne contribue aucune ligne (aucun item déjà paru) ; elle ne laisse pas
    // de trou, elle disparaît simplement du feed.
    expect(feed.items.map((i) => i.title)).toEqual(['Sans date']);
  });

  it('une source sans aucune date contribue son premier item, classé après les sorties datées', async () => {
    prisma.watchedSource.findMany.mockResolvedValue([
      source({
        id: 'src-a',
        label: 'A',
        position: 0,
        items: [
          { title: 'A1-sans-date', pageUrl: 'https://a.test/1' },
          { title: 'A2-sans-date', pageUrl: 'https://a.test/2' },
        ],
      }),
      source({
        id: 'src-b',
        label: 'B',
        position: 1,
        items: [
          {
            title: 'B-vieux-mais-date',
            pageUrl: 'https://b.test/1',
            publishedAt: '2019-01-01T00:00:00Z',
          },
        ],
      }),
    ]);

    const feed = await service.getFeed('nota');

    // A ne disparaît pas faute de date : elle contribue son premier item,
    // mais celui-ci passe après B, daté même très anciennement.
    expect(feed.items.map((i) => i.title)).toEqual([
      'B-vieux-mais-date',
      'A1-sans-date',
    ]);
  });

  it('rend quand même les items non datés si aucune source n’en date aucun', async () => {
    prisma.watchedSource.findMany.mockResolvedValue([
      source({
        id: 'src-a',
        label: 'A',
        position: 0,
        items: [{ title: 'A1', pageUrl: 'https://a.test/1' }],
      }),
      source({
        id: 'src-b',
        label: 'B',
        position: 1,
        items: [{ title: 'B1', pageUrl: 'https://b.test/1' }],
      }),
    ]);

    const feed = await service.getFeed('nota');

    // Ni A1 ni B1 n'est daté : à égalité, l'ordre des positions des sources
    // départage.
    expect(feed.items.map((i) => i.title)).toEqual(['A1', 'B1']);
  });

  it('rend un feed sans item quand il n’y a aucune source', async () => {
    prisma.watchedSource.findMany.mockResolvedValue([]);

    const feed = await service.getFeed('nota');

    expect(feed.items).toEqual([]);
  });

  it('refuse la onzième source', async () => {
    prisma.watchedSource.count.mockResolvedValue(10);

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
    prisma.watchedSource.create.mockResolvedValue({
      id: 'src-9',
      label: 'Blog',
      url: 'https://blog.test/rss.xml',
    });

    await service.addSource('u-1', 'https://blog.test/');

    const calls = prisma.watchedSource.create.mock.calls as Array<
      [{ data: { url: string } }]
    >;
    expect(calls[0][0].data.url).toBe('https://blog.test/rss.xml');
  });

  it('ne laisse pas modifier la source d’un autre', async () => {
    prisma.watchedSource.findFirst.mockResolvedValue(null);

    await expect(
      service.updateSource('u-2', 'src-1', { label: 'Volé' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('ne laisse pas supprimer la source d’un autre', async () => {
    // `removeSource` doit la même vérification de propriété qu'`updateSource` :
    // le même garde, jamais couvert pour celle-ci jusqu'ici.
    prisma.watchedSource.findFirst.mockResolvedValue(null);

    await expect(service.removeSource('u-2', 'src-1')).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.watchedSource.delete).not.toHaveBeenCalled();
  });

  it('refuse un doublon à l’ajout', async () => {
    resolver.resolve.mockResolvedValue({
      resolver: 'a.test',
      label: 'A',
      url: 'https://a.test/feed',
      items: [{ title: 'A', pageUrl: 'https://a.test/1' }],
    });
    prisma.watchedSource.findFirst.mockResolvedValue({ id: 'src-1' });

    await expect(service.addSource('u-1', 'https://a.test/')).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.watchedSource.create).not.toHaveBeenCalled();
  });

  it("avance fetchedAt avant de tenter le rafraîchissement, pour qu'un échec d'écriture ne rouvre pas le cache", async () => {
    // Voir C1 : si `fetchedAt` n'avançait qu'après coup, un incident base
    // durable l'empêcherait d'avancer et la route publique re-résoudrait les
    // huit sources à chaque appel, indéfiniment — un amplificateur réseau.
    prisma.watchedSource.findMany.mockResolvedValue([
      source({ fetchedAt: new Date(Date.now() - CACHE_TTL_MS - 1000) }),
    ]);
    resolver.refresh.mockResolvedValue({
      resolver: 'a.test',
      label: 'A',
      url: 'https://a.test/feed',
      items: [{ title: 'Neuf', pageUrl: 'https://a.test/2' }],
    });

    await service.getFeed('nota');

    const calls = prisma.watchedSource.update.mock.calls as Array<
      [{ data: Record<string, unknown> }]
    >;
    // Le tout premier appel d'écriture, avant même d'avoir tenté le
    // rafraîchissement, ne porte que `fetchedAt` : c'est la réservation du
    // créneau, indépendante du succès de ce qui suit.
    expect(calls[0][0].data).toEqual({ fetchedAt: expect.any(Date) as Date });
  });

  it("trace dans les logs l'échec d'écriture du cache, plutôt que de l'avaler sans trace", async () => {
    const spy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    prisma.watchedSource.findMany.mockResolvedValue([
      source({ fetchedAt: new Date(Date.now() - CACHE_TTL_MS - 1000) }),
    ]);
    resolver.refresh.mockResolvedValue({
      resolver: 'a.test',
      label: 'A',
      url: 'https://a.test/feed',
      items: [{ title: 'Neuf', pageUrl: 'https://a.test/2' }],
    });
    prisma.watchedSource.update.mockRejectedValue(new Error('DB down'));

    await service.getFeed('nota');

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
