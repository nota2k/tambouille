import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { XMLParser } from 'fast-xml-parser';
import request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import * as fournees from './fournees.reader';
import { FeedsController } from './feeds.controller';
import { FeedsService } from './feeds.service';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  isArray: (name) => name === 'item',
});

function createPrismaMock() {
  return {
    mix: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findUnique: jest.fn() },
    playlist: { findUnique: jest.fn() },
  };
}

/** Un mix hébergé sur R2, donc téléchargeable. */
function hosted(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    title: `Mix ${id}`,
    description: 'Deux heures de dub.',
    coverUrl: 'covers/abc.jpg',
    durationSec: 3600,
    createdAt: new Date('2026-08-19T05:00:00.000Z'),
    audioUrl: `audio/${id}.mp3`,
    sourceType: null,
    sourceRef: null,
    ...overrides,
  };
}

/** Un mix Mixcloud : aucune URL de fichier n'existe pour lui. */
function mixcloud(id: string) {
  return hosted(id, {
    audioUrl: null,
    sourceType: 'mixcloud',
    sourceRef: '/Notamusic/antimythes/',
  });
}

describe('FeedsController', () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeAll(() => {
    process.env.R2_PUBLIC_URL = 'https://cdn.example';
    process.env.FRONTEND_URL = 'https://tambouille.example';
  });

  beforeEach(async () => {
    prisma = createPrismaMock();
    const moduleRef = await Test.createTestingModule({
      controllers: [FeedsController],
      providers: [FeedsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    app = moduleRef.createNestApplication();
    // Comme `main.ts` : les URL publiées doivent porter le même préfixe qu'en
    // production, sans quoi les enclosures du test ne prouvent rien.
    app.setGlobalPrefix('api');
    // `listen` et non `init` : sans serveur déjà à l'écoute, supertest en ouvre
    // un sur un port neuf à chaque appel. L'URL `atom:link rel="self"` porte
    // ce port, donc le document changerait entre deux requêtes du même test et
    // aucun `ETag` ne pourrait correspondre.
    await app.listen(0);
  });

  afterEach(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();
  const channelOf = (body: string) => parser.parse(body).rss.channel;
  const itemsOf = (body: string) => channelOf(body).item ?? [];

  describe('flux du site', () => {
    it('sert du RSS, sans authentification, avec un validateur', async () => {
      prisma.mix.findMany.mockResolvedValue([hosted('a')]);

      const response = await request(server()).get('/api/rss').expect(200);

      expect(response.headers['content-type']).toContain('application/rss+xml');
      expect(response.headers.etag).toBeDefined();
      expect(response.headers['cache-control']).toContain('max-age=900');
      expect(channelOf(response.text)['atom:link']['@href']).toMatch(
        /^http:\/\/127\.0\.0\.1:\d+\/api\/rss$/,
      );
    });

    it('ne demande que les cinquante plus récents', async () => {
      await request(server()).get('/api/rss').expect(200);

      expect(prisma.mix.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('publie des URL absolues, et une enclosure qui passe par la résolution', async () => {
      prisma.mix.findMany.mockResolvedValue([hosted('a')]);

      const [item] = itemsOf((await request(server()).get('/api/rss')).text);

      expect(item.link).toBe('https://tambouille.example/mixes/a');
      expect(item.enclosure['@url']).toContain('/api/mixes/a/audio');
      // Jamais l'URL d'hébergement : elle vivrait des années chez l'abonné.
      expect(item.enclosure['@url']).not.toContain('cdn.example');
      expect(item['itunes:image']['@href']).toBe(
        'https://cdn.example/covers/abc.jpg',
      );
    });
  });

  describe('description', () => {
    it('publie la description débarrassée de son balisage', async () => {
      prisma.mix.findMany.mockResolvedValue([
        hosted('a', {
          description: '<p>Deux heures de <b>dub</b></p><p>sous la pluie.</p>',
        }),
      ]);

      const [item] = itemsOf((await request(server()).get('/api/rss')).text);

      expect(item.description).toBe('Deux heures de dub\nsous la pluie.');
    });
  });

  describe('aucun mix omis', () => {
    it('garde les mix Mixcloud, sans enclosure', async () => {
      prisma.mix.findMany.mockResolvedValue([
        hosted('a'),
        mixcloud('b'),
        hosted('c'),
        mixcloud('d'),
        hosted('e'),
      ]);

      const items = itemsOf((await request(server()).get('/api/rss')).text);

      expect(items).toHaveLength(5);
      expect(items.filter((item: any) => item.enclosure)).toHaveLength(3);
    });

    it("dit, sur l'item et sur le flux, où écouter ce qui n'est pas téléchargeable", async () => {
      prisma.mix.findMany.mockResolvedValue([mixcloud('b')]);

      const body = (await request(server()).get('/api/rss')).text;
      const [item] = itemsOf(body);

      expect(item.enclosure).toBeUndefined();
      expect(item.link).toBe('https://tambouille.example/mixes/b');
      expect(item.description).toContain('page du mix');
      expect(channelOf(body).description).toContain('s’écoutent sur le site');
    });

    it("rend un item par mix quand aucun n'est téléchargeable", async () => {
      prisma.mix.findMany.mockResolvedValue([mixcloud('b'), mixcloud('d')]);

      const items = itemsOf((await request(server()).get('/api/rss')).text);

      expect(items).toHaveLength(2);
      expect(items.every((item: any) => !item.enclosure)).toBe(true);
    });
  });

  describe('fraîcheur', () => {
    it('répond 304 sans corps quand le flux est inchangé', async () => {
      prisma.mix.findMany.mockResolvedValue([hosted('a')]);
      const first = await request(server()).get('/api/rss').expect(200);

      const second = await request(server())
        .get('/api/rss')
        .set('If-None-Match', first.headers.etag)
        .expect(304);

      expect(second.text).toBeFalsy();
    });

    it('renvoie le corps complet dès que le flux change', async () => {
      prisma.mix.findMany.mockResolvedValue([hosted('a')]);
      const first = await request(server()).get('/api/rss').expect(200);

      prisma.mix.findMany.mockResolvedValue([hosted('a'), hosted('b')]);
      const second = await request(server())
        .get('/api/rss')
        .set('If-None-Match', first.headers.etag)
        .expect(200);

      expect(second.headers.etag).not.toBe(first.headers.etag);
      expect(itemsOf(second.text)).toHaveLength(2);
    });

    it('renvoie le corps complet quand seul un titre change', async () => {
      prisma.mix.findMany.mockResolvedValue([hosted('a')]);
      const first = await request(server()).get('/api/rss').expect(200);

      prisma.mix.findMany.mockResolvedValue([
        hosted('a', { title: 'Autre titre' }),
      ]);
      await request(server())
        .get('/api/rss')
        .set('If-None-Match', first.headers.etag)
        .expect(200);
    });
  });

  describe('flux de curateur', () => {
    it('ne prend que les mix de cet utilisateur, et son avatar', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        displayName: 'Pierrot',
        bio: 'Du dub, surtout.',
        avatarUrl: 'avatars/p.jpg',
      });
      prisma.mix.findMany.mockResolvedValue([hosted('a')]);

      const body = (await request(server()).get('/api/users/pierrot/rss')).text;
      const channel = channelOf(body);

      expect(prisma.mix.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1' }, take: 50 }),
      );
      expect(channel.title).toContain('Pierrot');
      expect(channel.description).toContain('Du dub');
      expect(channel.link).toBe('https://tambouille.example/users/pierrot');
      expect(channel['itunes:image']['@href']).toBe(
        'https://cdn.example/avatars/p.jpg',
      );
    });

    it('répond 404 sur un nom inconnu, plutôt qu’un flux vide', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await request(server()).get('/api/users/fantome/rss').expect(404);
      expect(prisma.mix.findMany).not.toHaveBeenCalled();
    });
  });

  describe('flux de playlist', () => {
    function playlistOf(...mixes: Record<string, unknown>[]) {
      return {
        title: 'Nuit de quinze heures',
        description: null,
        user: { displayName: 'Pierrot' },
        items: mixes.map((mix) => ({ mix })),
      };
    }

    it("suit l'ordre de la playlist, pas la chronologie", async () => {
      prisma.playlist.findUnique.mockResolvedValue(
        playlistOf(
          hosted('c', { createdAt: new Date('2020-01-01T00:00:00.000Z') }),
          hosted('a'),
        ),
      );

      const items = itemsOf(
        (await request(server()).get('/api/playlists/p1/rss')).text,
      );

      expect(items.map((item: any) => item.guid['#text'])).toEqual(['c', 'a']);
      expect(prisma.playlist.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            items: expect.objectContaining({
              orderBy: { position: 'asc' },
              take: 50,
            }),
          }),
        }),
      );
    });

    it('répond 404 sur une playlist inconnue', async () => {
      prisma.playlist.findUnique.mockResolvedValue(null);
      await request(server()).get('/api/playlists/absente/rss').expect(404);
    });
  });

  /**
   * La passe de validation hors ligne : ce que RSS 2.0 exige de tout flux, et
   * ce que le validateur du W3C signale en premier. Elle porte sur un document
   * rendu par la pile complète, pas sur un `FeedChannel` fabriqué.
   */
  describe('conformité RSS 2.0', () => {
    it('porte les éléments obligatoires, des dates RFC 822 et des guid uniques', async () => {
      prisma.mix.findMany.mockResolvedValue([
        hosted('a'),
        mixcloud('b'),
        hosted('c', { description: null, coverUrl: null, durationSec: null }),
      ]);

      const body = (await request(server()).get('/api/rss')).text;
      const channel = channelOf(body);

      for (const requis of ['title', 'link', 'description']) {
        expect(channel[requis]).toBeTruthy();
      }

      const items = itemsOf(body);
      const guids = items.map((item: any) => item.guid['#text']);
      expect(new Set(guids).size).toBe(guids.length);

      for (const item of items) {
        // « An item MUST contain either a title or description. »
        expect(item.title || item.description).toBeTruthy();
        expect(Number.isNaN(Date.parse(item.pubDate))).toBe(false);
        expect(item.pubDate).toMatch(
          /^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/,
        );
        expect(item.link).toMatch(/^https?:\/\//);
        if (item.enclosure) {
          expect(item.enclosure['@url']).toMatch(/^https?:\/\//);
          expect(item.enclosure['@type']).toMatch(/^audio\//);
          expect(item.enclosure['@length']).toBeDefined();
        }
      }
    });
  });

  describe('flux de fournée', () => {
    const FOURNEE = {
      number: 1,
      title: 'Nuit de quinze heures',
      period: 'Tout l’hiver',
      intro: 'Il fait noir à 16 h et ça nous va.',
      mixIds: ['c', 'a'],
    };

    function fourneesDisponibles(...liste: (typeof FOURNEE)[]) {
      jest.spyOn(fournees, 'readFournees').mockReturnValue(liste);
    }

    it("suit l'ordre du fichier, et titre le flux avec son numéro", async () => {
      fourneesDisponibles(FOURNEE);
      // La base rend l'ordre qu'elle veut ; le fichier décide.
      prisma.mix.findMany.mockResolvedValue([hosted('a'), hosted('c')]);

      const body = (await request(server()).get('/api/fournees/1/rss')).text;

      expect(itemsOf(body).map((item: any) => item.guid['#text'])).toEqual([
        'c',
        'a',
      ]);
      expect(channelOf(body).title).toContain('n°1');
      expect(channelOf(body).description).toContain('Il fait noir');
    });

    it('sert une fournée dont la période est révolue', async () => {
      // Le bandeau disparaît à ses dates ; le flux, non. Des abonnés le
      // détiennent.
      fourneesDisponibles(FOURNEE);
      prisma.mix.findMany.mockResolvedValue([hosted('c')]);

      await request(server()).get('/api/fournees/1/rss').expect(200);
    });

    it('laisse tomber un identifiant qui ne résout plus', async () => {
      fourneesDisponibles(FOURNEE);
      prisma.mix.findMany.mockResolvedValue([hosted('c')]);

      const items = itemsOf(
        (await request(server()).get('/api/fournees/1/rss')).text,
      );
      expect(items).toHaveLength(1);
    });

    it('répond 404 sur un numéro inconnu', async () => {
      fourneesDisponibles(FOURNEE);
      await request(server()).get('/api/fournees/7/rss').expect(404);
    });

    it('répond par une erreur serveur nommant le fichier illisible', async () => {
      jest.spyOn(fournees, 'readFournees').mockImplementation(() => {
        throw new fournees.FourneeParseError(
          '2026-hiver.md',
          'frontmatter absent',
        );
      });

      const response = await request(server())
        .get('/api/fournees/1/rss')
        .expect(500);
      expect(JSON.stringify(response.body)).toContain('2026-hiver.md');
    });

    it("n'empêche pas les autres flux de servir", async () => {
      jest.spyOn(fournees, 'readFournees').mockImplementation(() => {
        throw new fournees.FourneeParseError(
          '2026-hiver.md',
          'frontmatter absent',
        );
      });
      prisma.mix.findMany.mockResolvedValue([hosted('a')]);

      await request(server()).get('/api/rss').expect(200);
    });
  });
});
