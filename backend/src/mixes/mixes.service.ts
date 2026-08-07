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

const mixWithAuthor = {
  include: {
    user: {
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    },
    tracklist: {
      orderBy: { timecodeSec: 'asc' as const },
    },
  },
} as const;

@Injectable()
export class MixesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    dto: CreateMixDto,
    files: { audioUrl: string; coverUrl?: string },
  ) {
    return this.prisma.mix.create({
      data: {
        title: dto.title,
        description: dto.description,
        tags: parseTags(dto.tags),
        audioUrl: files.audioUrl,
        coverUrl: files.coverUrl,
        userId,
        tracklist: { create: parseTracklist(dto.tracklist) },
      },
      ...mixWithAuthor,
    });
  }

  async findAll(query: QueryMixesDto) {
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
        query.tag ? { tags: { has: query.tag.toLowerCase() } } : {},
        query.username ? { user: { username: query.username } } : {},
      ],
    };

    const [items, total] = await Promise.all([
      this.prisma.mix.findMany({
        where,
        ...mixWithAuthor,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.mix.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(id: string) {
    const mix = await this.prisma.mix.findUnique({ where: { id }, ...mixWithAuthor });
    if (!mix) {
      throw new NotFoundException('Mix not found');
    }
    return mix;
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

    return this.prisma.mix.update({
      where: { id },
      data,
      ...mixWithAuthor,
    });
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

  async registerPlay(id: string) {
    await this.prisma.mix.update({
      where: { id },
      data: { playsCount: { increment: 1 } },
    });
  }
}
