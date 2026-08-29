import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { XMLParser } from 'fast-xml-parser';
import request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import { SitemapController } from './sitemap.controller';
import { SitemapService } from './sitemap.service';

const parser = new XMLParser({ isArray: (name) => name === 'url' });

function createPrismaMock() {
  return {
    mix: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    playlist: { findMany: jest.fn().mockResolvedValue([]) },
  };
}

describe('SitemapController', () => {
  let app: INestApplication;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeAll(() => {
    process.env.FRONTEND_URL = 'https://tambouille.example';
  });

  beforeEach(async () => {
    prisma = createPrismaMock();
    const moduleRef = await Test.createTestingModule({
      controllers: [SitemapController],
      providers: [SitemapService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();

  interface SitemapUrl {
    loc: string;
    lastmod?: string;
  }

  const urlsOf = (body: string): SitemapUrl[] => {
    const parsed = parser.parse(body) as { urlset: { url?: SitemapUrl[] } };
    return parsed.urlset.url ?? [];
  };

  it('sert du XML, sans authentification, avec un validateur', async () => {
    const response = await request(server())
      .get('/api/sitemap.xml')
      .expect(200);

    expect(response.headers['content-type']).toContain('application/xml');
    expect(response.headers.etag).toBeDefined();
    expect(response.headers['cache-control']).toContain('max-age=3600');
  });

  it('répond 304 au client qui a déjà exactement ce document', async () => {
    const first = await request(server()).get('/api/sitemap.xml').expect(200);

    await request(server())
      .get('/api/sitemap.xml')
      .set('If-None-Match', first.headers.etag)
      .expect(304);
  });

  it('publie l’accueil, les mix, les profils et les playlists sur le domaine du site', async () => {
    prisma.mix.findMany.mockResolvedValue([
      { id: 'mix-1', updatedAt: new Date('2026-08-20T10:00:00.000Z') },
    ]);
    prisma.user.findMany.mockResolvedValue([
      { username: 'nelly', updatedAt: new Date('2026-08-21T10:00:00.000Z') },
    ]);
    prisma.playlist.findMany.mockResolvedValue([
      { id: 'pl-1', updatedAt: new Date('2026-08-22T10:00:00.000Z') },
    ]);

    const response = await request(server())
      .get('/api/sitemap.xml')
      .expect(200);
    const urls = urlsOf(response.text);

    expect(urls.map((url) => url.loc)).toEqual([
      'https://tambouille.example/',
      'https://tambouille.example/mixes/mix-1',
      'https://tambouille.example/users/nelly',
      'https://tambouille.example/playlists/pl-1',
    ]);
    expect(urls[1]?.lastmod).toBe('2026-08-20T10:00:00.000Z');
  });

  it('laisse dehors les comptes sans nom d’utilisateur, qui n’ont pas de page publique', async () => {
    await request(server()).get('/api/sitemap.xml').expect(200);

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { username: { not: null } } }),
    );
  });
});
