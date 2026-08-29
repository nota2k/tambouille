import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import { PreviewController } from './preview.controller';
import { PreviewService } from './preview.service';

function createPrismaMock() {
  return {
    mix: { findUnique: jest.fn(), findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
    playlist: { findUnique: jest.fn() },
  };
}

/** Un mix hébergé sur R2, donc avec une pochette et un fichier jouable. */
function mix(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mix-1',
    title: 'Tabouïedire',
    slug: 'tabouiedire',
    description: 'Deux heures de dub.',
    artist: 'Klaus Vomi',
    coverUrl: 'covers/abc.jpg',
    durationSec: 3600,
    createdAt: new Date('2026-08-19T05:00:00.000Z'),
    audioUrl: 'audio/mix-1.mp3',
    sourceType: null,
    sourceRef: null,
    tags: ['dub'],
    user: { displayName: 'Nelly Babillon', username: 'djnelly' },
    ...overrides,
  };
}

describe('PreviewController', () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeAll(() => {
    process.env.R2_PUBLIC_URL = 'https://cdn.example';
    process.env.FRONTEND_URL = 'https://tambouille.example';
  });

  beforeEach(async () => {
    prisma = createPrismaMock();
    const moduleRef = await Test.createTestingModule({
      controllers: [PreviewController],
      providers: [PreviewService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();

  describe('aperçu d’un mix', () => {
    it('sert du HTML, sans authentification, avec un validateur', async () => {
      prisma.mix.findUnique.mockResolvedValue(mix());

      const response = await request(server())
        .get('/api/preview/mixes/mix-1')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/html');
      expect(response.headers.etag).toBeDefined();
      expect(response.headers['cache-control']).toContain('max-age=900');
    });

    it('répond 304 au robot qui a déjà exactement ce document', async () => {
      prisma.mix.findUnique.mockResolvedValue(mix());

      const first = await request(server())
        .get('/api/preview/mixes/mix-1')
        .expect(200);

      await request(server())
        .get('/api/preview/mixes/mix-1')
        .set('If-None-Match', first.headers.etag)
        .expect(304);
    });

    it('annonce le mix, sa pochette et son audio, et pointe vers le site', async () => {
      prisma.mix.findUnique.mockResolvedValue(mix());

      const { text } = await request(server())
        .get('/api/preview/mixes/mix-1')
        .expect(200);

      expect(text).toContain(
        '<meta property="og:title" content="Tabouïedire par Klaus Vomi, mijoté par Nelly Babillon — Tambouille">',
      );
      expect(text).toContain(
        '<meta property="og:image" content="https://cdn.example/covers/abc.jpg">',
      );
      expect(text).toContain(
        '<meta property="og:audio" content="https://cdn.example/audio/mix-1.mp3">',
      );
      // La canonique est l'adresse à deux segments, même atteinte par l'ancienne.
      expect(text).toContain(
        '<meta property="og:url" content="https://tambouille.example/mixes/djnelly/tabouiedire">',
      );
    });

    it('nomme l’artiste ET le compte qui a déposé le mix', async () => {
      prisma.mix.findFirst.mockResolvedValue(mix());

      const { text } = await request(server())
        .get('/api/preview/mixes/djnelly/tabouiedire')
        .expect(200);

      expect(text).toContain(
        'Tabouïedire par Klaus Vomi, mijoté par Nelly Babillon',
      );
    });

    it('met en avant l’artiste, et le compte à défaut — comme la page du mix', async () => {
      prisma.mix.findUnique.mockResolvedValue(mix({ artist: null }));

      const { text } = await request(server())
        .get('/api/preview/mixes/mix-1')
        .expect(200);

      expect(text).toContain(
        '<meta property="og:title" content="Tabouïedire par Nelly Babillon — Tambouille">',
      );
    });

    it('ne répète pas le nom quand l’artiste EST le compte', async () => {
      prisma.mix.findFirst.mockResolvedValue(mix({ artist: 'nelly babillon' }));

      const { text } = await request(server())
        .get('/api/preview/mixes/djnelly/tabouiedire')
        .expect(200);

      expect(text).toContain(
        '<meta property="og:title" content="Tabouïedire par Nelly Babillon — Tambouille">',
      );
      expect(text).not.toContain('mijoté par');
    });

    it('sert l’adresse canonique à deux segments, celle que le site publie', async () => {
      prisma.mix.findFirst.mockResolvedValue(mix());

      const { text } = await request(server())
        .get('/api/preview/mixes/djnelly/tabouiedire')
        .expect(200);

      expect(prisma.mix.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ slug: 'tabouiedire' }),
        }),
      );
      expect(text).toContain(
        '<meta property="og:image" content="https://cdn.example/covers/abc.jpg">',
      );
    });

    it('répond 404 sur un couple compte/slug inconnu', async () => {
      prisma.mix.findFirst.mockResolvedValue(null);

      await request(server())
        .get('/api/preview/mixes/djnelly/nope')
        .expect(404);
    });

    it('retombe sur l’ancienne adresse quand le compte n’a pas encore d’username', async () => {
      prisma.mix.findUnique.mockResolvedValue(
        mix({ user: { displayName: 'Nelly Babillon', username: null } }),
      );

      const { text } = await request(server())
        .get('/api/preview/mixes/mix-1')
        .expect(200);

      expect(text).toContain(
        '<meta property="og:url" content="https://tambouille.example/mixes/mix-1">',
      );
    });

    it('n’annonce pas d’audio pour un mix Mixcloud, qui n’expose aucun fichier', async () => {
      prisma.mix.findUnique.mockResolvedValue(
        mix({
          audioUrl: null,
          sourceType: 'mixcloud',
          sourceRef: '/Notamusic/antimythes/',
        }),
      );

      const { text } = await request(server())
        .get('/api/preview/mixes/mix-1')
        .expect(200);

      expect(text).not.toContain('og:audio');
    });

    it('répond 404 sur un mix inconnu plutôt qu’un aperçu vide', async () => {
      prisma.mix.findUnique.mockResolvedValue(null);

      await request(server()).get('/api/preview/mixes/nope').expect(404);
    });
  });

  describe('aperçu d’un profil', () => {
    it('annonce le membre, sa bio et son avatar', async () => {
      prisma.user.findUnique.mockResolvedValue({
        username: 'nelly',
        displayName: 'Nelly Babillon',
        bio: 'Je mijote.',
        avatarUrl: 'avatars/nelly.png',
        _count: { mixes: 12 },
      });

      const { text } = await request(server())
        .get('/api/preview/users/nelly')
        .expect(200);

      expect(text).toContain(
        '<meta property="og:title" content="Nelly Babillon — Tambouille">',
      );
      expect(text).toContain('<meta name="description" content="Je mijote.">');
      expect(text).toContain(
        '<meta property="og:image" content="https://cdn.example/avatars/nelly.png">',
      );
      expect(text).toContain(
        '<meta property="og:url" content="https://tambouille.example/users/nelly">',
      );
    });

    it('décrit un profil sans bio par ce qu’il contient', async () => {
      prisma.user.findUnique.mockResolvedValue({
        username: 'nelly',
        displayName: 'Nelly Babillon',
        bio: null,
        avatarUrl: null,
        _count: { mixes: 12 },
      });

      const { text } = await request(server())
        .get('/api/preview/users/nelly')
        .expect(200);

      expect(text).toContain(
        'content="Les mix de Nelly Babillon sur Tambouille — 12 mix publiés."',
      );
    });
  });

  describe('aperçu d’une playlist', () => {
    it('annonce la playlist, son auteur et la première pochette disponible', async () => {
      prisma.playlist.findUnique.mockResolvedValue({
        id: 'pl-1',
        title: 'Pour la route',
        description: null,
        user: { displayName: 'Nelly Babillon' },
        _count: { items: 7 },
        items: [{ mix: { coverUrl: 'covers/xyz.jpg' } }],
      });

      const { text } = await request(server())
        .get('/api/preview/playlists/pl-1')
        .expect(200);

      expect(text).toContain(
        '<meta property="og:title" content="Pour la route, une playlist de Nelly Babillon — Tambouille">',
      );
      expect(text).toContain(
        'content="Une playlist de Nelly Babillon sur Tambouille, 7 mix à écouter."',
      );
      expect(text).toContain(
        '<meta property="og:image" content="https://cdn.example/covers/xyz.jpg">',
      );
    });

    it('se passe de vignette quand aucun mix de la playlist n’a de pochette', async () => {
      prisma.playlist.findUnique.mockResolvedValue({
        id: 'pl-1',
        title: 'Pour la route',
        description: null,
        user: { displayName: 'Nelly Babillon' },
        _count: { items: 2 },
        items: [],
      });

      const { text } = await request(server())
        .get('/api/preview/playlists/pl-1')
        .expect(200);

      expect(text).not.toContain('og:image');
      expect(text).toContain('<meta name="twitter:card" content="summary">');
    });
  });
});
