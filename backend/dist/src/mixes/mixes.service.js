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
exports.MixesService = void 0;
exports.assertExactlyOneAudioSource = assertExactlyOneAudioSource;
exports.assertSourcePageHasASource = assertSourcePageHasASource;
exports.buildMixInclude = buildMixInclude;
exports.toMixResponse = toMixResponse;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const upload_utils_1 = require("../common/upload.utils");
const audio_source_1 = require("../common/audio-source");
const slug_1 = require("../common/slug");
function parseTags(tags) {
    if (!tags)
        return [];
    return Array.from(new Set(tags
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean))).slice(0, 10);
}
function parseTracklist(tracklist) {
    if (!tracklist)
        return [];
    let raw;
    try {
        raw = JSON.parse(tracklist);
    }
    catch {
        throw new common_1.BadRequestException('tracklist must be valid JSON');
    }
    if (!Array.isArray(raw)) {
        throw new common_1.BadRequestException('tracklist must be a JSON array');
    }
    const entries = raw.slice(0, 200).map((entry, index) => {
        if (typeof entry !== 'object' ||
            entry === null ||
            typeof entry.artist !== 'string' ||
            typeof entry.title !== 'string' ||
            typeof entry.timecodeSec !== 'number') {
            throw new common_1.BadRequestException(`Invalid tracklist entry at index ${index}`);
        }
        const artist = entry.artist.trim().slice(0, 200);
        const title = entry.title.trim().slice(0, 200);
        const timecodeSec = Math.max(0, Math.round(entry.timecodeSec));
        return { artist, title, timecodeSec };
    });
    return entries.sort((a, b) => a.timecodeSec - b.timecodeSec);
}
function assertExactlyOneAudioSource(audioUrl, sourceType, sourceRef) {
    if (Boolean(sourceType) !== Boolean(sourceRef)) {
        throw new common_1.BadRequestException('A remote source needs both sourceType and sourceRef');
    }
    const hasRemote = Boolean(sourceType);
    if (!audioUrl && !hasRemote) {
        throw new common_1.BadRequestException('A mix must have either an audio file or a remote source');
    }
    if (audioUrl && hasRemote) {
        throw new common_1.BadRequestException('A mix cannot have both an audio file and a remote source');
    }
}
function assertSourcePageHasASource(sourceRef, sourcePageUrl) {
    if (sourcePageUrl && !sourceRef) {
        throw new common_1.BadRequestException('A source page needs a remote source');
    }
}
function buildMixInclude(currentUserId) {
    return {
        include: {
            user: {
                select: {
                    id: true,
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                },
            },
            tracklist: {
                orderBy: { timecodeSec: 'asc' },
            },
            _count: { select: { favorites: true, comments: true } },
            ...(currentUserId
                ? {
                    favorites: {
                        where: { userId: currentUserId },
                        select: { id: true },
                    },
                }
                : {}),
        },
    };
}
function toMixResponse(mix) {
    const { _count, favorites, ...rest } = mix;
    return {
        ...rest,
        favoritesCount: _count?.favorites ?? 0,
        commentsCount: _count?.comments ?? 0,
        isFavorited: Array.isArray(favorites) && favorites.length > 0,
    };
}
let MixesService = class MixesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAllTags() {
        const rows = await this.prisma.$queryRaw `
      SELECT DISTINCT unnest(tags) AS tag FROM "mixes" ORDER BY tag
    `;
        return rows.map((r) => r.tag);
    }
    async create(userId, dto, files) {
        const audioUrl = files.audioUrl || null;
        const sourceType = dto.sourceType || null;
        const sourceRef = dto.sourceRef || null;
        const sourcePageUrl = dto.sourcePageUrl?.trim() || null;
        assertExactlyOneAudioSource(audioUrl, sourceType, sourceRef);
        assertSourcePageHasASource(sourceRef, sourcePageUrl);
        const mix = await this.prisma.mix.create({
            data: {
                title: dto.title,
                slug: await this.slugLibrePour(userId, dto.title),
                description: dto.description,
                artist: dto.artist?.trim() || null,
                tags: parseTags(dto.tags),
                audioUrl,
                sourceType,
                sourceRef,
                sourcePageUrl,
                durationSec: dto.durationSec ?? null,
                coverUrl: files.coverUrl,
                userId,
                tracklist: { create: parseTracklist(dto.tracklist) },
            },
            ...buildMixInclude(userId),
        });
        return toMixResponse(mix);
    }
    slugLibrePour(userId, titre) {
        return (0, slug_1.slugUnique)(titre, async (slug) => {
            const existe = await this.prisma.mix.findFirst({
                where: { userId, slug },
                select: { id: true },
            });
            return existe !== null;
        });
    }
    async findAll(query, currentUserId) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const where = {
            AND: [
                query.q
                    ? {
                        OR: [
                            { title: { contains: query.q, mode: 'insensitive' } },
                            {
                                description: {
                                    contains: query.q,
                                    mode: 'insensitive',
                                },
                            },
                            { artist: { contains: query.q, mode: 'insensitive' } },
                        ],
                    }
                    : {},
                query.tags
                    ? {
                        tags: {
                            hasEvery: query.tags
                                .split(',')
                                .map((t) => t.trim().toLowerCase())
                                .filter(Boolean),
                        },
                    }
                    : query.tag
                        ? { tags: { has: query.tag.toLowerCase() } }
                        : {},
                query.username ? { user: { username: query.username } } : {},
                query.sinceDays
                    ? {
                        createdAt: {
                            gte: new Date(Date.now() - query.sinceDays * 24 * 60 * 60 * 1000),
                        },
                    }
                    : {},
            ],
        };
        const orderBy = query.sort === 'plays'
            ? { playsCount: 'desc' }
            : { createdAt: 'desc' };
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
    async findBySlug(username, slug, currentUserId) {
        const mix = await this.prisma.mix.findFirst({
            where: {
                slug,
                user: { username: { equals: username, mode: 'insensitive' } },
            },
            ...buildMixInclude(currentUserId),
        });
        if (!mix) {
            throw new common_1.NotFoundException('Mix not found');
        }
        return toMixResponse(mix);
    }
    async findBySource(ref, pageUrl) {
        const criteres = [
            ref ? { sourceRef: ref } : null,
            pageUrl ? { sourcePageUrl: pageUrl } : null,
        ].filter((c) => c !== null);
        if (!criteres.length)
            return null;
        const mix = await this.prisma.mix.findFirst({
            where: { OR: criteres },
            orderBy: { createdAt: 'asc' },
            select: {
                id: true,
                title: true,
                slug: true,
                coverUrl: true,
                createdAt: true,
                user: { select: { username: true, displayName: true } },
            },
        });
        return mix;
    }
    async findOne(id, currentUserId) {
        const mix = await this.prisma.mix.findUnique({
            where: { id },
            ...buildMixInclude(currentUserId),
        });
        if (!mix) {
            throw new common_1.NotFoundException('Mix not found');
        }
        return toMixResponse(mix);
    }
    async resolveAudio(id, bases) {
        const mix = await this.prisma.mix.findUnique({
            where: { id },
            select: { audioUrl: true, sourceType: true, sourceRef: true },
        });
        if (!mix) {
            throw new common_1.NotFoundException('Mix not found');
        }
        const source = (0, audio_source_1.audioSourceFor)(mix, bases);
        if (!source) {
            throw new common_1.NotFoundException('Mix has no downloadable audio');
        }
        return { url: source.url, statusCode: 302 };
    }
    async update(id, userId, dto, coverUrl) {
        const mix = await this.prisma.mix.findUnique({ where: { id } });
        if (!mix) {
            throw new common_1.NotFoundException('Mix not found');
        }
        if (mix.userId !== userId) {
            throw new common_1.ForbiddenException('You can only edit your own mixes');
        }
        const data = {};
        if (dto.title !== undefined)
            data.title = dto.title;
        if (dto.description !== undefined)
            data.description = dto.description;
        if (dto.artist !== undefined)
            data.artist = dto.artist.trim() || null;
        if (dto.tags !== undefined)
            data.tags = parseTags(dto.tags);
        if (coverUrl !== undefined)
            data.coverUrl = coverUrl;
        if (dto.tracklist !== undefined) {
            data.tracklist = {
                deleteMany: {},
                create: parseTracklist(dto.tracklist),
            };
        }
        if (dto.sourceType !== undefined || dto.sourceRef !== undefined) {
            const sourceType = (dto.sourceType ?? mix.sourceType) || null;
            const sourceRef = (dto.sourceRef ?? mix.sourceRef) || null;
            assertExactlyOneAudioSource(mix.audioUrl, sourceType, sourceRef);
            data.sourceType = sourceType;
            data.sourceRef = sourceRef;
        }
        if (dto.sourcePageUrl !== undefined) {
            const sourcePageUrl = dto.sourcePageUrl.trim() || null;
            assertSourcePageHasASource(data.sourceRef ?? mix.sourceRef, sourcePageUrl);
            data.sourcePageUrl = sourcePageUrl;
        }
        const updated = await this.prisma.mix.update({
            where: { id },
            data,
            ...buildMixInclude(userId),
        });
        if (coverUrl !== undefined && mix.coverUrl && mix.coverUrl !== coverUrl) {
            await (0, upload_utils_1.deleteFromR2)([mix.coverUrl]).catch(() => undefined);
        }
        return toMixResponse(updated);
    }
    async remove(id, userId) {
        const mix = await this.prisma.mix.findUnique({ where: { id } });
        if (!mix) {
            throw new common_1.NotFoundException('Mix not found');
        }
        if (mix.userId !== userId) {
            throw new common_1.ForbiddenException('You can only delete your own mixes');
        }
        await this.prisma.mix.delete({ where: { id } });
        await (0, upload_utils_1.deleteFromR2)([mix.audioUrl, mix.coverUrl]).catch(() => undefined);
    }
    async listSuggestions(id, limit, currentUserId) {
        const mix = await this.prisma.mix.findUnique({
            where: { id },
            select: { id: true, tags: true },
        });
        if (!mix) {
            throw new common_1.NotFoundException('Mix not found');
        }
        const excludedIds = new Set([id]);
        if (currentUserId) {
            const own = await this.prisma.playHistory.findMany({
                where: { userId: currentUserId },
                select: { mixId: true },
            });
            own.forEach((play) => excludedIds.add(play.mixId));
        }
        const coListeners = await this.prisma.playHistory.findMany({
            where: {
                mixId: id,
                ...(currentUserId ? { userId: { not: currentUserId } } : {}),
            },
            select: { userId: true },
            orderBy: { playedAt: 'desc' },
            take: 500,
        });
        const coListenerIds = coListeners.map((play) => play.userId);
        const ranked = coListenerIds.length
            ? await this.prisma.playHistory.groupBy({
                by: ['mixId'],
                where: {
                    userId: { in: coListenerIds },
                    mixId: { notIn: Array.from(excludedIds) },
                },
                _count: { userId: true },
                orderBy: { _count: { userId: 'desc' } },
                take: limit,
            })
            : [];
        const orderedIds = ranked.map((row) => row.mixId);
        orderedIds.forEach((mixId) => excludedIds.add(mixId));
        const fill = async (where, skip) => {
            if (orderedIds.length >= limit)
                return;
            const rows = await this.prisma.mix.findMany({
                where: { ...where, id: { notIn: Array.from(skip) } },
                select: { id: true },
                orderBy: { createdAt: 'desc' },
                take: limit - orderedIds.length,
            });
            for (const row of rows) {
                orderedIds.push(row.id);
                excludedIds.add(row.id);
            }
        };
        if (mix.tags.length) {
            await fill({ tags: { hasSome: mix.tags } }, excludedIds);
        }
        await fill({}, excludedIds);
        if (orderedIds.length < limit) {
            await fill({}, new Set([id, ...orderedIds]));
        }
        if (orderedIds.length === 0) {
            return { items: [] };
        }
        const items = await this.prisma.mix.findMany({
            where: { id: { in: orderedIds } },
            ...buildMixInclude(currentUserId),
        });
        const byId = new Map(items.map((item) => [item.id, item]));
        return {
            items: orderedIds
                .map((mixId) => byId.get(mixId))
                .filter((item) => item !== undefined)
                .map(toMixResponse),
        };
    }
    async registerPlay(id, userId) {
        const mix = await this.prisma.mix.findUnique({
            where: { id },
            select: { sourceType: true },
        });
        if (!mix) {
            throw new common_1.NotFoundException('Mix not found');
        }
        if (!mix.sourceType) {
            await this.prisma.mix.update({
                where: { id },
                data: { playsCount: { increment: 1 } },
            });
        }
        if (userId) {
            await this.prisma.playHistory.upsert({
                where: { userId_mixId: { userId, mixId: id } },
                create: { userId, mixId: id },
                update: { playedAt: new Date() },
            });
        }
    }
    async listRecentlyPlayed(userId, query) {
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
    async listFollowingFeed(userId, query) {
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
                orderBy: { createdAt: 'desc' },
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
    async addFavorite(userId, mixId) {
        const mix = await this.prisma.mix.findUnique({ where: { id: mixId } });
        if (!mix) {
            throw new common_1.NotFoundException('Mix not found');
        }
        await this.prisma.favorite.upsert({
            where: { userId_mixId: { userId, mixId } },
            create: { userId, mixId },
            update: {},
        });
    }
    async removeFavorite(userId, mixId) {
        await this.prisma.favorite.deleteMany({ where: { userId, mixId } });
    }
    async listFavorites(userId, query) {
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
};
exports.MixesService = MixesService;
exports.MixesService = MixesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MixesService);
//# sourceMappingURL=mixes.service.js.map