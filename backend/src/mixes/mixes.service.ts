import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMixDto } from './dto/create-mix.dto';
import { UpdateMixDto } from './dto/update-mix.dto';
import { QueryMixesDto } from './dto/query-mixes.dto';

function parseTags(tags?: string): string[] {
  if (!tags) return [];
  return Array.from(
    new Set(
      tags
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  ).slice(0, 10);
}

interface TracklistEntryInput {
  artist: string;
  title: string;
  timecodeSec: number;
}

function parseTracklist(tracklist?: string): TracklistEntryInput[] {
  if (!tracklist) return [];

  let raw: unknown;
  try {
    raw = JSON.parse(tracklist);
  } catch {
    throw new BadRequestException('tracklist must be valid JSON');
  }

  if (!Array.isArray(raw)) {
    throw new BadRequestException('tracklist must be a JSON array');
  }

  const entries = raw.slice(0, 200).map((entry, index): TracklistEntryInput => {
    if (
      typeof entry !== 'object' ||
      entry === null ||
      typeof (entry as any).artist !== 'string' ||
      typeof (entry as any).title !== 'string' ||
      typeof (entry as any).timecodeSec !== 'number'
    ) {
      throw new BadRequestException(`Invalid tracklist entry at index ${index}`);
    }
    const artist = (entry as any).artist.trim().slice(0, 200);
    const title = (entry as any).title.trim().slice(0, 200);
    const timecodeSec = Math.max(0, Math.round((entry as any).timecodeSec));
    if (!artist || !title) {
      throw new BadRequestException(`Invalid tracklist entry at index ${index}`);
    }
    return { artist, title, timecodeSec };
  });

  return entries.sort((a, b) => a.timecodeSec - b.timecodeSec);
}

/**
 * A mix carries exactly one audio source: an R2 object key, or a Mixcloud
 * cloudcast key. Prisma cannot express "exactly one of these two columns",
 * so the rule lives here — the single door every write goes through.
 *
 * Both failure cases are real states someone can ask for, and each gets its
 * own message: with neither source the mix is unplayable, and with both it is
 * ambiguous about which one the player should use.
 *
 * Exported so `MixesController` can reject a hopeless create *before* it
 * imports a cover into R2, which nothing in this codebase can delete. That
 * early call is a cheap gate in front of this rule, never a replacement for
 * it: this remains the guarantee for every caller, including later ones.
 */
export function assertExactlyOneAudioSource(audioUrl: string | null, mixcloudKey: string | null): void {
  if (!audioUrl && !mixcloudKey) {
    throw new BadRequestException('A mix must have either an audio file or a Mixcloud key');
  }
  if (audioUrl && mixcloudKey) {
    throw new BadRequestException('A mix cannot have both an audio file and a Mixcloud key');
  }
}

/** Mix include shape. When `currentUserId` is set, also fetches whether that user favorited each mix. */
export function buildMixInclude(currentUserId?: string) {
  return {
    include: {
      user: {
        select: { id: true, username: true, displayName: true, avatarUrl: true },
      },
      tracklist: {
        orderBy: { timecodeSec: 'asc' as const },
      },
      _count: { select: { favorites: true, comments: true } },
      ...(currentUserId ? { favorites: { where: { userId: currentUserId }, select: { id: true } } } : {}),
    },
  } as const;
}

/** Flattens the raw Prisma include (`_count`, `favorites`) into public `favoritesCount` / `isFavorited` fields. */
export function toMixResponse(mix: any) {
  const { _count, favorites, ...rest } = mix;
  return {
    ...rest,
    favoritesCount: _count?.favorites ?? 0,
    commentsCount: _count?.comments ?? 0,
    isFavorited: Array.isArray(favorites) && favorites.length > 0,
  };
}

@Injectable()
export class MixesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllTags(): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ tag: string }[]>`
      SELECT DISTINCT unnest(tags) AS tag FROM "mixes" ORDER BY tag
    `;
    return rows.map((r) => r.tag);
  }

  async create(
    userId: string,
    dto: CreateMixDto,
    files: { audioUrl?: string; coverUrl?: string },
  ) {
    // An absent upload and a blank Mixcloud key are the same thing — no
    // source — so both are normalised to null before the rule sees them.
    const audioUrl = files.audioUrl || null;
    const mixcloudKey = dto.mixcloudKey || null;
    assertExactlyOneAudioSource(audioUrl, mixcloudKey);

    const mix = await this.prisma.mix.create({
      data: {
        title: dto.title,
        description: dto.description,
        tags: parseTags(dto.tags),
        audioUrl,
        mixcloudKey,
        coverUrl: files.coverUrl,
        userId,
        tracklist: { create: parseTracklist(dto.tracklist) },
      },
      ...buildMixInclude(userId),
    });
    return toMixResponse(mix);
  }

  async findAll(query: QueryMixesDto, currentUserId?: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where = {
      AND: [
        query.q
          ? {
              OR: [
                { title: { contains: query.q, mode: 'insensitive' as const } },
                { description: { contains: query.q, mode: 'insensitive' as const } },
              ],
            }
          : {},
        query.tags
          ? { tags: { hasEvery: query.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean) } }
          : query.tag ? { tags: { has: query.tag.toLowerCase() } } : {},
        query.username ? { user: { username: query.username } } : {},
      ],
    };

    const orderBy = query.sort === 'plays' ? { playsCount: 'desc' as const } : { createdAt: 'desc' as const };

    const [items, total] = await Promise.all([
      this.prisma.mix.findMany({
        where,
        ...buildMixInclude(currentUserId),
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.mix.count({ where }),
    ]);

    return {
      items: items.map(toMixResponse),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(id: string, currentUserId?: string) {
    const mix = await this.prisma.mix.findUnique({ where: { id }, ...buildMixInclude(currentUserId) });
    if (!mix) {
      throw new NotFoundException('Mix not found');
    }
    return toMixResponse(mix);
  }

  async update(id: string, userId: string, dto: UpdateMixDto, coverUrl?: string) {
    const mix = await this.prisma.mix.findUnique({ where: { id } });
    if (!mix) {
      throw new NotFoundException('Mix not found');
    }
    if (mix.userId !== userId) {
      throw new ForbiddenException('You can only edit your own mixes');
    }

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.tags !== undefined) data.tags = parseTags(dto.tags);
    if (coverUrl !== undefined) data.coverUrl = coverUrl;
    if (dto.tracklist !== undefined) {
      data.tracklist = { deleteMany: {}, create: parseTracklist(dto.tracklist) };
    }

    // Update never touches `audioUrl` — this route accepts no audio upload —
    // so the rule is checked against the state the write would leave behind:
    // the stored audio key, and whatever Mixcloud key this request implies.
    // That refuses both conversions, which are out of scope, while still
    // letting a Mixcloud-hosted mix correct a mistyped key.
    if (dto.mixcloudKey !== undefined) {
      const mixcloudKey = dto.mixcloudKey || null;
      assertExactlyOneAudioSource(mix.audioUrl, mixcloudKey);
      data.mixcloudKey = mixcloudKey;
    }

    const updated = await this.prisma.mix.update({
      where: { id },
      data,
      ...buildMixInclude(userId),
    });
    return toMixResponse(updated);
  }

  async remove(id: string, userId: string) {
    const mix = await this.prisma.mix.findUnique({ where: { id } });
    if (!mix) {
      throw new NotFoundException('Mix not found');
    }
    if (mix.userId !== userId) {
      throw new ForbiddenException('You can only delete your own mixes');
    }
    await this.prisma.mix.delete({ where: { id } });
  }

  async registerPlay(id: string, userId?: string) {
    await this.prisma.mix.update({
      where: { id },
      data: { playsCount: { increment: 1 } },
    });

    if (userId) {
      await this.prisma.playHistory.upsert({
        where: { userId_mixId: { userId, mixId: id } },
        create: { userId, mixId: id },
        update: { playedAt: new Date() },
      });
    }
  }

  async listRecentlyPlayed(userId: string, query: QueryMixesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = { userId };

    const [plays, total] = await Promise.all([
      this.prisma.playHistory.findMany({
        where,
        orderBy: { playedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { mix: { include: buildMixInclude(userId).include } },
      }),
      this.prisma.playHistory.count({ where }),
    ]);

    return {
      items: plays.map((play) => toMixResponse(play.mix)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async listFollowingFeed(userId: string, query: QueryMixesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const follows = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followedIds = follows.map((f) => f.followingId);

    if (followedIds.length === 0) {
      return { items: [], total: 0, page, limit, totalPages: 1 };
    }

    const where = { userId: { in: followedIds } };

    const [items, total] = await Promise.all([
      this.prisma.mix.findMany({
        where,
        ...buildMixInclude(userId),
        orderBy: { playsCount: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.mix.count({ where }),
    ]);

    return {
      items: items.map(toMixResponse),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async addFavorite(userId: string, mixId: string) {
    const mix = await this.prisma.mix.findUnique({ where: { id: mixId } });
    if (!mix) {
      throw new NotFoundException('Mix not found');
    }
    await this.prisma.favorite.upsert({
      where: { userId_mixId: { userId, mixId } },
      create: { userId, mixId },
      update: {},
    });
  }

  async removeFavorite(userId: string, mixId: string) {
    await this.prisma.favorite.deleteMany({ where: { userId, mixId } });
  }

  async listFavorites(userId: string, query: QueryMixesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = { userId };

    const [favorites, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { mix: { include: buildMixInclude(userId).include } },
      }),
      this.prisma.favorite.count({ where }),
    ]);

    return {
      items: favorites.map((favorite) => toMixResponse(favorite.mix)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }
}
