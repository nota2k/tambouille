import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { PaginationDto } from '../users/dto/pagination.dto';

const authorSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const;

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(mixId: string, query: PaginationDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = { mixId, parentId: null };

    const [items, total] = await Promise.all([
      this.prisma.comment.findMany({
        where,
        orderBy: { timecodeSec: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: authorSelect },
          replies: {
            orderBy: { createdAt: 'asc' },
            include: { user: { select: authorSelect } },
          },
        },
      }),
      this.prisma.comment.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async create(mixId: string, userId: string, dto: CreateCommentDto) {
    const mix = await this.prisma.mix.findUnique({ where: { id: mixId } });
    if (!mix) {
      throw new NotFoundException('Mix not found');
    }

    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({ where: { id: dto.parentId } });
      if (!parent || parent.mixId !== mixId) {
        throw new BadRequestException('Parent comment not found on this mix');
      }
      if (parent.parentId !== null) {
        throw new BadRequestException('Cannot reply to a reply');
      }

      return this.prisma.comment.create({
        data: {
          body: dto.body,
          mixId,
          userId,
          parentId: dto.parentId,
        },
        include: { user: { select: authorSelect } },
      });
    }

    if (dto.timecodeSec === undefined) {
      throw new BadRequestException('timecodeSec is required for a top-level comment');
    }

    return this.prisma.comment.create({
      data: {
        body: dto.body,
        mixId,
        userId,
        timecodeSec: dto.timecodeSec,
      },
      include: {
        user: { select: authorSelect },
        replies: true,
      },
    });
  }

  async remove(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { mix: { select: { userId: true } } },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.userId !== userId && comment.mix.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments or comments on your own mixes');
    }
    await this.prisma.comment.delete({ where: { id: commentId } });
  }
}
