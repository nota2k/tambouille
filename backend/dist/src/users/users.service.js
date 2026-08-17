"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const userSummarySelect = {
    id: true,
    username: true,
    displayName: true,
    avatarUrl: true,
};
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async search(dto) {
        const limit = dto.limit ?? 5;
        const q = dto.q.trim();
        const users = await this.prisma.user.findMany({
            where: {
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
    async requireUsername(userId) {
        const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
        });
        if (!user.username) {
            throw new common_1.ConflictException('Choose a username before updating your profile');
        }
        return user.username;
    }
    async getPublicProfile(username, currentUserId) {
        const user = await this.prisma.user.findUnique({
            where: { username },
            include: {
                _count: { select: { mixes: true, followedBy: true, following: true } },
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
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
    async updateProfile(userId, dto) {
        const username = await this.requireUsername(userId);
        await this.prisma.user.update({
            where: { id: userId },
            data: dto,
        });
        return this.getPublicProfile(username);
    }
    async updateAvatar(userId, avatarUrl) {
        const username = await this.requireUsername(userId);
        await this.prisma.user.update({
            where: { id: userId },
            data: { avatarUrl },
        });
        return this.getPublicProfile(username);
    }
    async updateCover(userId, coverUrl) {
        const username = await this.requireUsername(userId);
        await this.prisma.user.update({
            where: { id: userId },
            data: { coverUrl },
        });
        return this.getPublicProfile(username);
    }
    async follow(currentUserId, targetUsername) {
        const target = await this.prisma.user.findUnique({
            where: { username: targetUsername },
        });
        if (!target) {
            throw new common_1.NotFoundException('User not found');
        }
        if (target.id === currentUserId) {
            throw new common_1.BadRequestException('You cannot follow yourself');
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
    async unfollow(currentUserId, targetUsername) {
        const target = await this.prisma.user.findUnique({
            where: { username: targetUsername },
        });
        if (!target) {
            throw new common_1.NotFoundException('User not found');
        }
        await this.prisma.follow.deleteMany({
            where: { followerId: currentUserId, followingId: target.id },
        });
    }
    async listFollowers(username, query) {
        const user = await this.prisma.user.findUnique({ where: { username } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
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
    async deleteAccount(userId) {
        await this.prisma.user.delete({ where: { id: userId } });
    }
    async listFollowing(username, query) {
        const user = await this.prisma.user.findUnique({ where: { username } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
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
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map