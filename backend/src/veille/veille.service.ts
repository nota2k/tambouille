import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { VeilleResolver } from './veille.resolver';
import {
  CACHE_TTL_MS,
  MAX_ITEMS_PER_SOURCE,
  MAX_SOURCES_PER_USER,
  type VeilleFeed,
  type VeilleFeedItem,
  type VeilleItem,
  type VeilleSource,
} from './veille.types';

interface StoredSource {
  id: string;
  url: string;
  label: string;
  items: unknown;
  fetchedAt: Date | null;
  lastError: string | null;
}

function storedItems(raw: unknown): VeilleItem[] {
  return Array.isArray(raw) ? (raw as VeilleItem[]) : [];
}

/** Les items sans date passent en dernier plutôt que de disparaître : une
 *  source qui ne date pas ses sorties reste une source utile. */
function instant(iso?: string): number {
  if (!iso) return 0;
  const parsed = Date.parse(iso);
  // Une date illisible vaut une date absente : `NaN` dans un comparateur rend
  // l'ordre du tri indéfini, ce qui est pire que de reléguer l'item en fin.
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parDateDecroissante(a: VeilleItem, b: VeilleItem): number {
  return instant(b.publishedAt) - instant(a.publishedAt);
}

/**
 * Fusionne le feed en tourniquet par source plutôt qu'en tri global sur la
 * date : Bandcamp n'expose aucune date de publication dans sa grille, donc un
 * tri global ferait tomber tout item Bandcamp sous n'importe quel item daté
 * — un épisode de podcast de 2019 passerait devant la sortie de label de la
 * semaine dernière. Chaque source garde son tri interne (déjà fait par
 * l'appelant) ; on prend ensuite le rang 0 de chaque source dans l'ordre des
 * positions, puis le rang 1, etc., en sautant les sources épuisées.
 */
function enTourniquet(
  parSource: VeilleFeedItem[][],
): VeilleFeedItem[] {
  const fusionne: VeilleFeedItem[] = [];
  const plusLong = Math.max(0, ...parSource.map((items) => items.length));
  for (let rang = 0; rang < plusLong; rang++) {
    for (const items of parSource) {
      if (items[rang]) fusionne.push(items[rang]);
    }
  }
  return fusionne;
}

@Injectable()
export class VeilleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: VeilleResolver,
  ) {}

  async getFeed(username: string, viewerId?: string): Promise<VeilleFeed> {
    const owner = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!owner) throw new NotFoundException('Compte introuvable');

    const sources = await this.prisma.watchedSource.findMany({
      where: { userId: owner.id },
      orderBy: { position: 'asc' },
    });

    // En parallèle et jamais en série : le plafond de huit sources borne le
    // pire cas, mais huit attentes enchaînées le rendraient inacceptable.
    // `all` et non `allSettled` parce que `freshItems` avale déjà l'échec d'une
    // source et rend son instantané périmé — il n'y a pas de rejet à trier.
    const refreshed = await Promise.all(
      sources.map((source) => this.freshItems(source)),
    );

    const isOwner = viewerId === owner.id;
    const rendues: VeilleSource[] = [];
    const parSource: VeilleFeedItem[][] = [];

    sources.forEach((source, index) => {
      const { items: fresh, lastError } = refreshed[index];
      rendues.push({
        id: source.id,
        label: source.label,
        url: source.url,
        ...(isOwner && lastError ? { lastError } : {}),
      });
      const avecLabel = fresh
        .map((item) => ({ ...item, sourceLabel: source.label }))
        .sort(parDateDecroissante);
      parSource.push(avecLabel);
    });

    return { sources: rendues, items: enTourniquet(parSource) };
  }

  /**
   * Une source en échec sert son dernier instantané connu. Le bloc d'un profil
   * ne doit pas se vider parce qu'un site répond 502 ce matin-là.
   */
  private async freshItems(
    source: StoredSource,
  ): Promise<{ items: VeilleItem[]; lastError: string | null }> {
    const cached = storedItems(source.items);
    const age = source.fetchedAt ? Date.now() - source.fetchedAt.getTime() : Infinity;
    if (age < CACHE_TTL_MS) {
      return { items: cached, lastError: source.lastError };
    }

    try {
      const resolved = await this.resolver.resolve(source.url);
      const items = resolved.items.slice(0, MAX_ITEMS_PER_SOURCE);
      await this.prisma.watchedSource.update({
        where: { id: source.id },
        data: {
          items: items as unknown as Prisma.InputJsonValue,
          fetchedAt: new Date(),
          lastError: null,
        },
      });
      return { items, lastError: null };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Source injoignable';
      await this.prisma.watchedSource.update({
        where: { id: source.id },
        data: { fetchedAt: new Date(), lastError: message },
      });
      return { items: cached, lastError: message };
    }
  }

  async addSource(userId: string, rawUrl: string): Promise<VeilleSource> {
    const count = await this.prisma.watchedSource.count({ where: { userId } });
    if (count >= MAX_SOURCES_PER_USER) {
      throw new BadRequestException(
        `Pas plus de ${MAX_SOURCES_PER_USER} sources suivies. Retires-en une d’abord.`,
      );
    }

    // Résoudre avant d'écrire : c'est le seul moment où l'on peut à la fois
    // valider l'adresse et en tirer un nom à proposer.
    const resolved = await this.resolver.resolve(rawUrl);

    const existing = await this.prisma.watchedSource.findFirst({
      where: { userId, url: resolved.url },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('Tu suis déjà cette source');
    }

    const created = await this.prisma.watchedSource.create({
      data: {
        userId,
        url: resolved.url,
        label: resolved.label,
        resolver: resolved.resolver,
        items: resolved.items.slice(
          0,
          MAX_ITEMS_PER_SOURCE,
        ) as unknown as Prisma.InputJsonValue,
        fetchedAt: new Date(),
        position: count,
      },
    });

    return { id: created.id, label: created.label, url: created.url };
  }

  async updateSource(
    userId: string,
    id: string,
    patch: { label?: string; position?: number },
  ): Promise<VeilleSource> {
    const owned = await this.prisma.watchedSource.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!owned) throw new NotFoundException('Source introuvable');

    const updated = await this.prisma.watchedSource.update({
      where: { id },
      data: patch,
    });
    return { id: updated.id, label: updated.label, url: updated.url };
  }

  async removeSource(userId: string, id: string): Promise<void> {
    const owned = await this.prisma.watchedSource.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!owned) throw new NotFoundException('Source introuvable');
    await this.prisma.watchedSource.delete({ where: { id } });
  }
}
