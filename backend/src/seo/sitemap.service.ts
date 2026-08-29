import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildSitemap,
  SITEMAP_MAX_URLS,
  type SitemapEntry,
} from './sitemap.builder';

/**
 * Chaque famille de pages est plafonnée pour que le document reste sous la
 * limite du protocole quoi qu'il arrive, et que les mix — la seule famille qui
 * grossit vraiment — ne soient pas chassés par les profils.
 */
const MAX_MIXES = 40_000;
const MAX_USERS = 5_000;
const MAX_PLAYLISTS = 5_000;

@Injectable()
export class SitemapService {
  constructor(private readonly prisma: PrismaService) {}

  async build(site: string): Promise<string> {
    const [mixes, users, playlists] = await Promise.all([
      this.prisma.mix.findMany({
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: MAX_MIXES,
      }),
      // Un compte sans `username` n'a pas encore de page publique : son profil
      // répondrait 404 au robot.
      this.prisma.user.findMany({
        where: { username: { not: null } },
        select: { username: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: MAX_USERS,
      }),
      this.prisma.playlist.findMany({
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: MAX_PLAYLISTS,
      }),
    ]);

    const entries: SitemapEntry[] = [
      { loc: `${site}/`, changefreq: 'daily', priority: 1 },
      // La page qui explique le site. Publique, indexable, et sans date de
      // modification en base — elle vit dans le code, pas dans une table, donc
      // `lastmod` serait une invention. `monthly` dit le peu qu'on sait.
      { loc: `${site}/a-propos`, changefreq: 'monthly', priority: 0.5 },
      ...mixes.map((mix) => ({
        loc: `${site}/mixes/${mix.id}`,
        lastmod: mix.updatedAt,
        changefreq: 'weekly' as const,
        priority: 0.8,
      })),
      ...users.map((user) => ({
        loc: `${site}/users/${encodeURIComponent(user.username as string)}`,
        lastmod: user.updatedAt,
        changefreq: 'weekly' as const,
        priority: 0.6,
      })),
      ...playlists.map((playlist) => ({
        loc: `${site}/playlists/${playlist.id}`,
        lastmod: playlist.updatedAt,
        changefreq: 'weekly' as const,
        priority: 0.5,
      })),
    ];

    return buildSitemap(entries.slice(0, SITEMAP_MAX_URLS));
  }
}
