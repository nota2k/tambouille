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

/** Une date absente ou illisible ne compte pas comme une date : `instant`
 *  vaut alors 0 pour les deux, ce qui suffit pour le tri mais confondrait ici
 *  un item réellement daté de 1970 avec un item sans date. */
function estDatee(item: VeilleItem): boolean {
  return (
    item.publishedAt !== undefined &&
    !Number.isNaN(Date.parse(item.publishedAt))
  );
}

/**
 * Choisit l'unique item du feed : le plus récent, toutes sources confondues.
 * Chaque source ne concourt qu'avec sa sortie la plus fraîche parmi celles
 * déjà sorties — le rang le plus haut de son tri interne déjà fait par
 * l'appelant qui n'est pas datée dans le futur — puisqu'aucune autre de ses
 * sorties déjà sorties ne peut jamais gagner face à celle-là. Un item daté
 * l'emporte toujours sur un item sans date ; à égalité de date (ou si aucune
 * source n'en a une), l'ordre des sources — `parSource` est déjà trié par
 * position croissante — départage en gardant le premier trouvé.
 */
function itemLePlusRecent(parSource: VeilleFeedItem[][]): VeilleFeedItem[] {
  const maintenant = Date.now();
  let meilleur: VeilleFeedItem | undefined;
  let meilleurDatee = false;
  let meilleurInstant = -Infinity;

  for (const items of parSource) {
    // Une précommande porte la vraie date de sortie de l'album, mais cette
    // date peut être dans le futur : tant que la sortie n'a pas eu lieu, ce
    // n'est pas « la dernière sortie » et elle ne doit pas rafler la place
    // unique. On cherche donc le premier item de la source qui n'est pas
    // daté dans le futur, pas seulement son rang 0.
    const candidat = items.find(
      (item) => instant(item.publishedAt) <= maintenant,
    );
    if (!candidat) continue;
    const datee = estDatee(candidat);
    const t = instant(candidat.publishedAt);

    if (
      !meilleur ||
      (datee && !meilleurDatee) ||
      (datee === meilleurDatee && t > meilleurInstant)
    ) {
      meilleur = candidat;
      meilleurDatee = datee;
      meilleurInstant = t;
    }
  }

  return meilleur ? [meilleur] : [];
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

    return { sources: rendues, items: itemLePlusRecent(parSource) };
  }

  /**
   * Une source en échec sert son dernier instantané connu. Le bloc d'un profil
   * ne doit pas se vider parce qu'un site répond 502 ce matin-là.
   */
  private async freshItems(
    source: StoredSource,
  ): Promise<{ items: VeilleItem[]; lastError: string | null }> {
    const cached = storedItems(source.items);
    const age = source.fetchedAt
      ? Date.now() - source.fetchedAt.getTime()
      : Infinity;
    if (age < CACHE_TTL_MS) {
      return { items: cached, lastError: source.lastError };
    }

    try {
      const resolved = await this.resolver.resolve(source.url);
      const items = resolved.items.slice(0, MAX_ITEMS_PER_SOURCE);
      // L'écriture en base n'est qu'une optimisation de cache : elle évite de
      // re-résoudre la source à la prochaine lecture. Si elle échoue (incident
      // base transitoire), on a déjà en main les items fraîchement résolus —
      // les rendre ne doit pas dépendre du succès de leur enregistrement.
      await this.persistRefresh(source.id, {
        items: items as unknown as Prisma.InputJsonValue,
        fetchedAt: new Date(),
        lastError: null,
      });
      return { items, lastError: null };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Source injoignable';
      // Même logique : ne pas réussir à consigner l'erreur ne doit pas priver
      // le feed de l'instantané périmé qu'on a déjà en main.
      await this.persistRefresh(source.id, {
        fetchedAt: new Date(),
        lastError: message,
      });
      return { items: cached, lastError: message };
    }
  }

  private async persistRefresh(
    id: string,
    data: Prisma.WatchedSourceUpdateInput,
  ): Promise<void> {
    try {
      await this.prisma.watchedSource.update({ where: { id }, data });
    } catch {
      // Volontairement avalé : voir les appelants de `persistRefresh`.
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
