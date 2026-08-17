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
exports.PlaylistsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const mixes_service_1 = require("../mixes/mixes.service");
const AUTHOR_SELECT = {
    id: true,
    username: true,
    displayName: true,
    avatarUrl: true,
};
const SUMMARY_INCLUDE = {
    user: { select: AUTHOR_SELECT },
    _count: { select: { items: true } },
    items: {
        where: { mix: { coverUrl: { not: null } } },
        orderBy: { position: 'asc' },
        take: 4,
        select: { mix: { select: { coverUrl: true } } },
    },
};
function toPlaylistSummary(playlist) {
    const { _count, items, ...rest } = playlist;
    return {
        ...rest,
        mixesCount: _count?.items ?? 0,
        coverUrls: items.map((item) => item.mix.coverUrl).filter(Boolean),
    };
}
let PlaylistsService = class PlaylistsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, dto) {
        const playlist = await this.prisma.playlist.create({
            data: { title: dto.title, description: dto.description, userId },
            include: SUMMARY_INCLUDE,
        });
        return toPlaylistSummary(playlist);
    }
    async listMine(userId, mixId) {
        const playlists = await this.prisma.playlist.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: SUMMARY_INCLUDE,
        });
        if (!mixId) {
            return playlists.map((playlist) => toPlaylistSummary(playlist));
        }
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
    async findOne(id, currentUserId) {
        const playlist = await this.prisma.playlist.findUnique({
            where: { id },
            include: {
                ...SUMMARY_INCLUDE,
                items: {
                    orderBy: { position: 'asc' },
                    include: { mix: (0, mixes_service_1.buildMixInclude)(currentUserId) },
                },
            },
        });
        if (!playlist) {
            throw new common_1.NotFoundException('Playlist not found');
        }
        const { _count, items, ...rest } = playlist;
        const mixes = items.map((item) => (0, mixes_service_1.toMixResponse)(item.mix));
        return {
            ...rest,
            mixesCount: _count?.items ?? 0,
            coverUrls: mixes
                .map((mix) => mix.coverUrl)
                .filter(Boolean)
                .slice(0, 4),
            mixes,
        };
    }
    async listByUsername(username, query) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const user = await this.prisma.user.findUnique({
            where: { username },
            select: { id: true },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
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
    async update(id, userId, dto) {
        await this.assertOwnership(id, userId, 'edit');
        const data = {};
        if (dto.title !== undefined)
            data.title = dto.title;
        if (dto.description !== undefined)
            data.description = dto.description;
        const updated = await this.prisma.playlist.update({
            where: { id },
            data,
            include: SUMMARY_INCLUDE,
        });
        return toPlaylistSummary(updated);
    }
    async remove(id, userId) {
        await this.assertOwnership(id, userId, 'delete');
        await this.prisma.playlist.delete({ where: { id } });
    }
    async addMix(playlistId, userId, mixId) {
        await this.assertOwnership(playlistId, userId, 'edit');
        const mix = await this.prisma.mix.findUnique({
            where: { id: mixId },
            select: { id: true },
        });
        if (!mix) {
            throw new common_1.NotFoundException('Mix not found');
        }
        const last = await this.prisma.playlistItem.findFirst({
            where: { playlistId },
            orderBy: { position: 'desc' },
            select: { position: true },
        });
        await this.prisma.playlistItem.upsert({
            where: { playlistId_mixId: { playlistId, mixId } },
            create: { playlistId, mixId, position: (last?.position ?? -1) + 1 },
            update: {},
        });
    }
    async removeMix(playlistId, userId, mixId) {
        await this.assertOwnership(playlistId, userId, 'edit');
        await this.prisma.playlistItem.deleteMany({ where: { playlistId, mixId } });
    }
    async assertOwnership(id, userId, action) {
        const playlist = await this.prisma.playlist.findUnique({
            where: { id },
            select: { userId: true },
        });
        if (!playlist) {
            throw new common_1.NotFoundException('Playlist not found');
        }
        if (playlist.userId !== userId) {
            throw new common_1.ForbiddenException(`You can only ${action} your own playlists`);
        }
    }
};
exports.PlaylistsService = PlaylistsService;
exports.PlaylistsService = PlaylistsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PlaylistsService);
//# sourceMappingURL=playlists.service.js.map