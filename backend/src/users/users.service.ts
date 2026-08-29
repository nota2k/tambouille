import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PaginationDto } from './dto/pagination.dto';
import { SearchUsersDto } from './dto/search-users.dto';
import { pseudosAutorises } from '../incongrues/allowed-usernames';

const userSummarySelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
} as const;

// Prisma's unique-constraint violation. Not importing Prisma's own error
// class here to keep this check working against the plain mock objects the
// test suite throws, as well as the real `PrismaClientKnownRequestError` —
// same helper as `auth.service.ts`'s `isUniqueConstraintError`, duplicated
// rather than shared across modules for this one small check.
function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async search(dto: SearchUsersDto) {
    const limit = dto.limit ?? 5;
    const q = dto.q.trim();

    const users = await this.prisma.user.findMany({
      where: {
        // Google-created accounts keep `username: null` until signup is
        // completed. They have no public profile to link to, and the
        // `displayName` clause below would otherwise surface them: the
        // frontend then builds a profile route with a null param, which
        // throws and breaks the search dropdown for every visitor, not just
        // for the pending account.
        username: { not: null },
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: userSummarySelect,
      orderBy: { username: 'asc' },
      take: limit,
    });

    return { items: users };
  }

  // Google-created accounts start with username === null until signup is
  // completed. Read and checked before any write below, so a null-username
  // account is refused up front instead of after the mutation has already
  // been committed.
  private async requireUsername(userId: string): Promise<string> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    if (!user.username) {
      throw new ConflictException(
        'Choose a username before updating your profile',
      );
    }
    return user.username;
  }

  async getPublicProfile(username: string, currentUserId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: {
        _count: { select: { mixes: true, followedBy: true, following: true } },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let isFollowing = false;
    if (currentUserId && currentUserId !== user.id) {
      const follow = await this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: user.id,
          },
        },
      });
      isFollowing = !!follow;
    }

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      coverUrl: user.coverUrl,
      createdAt: user.createdAt,
      mixesCount: user._count.mixes,
      followersCount: user._count.followedBy,
      followingCount: user._count.following,
      isFollowing,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const username = await this.requireUsername(userId);
    const data: Record<string, unknown> = { ...dto };
    if (dto.incongruesUsername !== undefined) {
      // `trim() || null` et non `trim()` : une chaîne vide entrerait en base,
      // où la contrainte d'unicité interdirait ensuite à un second compte de
      // se délier.
      const pseudo = dto.incongruesUsername.trim() || null;

      // Le champ vidé passe toujours : se délier n'est pas revendiquer, et une
      // liste réduite ne doit pas enfermer un compte dans un lien qu'il ne peut
      // plus défaire.
      if (pseudo !== null) {
        const autorises = pseudosAutorises();
        if (!autorises.includes(pseudo.toLowerCase())) {
          throw new ForbiddenException(
            autorises.length
              ? 'Ce pseudo Musiques Incongrues ne fait pas partie des comptes autorisés'
              : 'La liaison avec Musiques Incongrues n’est pas ouverte sur cette instance',
          );
        }
      }

      data.incongruesUsername = pseudo;
    }
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data,
      });
    } catch (error) {
      // Pas de vérification préalable ici : l'index unique est ce qui tient
      // sous concurrence (voir le commentaire du champ dans schema.prisma),
      // donc ce catch est la seule ligne de défense — et il doit rester
      // spécifique à ce doublon-là, sous peine de transformer toute panne
      // Prisma en un 409 trompeur.
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Ce pseudo Musiques Incongrues est déjà lié à un autre compte',
        );
      }
      throw error;
    }
    return this.getPublicProfile(username);
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    const username = await this.requireUsername(userId);
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });
    return this.getPublicProfile(username);
  }

  async updateCover(userId: string, coverUrl: string) {
    const username = await this.requireUsername(userId);
    await this.prisma.user.update({
      where: { id: userId },
      data: { coverUrl },
    });
    return this.getPublicProfile(username);
  }

  async follow(currentUserId: string, targetUsername: string) {
    const target = await this.prisma.user.findUnique({
      where: { username: targetUsername },
    });
    if (!target) {
      throw new NotFoundException('User not found');
    }
    if (target.id === currentUserId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    await this.prisma.follow.upsert({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: target.id,
        },
      },
      create: { followerId: currentUserId, followingId: target.id },
      update: {},
    });
  }

  async unfollow(currentUserId: string, targetUsername: string) {
    const target = await this.prisma.user.findUnique({
      where: { username: targetUsername },
    });
    if (!target) {
      throw new NotFoundException('User not found');
    }
    await this.prisma.follow.deleteMany({
      where: { followerId: currentUserId, followingId: target.id },
    });
  }

  async listFollowers(username: string, query: PaginationDto) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = { followingId: user.id };

    const [follows, total] = await Promise.all([
      this.prisma.follow.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { follower: { select: userSummarySelect } },
      }),
      this.prisma.follow.count({ where }),
    ]);

    return {
      items: follows.map((follow) => follow.follower),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async deleteAccount(userId: string) {
    await this.prisma.user.delete({ where: { id: userId } });
  }

  async listFollowing(username: string, query: PaginationDto) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = { followerId: user.id };

    const [follows, total] = await Promise.all([
      this.prisma.follow.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { following: { select: userSummarySelect } },
      }),
      this.prisma.follow.count({ where }),
    ]);

    return {
      items: follows.map((follow) => follow.following),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }
}
