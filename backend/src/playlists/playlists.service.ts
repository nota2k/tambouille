import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { buildMixInclude, toMixResponse } from '../mixes/mixes.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { QueryPlaylistsDto } from './dto/query-playlists.dto';

const AUTHOR_SELECT = { id: true, username: true, displayName: true, avatarUrl: true } as const;

/** Summary shape: item count plus the covers of the first few items that have one, for the mosaic. */
const SUMMARY_INCLUDE = {
  user: { select: AUTHOR_SELECT },
  _count: { select: { items: true } },
  items: {
    where: { mix: { coverUrl: { not: null } } },
    orderBy: { position: 'asc' as const },
    take: 4,
    select: { mix: { select: { coverUrl: true } } },
  },
} as const;

function toPlaylistSummary(playlist: any) {
  const { _count, items, ...rest } = playlist;
  return {
    ...rest,
    mixesCount: _count?.items ?? 0,
    coverUrls: items.map((item: any) => item.mix.coverUrl).filter(Boolean),
  };
}

@Injectable()
export class PlaylistsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreatePlaylistDto) {
    const playlist = await this.prisma.playlist.create({
      data: { title: dto.title, description: dto.description, userId },
      include: SUMMARY_INCLUDE,
    });
    return toPlaylistSummary(playlist);
  }

  /**
   * The caller's playlists, newest first. Deliberately unpaginated: the add-to-playlist
   * menu must show every playlist, and a paginated one could hide the wanted entry.
   * When `mixId` is given, each playlist reports whether it already holds that mix.
   */
  async listMine(userId: string, mixId?: string) {
    const playlists = await this.prisma.playlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: SUMMARY_INCLUDE,
    });

    if (!mixId) {
      return playlists.map((playlist) => toPlaylistSummary(playlist));
    }

    // One extra query rather than a per-playlist include: Prisma cannot alias a
    // relation, and `items` is already spoken for by the cover mosaic.
    const rows = await this.prisma.playlistItem.findMany({
      where: { mixId, playlist: { userId } },
      select: { playlistId: true },
    });
    const holdingMix = new Set(rows.map((row) => row.playlistId));

    return playlists.map((playlist) => ({
      ...toPlaylistSummary(playlist),
      containsMix: holdingMix.has(playlist.id),
    }));
  }

  async findOne(id: string, currentUserId?: string) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id },
      include: {
        ...SUMMARY_INCLUDE,
        items: {
          orderBy: { position: 'asc' },
          include: { mix: buildMixInclude(currentUserId) },
        },
      },
    });

    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }

    const { _count, items, ...rest } = playlist as any;
    const mixes = items.map((item: any) => toMixResponse(item.mix));

    return {
      ...rest,
      mixesCount: _count?.items ?? 0,
      coverUrls: mixes.map((mix: any) => mix.coverUrl).filter(Boolean).slice(0, 4),
      mixes,
    };
  }

  async listByUsername(username: string, query: QueryPlaylistsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const user = await this.prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const where = { userId: user.id };

    const [items, total] = await Promise.all([
      this.prisma.playlist.findMany({
        where,
        include: SUMMARY_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.playlist.count({ where }),
    ]);

    return {
      items: items.map((playlist) => toPlaylistSummary(playlist)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async update(id: string, userId: string, dto: UpdatePlaylistDto) {
    await this.assertOwnership(id, userId, 'edit');

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;

    const updated = await this.prisma.playlist.update({
      where: { id },
      data,
      include: SUMMARY_INCLUDE,
    });
    return toPlaylistSummary(updated);
  }

  async remove(id: string, userId: string) {
    await this.assertOwnership(id, userId, 'delete');
    await this.prisma.playlist.delete({ where: { id } });
  }

  /** Idempotent: adding a mix already in the playlist succeeds without creating a duplicate. */
  async addMix(playlistId: string, userId: string, mixId: string) {
    await this.assertOwnership(playlistId, userId, 'edit');

    const mix = await this.prisma.mix.findUnique({ where: { id: mixId }, select: { id: true } });
    if (!mix) {
      throw new NotFoundException('Mix not found');
    }

    const last = await this.prisma.playlistItem.findFirst({
      where: { playlistId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    // upsert rather than create: two concurrent adds of the same mix must not 409.
    await this.prisma.playlistItem.upsert({
      where: { playlistId_mixId: { playlistId, mixId } },
      create: { playlistId, mixId, position: (last?.position ?? -1) + 1 },
      update: {},
    });
  }

  /** Idempotent: removing a mix that is not in the playlist is a no-op. */
  async removeMix(playlistId: string, userId: string, mixId: string) {
    await this.assertOwnership(playlistId, userId, 'edit');
    await this.prisma.playlistItem.deleteMany({ where: { playlistId, mixId } });
  }

  private async assertOwnership(id: string, userId: string, action: 'edit' | 'delete') {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!playlist) {
      throw new NotFoundException('Playlist not found');
    }
    if (playlist.userId !== userId) {
      throw new ForbiddenException(`You can only ${action} your own playlists`);
    }
  }
}
